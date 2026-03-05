import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { getAssetBuffer } from '@/engine/storageService';
import { getAllThemes } from '@/engine/themeParser';
import { ImageComposition } from '@/engine/models';
import sharp from 'sharp';
import type { Blend } from 'sharp';
import { extractSvgDimensions, calculateSvgTargetDimensions } from '../utils/svgDimensions';

// Helper: Get dimensions safely
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
        const metadata = await sharp(buffer).metadata();
        return { width: metadata.width || 0, height: metadata.height || 0 };
    } catch (e) {
        console.error('Failed to get image dimensions:', e);
        return { width: 0, height: 0 };
    }
}

export const RENDER_CACHE = new Map<string, Buffer>();
const CACHE_SIZE_LIMIT = 50;
const STORY_ID_PREFIX = 'storyId=';

/**
 * Clears all cache entries associated with a specific story ID.
 *
 * This function iterates through the RENDER_CACHE Map and removes any entries
 * whose cache key contains the story ID. Cache keys are full URLs that include
 * query parameters like `storyId=abc123`.
 *
 * @param storyId - The story ID to clear cache entries for. Must be a non-empty
 *                  string containing only alphanumeric characters, hyphens, and underscores.
 * @returns The number of cache entries that were cleared. Returns 0 if the
 *          storyId is invalid or no matching entries were found.
 *
 * @example
 * // Clear cache for story 'my-story-123'
 * const clearedCount = clearCacheForStory('my-story-123');
 * console.log(`Cleared ${clearedCount} cache entries`);
 */
export function clearCacheForStory(storyId: string): number {
    // Validate input
    if (!storyId || typeof storyId !== 'string') return 0;

    // Validate storyId format: alphanumeric, hyphens, underscores only
    const storyIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!storyIdRegex.test(storyId)) {
        console.warn(`[Cache] Invalid storyId format: ${storyId}`);
        return 0;
    }

    let cleared = 0;

    // Create a snapshot of cache keys to avoid concurrent modification issues
    const allKeys = Array.from(RENDER_CACHE.keys());

    // Use regex to match storyId as a complete query parameter (not substring)
    // Matches: [?&]storyId=value(?:&|$) where value is our storyId
    // Escape regex special characters in storyId to prevent injection
    const escapedStoryId = storyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const paramPattern = new RegExp(`[?&]${STORY_ID_PREFIX}${escapedStoryId}(?:&|$)`);

    for (const key of allKeys) {
        if (paramPattern.test(key)) {
            RENDER_CACHE.delete(key);
            cleared++;
        }
    }

    console.log(`[Cache] Cleared ${cleared} entries for story ${storyId}`);
    return cleared;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const compositionId = searchParams.get('id');
    const storyId = searchParams.get('storyId'); 
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!compositionId || !storyId) {
        return NextResponse.json({ error: 'Missing ID or StoryID' }, { status: 400 });
    }

    // Cache Key Logic
    const urlObj = new URL(request.url);
    urlObj.searchParams.delete('refresh');
    const cacheKey = urlObj.toString(); 

    if (!forceRefresh && RENDER_CACHE.has(cacheKey)) {
        return new NextResponse(RENDER_CACHE.get(cacheKey)! as BodyInit, {
            headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=3600' }
        });
    }

    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

        const composition = await db.collection<ImageComposition>('compositions').findOne({ id: compositionId, storyId });
        if (!composition) {
            return NextResponse.json({ error: 'Composition not found' }, { status: 404 });
        }

        // --- Theme Resolution ---
        let themeName = searchParams.get('theme');
        if (!themeName) {
            const worldConfig = await db.collection('config').findOne({ 
                storyId: storyId,
                category: 'settings', 
                itemId: 'settings' 
            });
            themeName = worldConfig?.data?.visualTheme || 'default';
        }

        const allThemes = getAllThemes();
        const finalThemeName = themeName || 'default';
        
        // Find exact theme key in allThemes (handles properties like [data-theme='name'])
        let matchedThemeKey = ':root';
        if (finalThemeName !== 'default') {
            const possibleKeys = [
                finalThemeName,
                `[data-theme='${finalThemeName}']`,
                `[data-global-theme='${finalThemeName}']`
            ];
            for (const key of possibleKeys) {
                if (allThemes[key]) {
                    matchedThemeKey = key;
                    break;
                }
            }
            // Fallback partial match if not found perfectly
            if (matchedThemeKey === ':root') {
                const found = Object.keys(allThemes).find(k => k.includes(finalThemeName));
                if (found) matchedThemeKey = found;
            }
        }
        const themeColors = { ...(allThemes[':root'] || {}), ...(allThemes[matchedThemeKey] || {}) };
        // --- Layer Processing ---
        const layersToRender: sharp.OverlayOptions[] = [];
        const sortedLayers = composition.layers.sort((a, b) => a.zIndex - b.zIndex);

        // Helper: Robustly add layer by cropping it to the canvas viewport using integer math
        const safelyAddLayer = async (buffer: Buffer, x: number, y: number, blend: string) => {
            const meta = await sharp(buffer).metadata();
            const w = meta.width || 0;
            const h = meta.height || 0;
            console.log(`[safelyAddLayer] buffer ${w}x${h}, x=${x}, y=${y}, canvas ${composition.width}x${composition.height}`);

            // 1. Round positions to integers immediately to align with pixel grid
            const targetX = Math.round(x);
            const targetY = Math.round(y);

            // 2. Calculate the intersection rectangle between the Layer and the Canvas
            // Canvas is (0, 0, composition.width, composition.height)
            const visibleX = Math.max(0, targetX);
            const visibleY = Math.max(0, targetY);
            const visibleRight = Math.min(composition.width, targetX + w);
            const visibleBottom = Math.min(composition.height, targetY + h);

            const visibleW = visibleRight - visibleX;
            const visibleH = visibleBottom - visibleY;

            // If the layer is completely off-screen, skip it
            if (visibleW <= 0 || visibleH <= 0) return;

            // 3. Determine if we need to crop
            // Sharp throws an error if we try to composite an image larger than the canvas,
            // or if it extends partially off-screen. We must crop to the visible region.
            const needsCrop = visibleW < w || visibleH < h || targetX < 0 || targetY < 0;
            console.log(`[safelyAddLayer] needsCrop=${needsCrop}, visibleW=${visibleW}, visibleH=${visibleH}, targetX=${targetX}, targetY=${targetY}`);

            if (needsCrop) {
                // Calculate the offsets into the source image
                const cropLeft = visibleX - targetX;
                const cropTop = visibleY - targetY;

                // Clamp just to be safe (though math above should guarantee validity)
                const finalCropLeft = Math.max(0, Math.min(cropLeft, w - visibleW));
                const finalCropTop = Math.max(0, Math.min(cropTop, h - visibleH));

                try {
                    const cropped = await sharp(buffer)
                        .extract({
                            left: finalCropLeft,
                            top: finalCropTop,
                            width: visibleW,
                            height: visibleH
                        })
                        .toBuffer();
                    
                    console.log(`[safelyAddLayer] pushing cropped layer ${visibleW}x${visibleH} at (${visibleX},${visibleY})`);
                    layersToRender.push({
                        input: cropped,
                        top: visibleY,
                        left: visibleX,
                        blend: blend as Blend
                    });
                } catch (e) { 
                    console.error(`Crop failed for layer at ${x},${y} (size ${w}x${h})`, e); 
                }
            } else {
                // Layer fits fully inside the canvas
                console.log(`[safelyAddLayer] pushing full layer ${w}x${h} at (${targetX},${targetY})`);
                layersToRender.push({
                    input: buffer,
                    top: targetY,
                    left: targetX,
                    blend: blend as Blend
                });
            }
        };

        let layerIndex = 0;
        for (const layer of sortedLayers) {
            console.log(`[Layer ${layerIndex}] x=${layer.x}, y=${layer.y}, scale=${layer.scale}, rotation=${layer.rotation}, asset=${layer.assetId}`);
            // --- EditorHidden Filtering ---
            // Skip editor-hidden layers unless part of active logic group
            if (layer.editorHidden) {
                const groupId = layer.groupId;
                const hasGroup = groupId !== undefined && groupId !== null && groupId !== '';

                if (hasGroup) {
                    // groupId is now guaranteed to be a non-empty string
                    const groupMatches = searchParams.get(groupId) === layer.variantValue;
                    if (groupMatches) {
                        console.log(`[Layer ${layerIndex}] Rendering editor-hidden layer due to active group: ${groupId}=${layer.variantValue}`);
                    } else {
                        console.log(`[Layer ${layerIndex}] Skipping editor-hidden layer: ${layer.name || layer.assetId}`);
                        continue;
                    }
                } else {
                    console.log(`[Layer ${layerIndex}] Skipping editor-hidden layer: ${layer.name || layer.assetId}`);
                    continue;
                }
            }

            // --- Logic Group Filtering ---
            const logicGroupId = layer.groupId;
            if (logicGroupId && logicGroupId !== '') {
                const paramValue = searchParams.get(logicGroupId);
                if (paramValue !== layer.variantValue) {
                    console.log(`[Layer ${layerIndex}] Skipping due to group mismatch: ${logicGroupId}=${paramValue} vs ${layer.variantValue}`);
                    continue;
                }
            }

            // Asset Resolution
            let assetUrl = layer.assetId;
            if (assetUrl === 'presets') continue; 

            if (!assetUrl.includes('/') && !assetUrl.startsWith('http')) {
                 const assetDoc = await db.collection('assets').findOne({ id: assetUrl });
                 assetUrl = assetDoc ? (assetDoc.url as string) : `/uploads/misc/${assetUrl}.png`;
            }

            let buffer = await getAssetBuffer(assetUrl);
            if (!buffer) {
                console.warn(`Layer asset missing: ${assetUrl}`);
                continue;
            }

            // SVG Theme Tinting & DENSITY FIX
            const isSvg = assetUrl.toLowerCase().endsWith('.svg');
            
            if (isSvg) {
                if (layer.enableThemeColor || layer.tintColor) {
                    let svgString = buffer.toString('utf-8');
                    // Fully resolve all CSS variables using the robust helper
                    svgString = svgString.replace(/var\((--[^)]+)\)/g, (match) => resolveColor(match, themeColors));
                    
                    if (layer.tintColor) {
                        const resolvedTint = resolveColor(layer.tintColor, themeColors, '#000000');
                        svgString = svgString.replace(/fill="[^"]*"/g, `fill="${resolvedTint}"`);
                        svgString = svgString.replace(/stroke="[^"]*"/g, `stroke="${resolvedTint}"`);
                    }
                    buffer = Buffer.from(svgString);
                }
            }

            // --- STEP 1: RESIZE ---
            let img: sharp.Sharp;
            
            if (isSvg) {
                const svgDimensions = extractSvgDimensions(buffer);
                const targetDims = calculateSvgTargetDimensions(
                    svgDimensions,
                    composition.width,
                    composition.height,
                    layer.scale
                );

                const targetWidth = targetDims.targetWidth;
                const targetHeight = targetDims.targetHeight;

                // Scale up the density for crisp edges based on the target scale
                const scaleRatio = targetWidth / (svgDimensions.width || 100);
                const density = Math.min(2400, Math.max(72, 72 * scaleRatio));

                img = sharp(buffer, { density }).resize(targetWidth, targetHeight, {
                    fit: 'fill',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                });
            } else {
                img = sharp(buffer);
                const originalMeta = await img.metadata();
                const origW = originalMeta.width || 100;
                const origH = originalMeta.height || 100;
                
                const scaledW = Math.max(1, Math.round(origW * layer.scale));
                const scaledH = Math.max(1, Math.round(origH * layer.scale));

                if (layer.scale !== 1) {
                    img = img.resize(scaledW, scaledH, { fit: 'fill' });
                }
            }

            const scaledBuffer = await img.toBuffer();
            const scaledMeta = await sharp(scaledBuffer).metadata();
            
            // Capture final dimensions for the rotation/centering math
            const scaledW = scaledMeta.width || 0;
            const scaledH = scaledMeta.height || 0;

            console.log(`[Layer ${layerIndex}] scaled output is ${scaledW}x${scaledH}`);
            
            // --- STEP 2: ROTATE & RE-CENTER ---
            // Debug: Log original layer coordinates
            console.log(`[Coord Debug] Layer ${layerIndex}: original position (${layer.x}, ${layer.y}), scale=${layer.scale}, rotation=${layer.rotation}`);

            // 1. Calculate visual center in Canvas Space (where the user put the center of the image)
            const visualCenterX = layer.x + (scaledW / 2);
            const visualCenterY = layer.y + (scaledH / 2);
            console.log(`[Coord Debug] Layer ${layerIndex}: visual center (${visualCenterX}, ${visualCenterY}), scaled dims ${scaledW}x${scaledH}`);

            // 2. Rotate (expands bounding box)
            const rotatedBuffer = await sharp(scaledBuffer)
                .rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();

            const rotatedMeta = await sharp(rotatedBuffer).metadata();
            const rotatedW = rotatedMeta.width || 0;
            const rotatedH = rotatedMeta.height || 0;

            // 3. Calculate New Top-Left to keep the center fixed
            const finalX = visualCenterX - (rotatedW / 2);
            const finalY = visualCenterY - (rotatedH / 2);

            // Debug log for rotation calculations
            console.log(`[Coord Debug] Layer ${layerIndex}: rotated ${rotatedW}x${rotatedH} (expanded from ${scaledW}x${scaledH})`);
            console.log(`[Coord Debug] Layer ${layerIndex}: final position (${finalX}, ${finalY}) to keep center at (${visualCenterX}, ${visualCenterY})`);
            console.log(`[Layer ${layerIndex}] rotated ${rotatedW}x${rotatedH}, finalX=${finalX}, finalY=${finalY}`);

            // --- STEP 3: EFFECTS & RENDER ---
            
            // 1. Stroke
            if (layer.effects?.stroke?.enabled) {
                const st = layer.effects.stroke;
                const strokeColor = resolveColor(st.color, themeColors);
                
                try {
                    const strokeBuffer = await createStrokeLayer(rotatedBuffer, strokeColor, st.width);
                    await safelyAddLayer(
                        strokeBuffer, 
                        finalX - st.width, 
                        finalY - st.width, 
                        'over'
                    );
                } catch(e) { console.error("Stroke error", e); }
            }
            
            // 2. Glow
            if (layer.effects?.glow?.enabled) {
                const g = layer.effects.glow;
                const glowColor = resolveColor(g.color, themeColors);
                
                try {
                    const padding = Math.max(1, Math.round(g.blur * 2)); 
                    const glowBuffer = await createShadowLayer(rotatedBuffer, glowColor, g.blur, padding);
                    await safelyAddLayer(
                        glowBuffer,
                        finalX - padding,
                        finalY - padding,
                        'screen'
                    );
                } catch (e) { console.error("Glow error", e); }
            }

            // 3. Drop Shadow
            if (layer.effects?.shadow?.enabled) {
                const s = layer.effects.shadow;
                const shadowColor = resolveColor(s.color, themeColors, '#000000');

                try {
                    const padding = Math.max(1, Math.round(s.blur * 2));
                    const shadowBuffer = await createShadowLayer(rotatedBuffer, shadowColor, s.blur, padding);
                    await safelyAddLayer(
                        shadowBuffer,
                        finalX + s.x - padding,
                        finalY + s.y - padding,
                        'multiply'
                    );
                } catch (e) { console.error("Shadow error", e); }
            }

            // 4. Main Layer
            await safelyAddLayer(
                rotatedBuffer,
                finalX,
                finalY,
                (layer.blendMode as Blend) || 'over'
            );
            layerIndex++;
        }

        // --- Background ---
        if (composition.backgroundColor) {
            const resolvedBg = resolveColor(composition.backgroundColor, themeColors, '#000000');
            const bgBuffer = await sharp({
                create: {
                    width: composition.width,
                    height: composition.height,
                    channels: 4,
                    background: resolvedBg
                }
            }).png().toBuffer();
            layersToRender.unshift({ input: bgBuffer, top: 0, left: 0, blend: 'dest-over' });
        }

        // --- Resize oversized layers ---
        // Sharp requires all composite images to be same dimensions or smaller than base canvas
        console.log('Checking for oversized layers...');
        let resizedCount = 0;
        for (let i = 0; i < layersToRender.length; i++) {
            const layer = layersToRender[i];
            if (!Buffer.isBuffer(layer.input)) continue;

            try {
                const dims = await getImageDimensions(layer.input);
                if (dims.width > composition.width || dims.height > composition.height) {
                    console.log(`  Layer ${i} is oversized (${dims.width}x${dims.height} vs canvas ${composition.width}x${composition.height}), resizing...`);
                    // Calculate scale to fit within canvas while maintaining aspect ratio
                    const scale = Math.min(
                        composition.width / dims.width,
                        composition.height / dims.height
                    );
                    const newWidth = Math.round(dims.width * scale);
                    const newHeight = Math.round(dims.height * scale);
                    // Resize the image
                    const resizedBuffer = await sharp(layer.input as Buffer)
                        .resize(newWidth, newHeight, { fit: 'inside' })
                        .toBuffer();
                    // Update layer with resized image
                    layer.input = resizedBuffer;
                    resizedCount++;
                }
            } catch (e) {
                console.error(`  Layer ${i}: Failed to check/resize: ${e}`);
            }
        }
        if (resizedCount > 0) {
            console.log(`Resized ${resizedCount} oversized layer(s)`);
        }

        // --- Validate layer positions ---
        for (let i = 0; i < layersToRender.length; i++) {
            const layer = layersToRender[i];
            if (typeof layer.top !== 'number' || isNaN(layer.top)) {
                console.warn(`Layer ${i}: top is ${layer.top}, defaulting to 0`);
                layer.top = 0;
            }
            if (typeof layer.left !== 'number' || isNaN(layer.left)) {
                console.warn(`Layer ${i}: left is ${layer.left}, defaulting to 0`);
                layer.left = 0;
            }
        }

        // --- Final Composite ---
        const base = sharp({
            create: {
                width: composition.width,
                height: composition.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        });

        console.log(`[Composite] Starting composite with ${layersToRender.length} layers`);
        for (let i = 0; i < layersToRender.length; i++) {
            const layer = layersToRender[i];
            try {
                if (Buffer.isBuffer(layer.input)) {
                    const meta = await sharp(layer.input as Buffer).metadata();
                    console.log(`[Composite] Layer ${i}: ${meta.width}x${meta.height} at (${layer.left},${layer.top}) blend=${layer.blend}`);
                } else {
                    console.log(`[Composite] Layer ${i}: non-buffer input at (${layer.left},${layer.top}) blend=${layer.blend}`);
                }
            } catch (e) {
                void e;
                console.log(`[Composite] Layer ${i}: unknown size at (${layer.left},${layer.top}) blend=${layer.blend}`);
            }
        }
        const outputBuffer = await base
            .composite(layersToRender)
            .webp({ quality: 85 })
            .toBuffer();

        // Update Cache
        if (RENDER_CACHE.size >= CACHE_SIZE_LIMIT) {
            const firstKey = RENDER_CACHE.keys().next().value;
            if (firstKey) RENDER_CACHE.delete(firstKey);
        }
        RENDER_CACHE.set(cacheKey, outputBuffer);

        return new NextResponse(outputBuffer as BodyInit, {
            headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (error) {
        console.error("Composer Error:", error);
        return NextResponse.json({ error: 'Rendering failed' }, { status: 500 });
    }
}

function resolveColor(input: string, themeColors: Record<string, string>, fallback = '#ffffff') {
    if (!input) return fallback;
    let current = input;
    let depth = 0;
    
    // Deep resolve nested vars
    while (current.includes('var(') && depth < 5) {
        const match = current.match(/var\((--[^)]+)\)/);
        if (match && match[1]) {
            current = current.replace(match[0], themeColors[match[1]] || fallback);
        } else {
            break; 
        }
        depth++;
    }
    
    // Ensure Sharp compatibility. If it still contains a var, or isn't a color format sharp likes, fallback.
    if (current.includes('var(') || (!current.startsWith('#') && !current.startsWith('rgb') && !current.match(/^[a-zA-Z]+$/))) {
        return fallback;
    }
    return current;
}

async function createShadowLayer(
    inputBuffer: Buffer,
    color: string,
    blurRadius: number,
    padding: number
): Promise<Buffer> {
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width || 100;
    const h = meta.height || 100;

    // Make sure color is valid, otherwise default to black to prevent Sharp crashes
    let validColor = color;
    if (!validColor.startsWith('#') && !validColor.startsWith('rgb')) validColor = '#000000';

    const solidColor = await sharp({
        create: { width: w, height: h, channels: 4, background: validColor }
    }).png().toBuffer();

    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

    return sharp(silhouette)
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .blur(Math.max(0.3, blurRadius / 2)) 
        .toBuffer();
}

async function createStrokeLayer(
    inputBuffer: Buffer,
    color: string,
    width: number
): Promise<Buffer> {
    const meta = await sharp(inputBuffer).metadata();
    const w = meta.width || 100;
    const h = meta.height || 100;

    const solidColor = await sharp({
        create: { width: w, height: h, channels: 4, background: color }
    }).png().toBuffer();

    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

    const strokeWidth = w + width * 2;
    const strokeHeight = h + width * 2;

    const strokeCanvas = sharp({
        create: {
            width: strokeWidth,
            height: strokeHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const offsets = [
        { top: 0, left: width }, { top: width * 2, left: width },
        { top: width, left: 0 }, { top: width, left: width * 2 },
        { top: width/2, left: width/2 }, { top: width*1.5, left: width*1.5 },
        { top: width/2, left: width*1.5 }, { top: width*1.5, left: width/2 }
    ];

    const composites = offsets.map(o => ({
        input: silhouette,
        top: Math.round(o.top),
        left: Math.round(o.left),
        blend: 'over' as const
    }));

    return strokeCanvas
        .composite(composites)
        .png()
        .toBuffer();
}