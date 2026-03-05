// C:\Chronicle Hub\chronicle-hub\src\app\api\image_composer\render\route.ts

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { getAssetBuffer } from '@/engine/storageService';
import { getAllThemes } from '@/engine/themeParser';
import { ImageComposition } from '@/engine/models';
import sharp from 'sharp';
import type { Blend } from 'sharp';
import { extractSvgDimensions } from '../utils/svgDimensions';

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
 */
export function clearCacheForStory(storyId: string): number {
    if (!storyId || typeof storyId !== 'string') return 0;

    const storyIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!storyIdRegex.test(storyId)) {
        console.warn(`[Cache] Invalid storyId format: ${storyId}`);
        return 0;
    }

    let cleared = 0;
    const allKeys = Array.from(RENDER_CACHE.keys());

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
            const worldDoc = await db.collection('worlds').findOne({ worldId: storyId });
            themeName = worldDoc?.settings?.visualTheme || 'default';
        }

        const allThemes = getAllThemes();
        const finalThemeName = themeName || 'default';
        
        let matchedThemeKey = ':root';
        if (finalThemeName !== 'default') {
            const possibleKeys =[
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
            if (matchedThemeKey === ':root') {
                const found = Object.keys(allThemes).find(k => k.includes(finalThemeName));
                if (found) matchedThemeKey = found;
            }
        }
        const themeColors = { ...(allThemes[':root'] || {}), ...(allThemes[matchedThemeKey] || {}) };
        
        // --- Layer Processing ---
        const layersToRender: sharp.OverlayOptions[] =[];
        const sortedLayers = composition.layers.sort((a, b) => a.zIndex - b.zIndex);

        // Helper: Robustly add layer by cropping it to the canvas viewport using integer math
        // This prevents sharp from crashing with the "must have same dimensions or smaller" error
        const safelyAddLayer = async (buffer: Buffer, x: number, y: number, blend: string) => {
            const meta = await sharp(buffer).metadata();
            const w = meta.width || 0;
            const h = meta.height || 0;

            const targetX = Math.round(x);
            const targetY = Math.round(y);

            // Calculate the intersection rectangle between the Layer and the Canvas
            const visibleX = Math.max(0, targetX);
            const visibleY = Math.max(0, targetY);
            const visibleRight = Math.min(composition.width, targetX + w);
            const visibleBottom = Math.min(composition.height, targetY + h);

            const visibleW = visibleRight - visibleX;
            const visibleH = visibleBottom - visibleY;

            // If the layer is completely off-screen, skip it
            if (visibleW <= 0 || visibleH <= 0) return;

            // Determine if we need to crop
            const needsCrop = visibleW < w || visibleH < h || targetX < 0 || targetY < 0;

            if (needsCrop) {
                const cropLeft = visibleX - targetX;
                const cropTop = visibleY - targetY;

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
            
            // --- EditorHidden & Logic Group Filtering ---
            if (layer.editorHidden) {
                const groupId = layer.groupId;
                const hasGroup = groupId !== undefined && groupId !== null && groupId !== '';
                if (hasGroup) {
                    const groupMatches = searchParams.get(groupId) === layer.variantValue;
                    if (!groupMatches) continue;
                } else {
                    continue;
                }
            }

            const logicGroupId = layer.groupId;
            if (logicGroupId && logicGroupId !== '') {
                const paramValue = searchParams.get(logicGroupId);
                if (paramValue !== layer.variantValue) continue;
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

            const isSvg = assetUrl.toLowerCase().endsWith('.svg');
            
            // Re-bind SVG CSS Variables to mapped theme colors
            if (isSvg) {
                if (layer.enableThemeColor) {
                    let svgString = buffer.toString('utf-8');
                    svgString = svgString.replace(/var\((--[^)]+)\)/g, (match) => resolveColor(match, themeColors));
                    buffer = Buffer.from(svgString);
                }
            }

            // --- STEP 1: RESIZE ---
            let img: sharp.Sharp;
            let floatScaledW = 0, floatScaledH = 0;

            if (isSvg) {
                const svgDimensions = extractSvgDimensions(buffer);
                
                let baseW = svgDimensions.width || 150;
                let baseH = svgDimensions.height || 150;

                // Emulate browser "replaced element" fallback size for game presets 
                // so the backend math perfectly aligns with the frontend Canvas math
                if (assetUrl.includes('presets/') || assetUrl.includes('game-icons')) {
                    baseW = 150;
                    baseH = 150;
                }

                // Store float dimensions for accurate center calculation
                floatScaledW = baseW * layer.scale;
                floatScaledH = baseH * layer.scale;

                const targetWidth = Math.max(1, Math.round(floatScaledW));
                const targetHeight = Math.max(1, Math.round(floatScaledH));

                // Scale up the density for crisp edges based on the target scale
                const scaleRatio = targetWidth / baseW;
                const density = Math.min(2400, 72 * Math.max(scaleRatio, 1 / scaleRatio));

                img = sharp(buffer, { density }).resize(targetWidth, targetHeight, {
                    fit: 'fill',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                });
            } else {
                img = sharp(buffer);
                const originalMeta = await img.metadata();
                const origW = originalMeta.width || 100;
                const origH = originalMeta.height || 100;

                floatScaledW = origW * layer.scale;
                floatScaledH = origH * layer.scale;

                const scaledW = Math.max(1, Math.round(floatScaledW));
                const scaledH = Math.max(1, Math.round(floatScaledH));

                if (layer.scale !== 1) {
                    img = img.resize(scaledW, scaledH, { fit: 'fill' });
                }
            }

            const scaledBuffer = await img.toBuffer();
            const scaledMeta = await sharp(scaledBuffer).metadata();
            
            const scaledW = scaledMeta.width || 0;
            const scaledH = scaledMeta.height || 0;

            let finalImageBuffer = scaledBuffer;

            // Proper SVG Tinting utilizing dest-in masking pass (matches frontend source-in behavior)
            if (isSvg && layer.tintColor) {
                const resolvedTint = resolveColor(layer.tintColor, themeColors, '#000000');
                finalImageBuffer = await sharp({
                    create: { width: scaledW || 1, height: scaledH || 1, channels: 4, background: resolvedTint }
                })
                .composite([{ input: scaledBuffer, blend: 'dest-in' }])
                .png()
                .toBuffer();
            }
            
            // --- STEP 2: ROTATE & RE-CENTER ---
            // 1. Calculate visual center in Canvas Space
            const visualCenterX = layer.x + (floatScaledW / 2);
            const visualCenterY = layer.y + (floatScaledH / 2);

            // 2. Rotate (expands bounding box)
            const rotatedBuffer = await sharp(finalImageBuffer)
                .rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .toBuffer();

            const rotatedMeta = await sharp(rotatedBuffer).metadata();
            const rotatedW = rotatedMeta.width || 0;
            const rotatedH = rotatedMeta.height || 0;

            // 3. Calculate New Top-Left to keep the center fixed
            const finalX = visualCenterX - (rotatedW / 2);
            const finalY = visualCenterY - (rotatedH / 2);

            // --- STEP 3: EFFECTS & RENDER ---
            
            // 1. Drop Shadow (farthest back, blended normally matching CSS drop-shadow)
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
                        'over'
                    );
                } catch (e) { console.error("Shadow error", e); }
            }
                // 3. Stroke
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
                        'over'
                    );
                } catch (e) { console.error("Glow error", e); }
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

        // --- Validate layer positions ---
        for (let i = 0; i < layersToRender.length; i++) {
            const layer = layersToRender[i];
            if (typeof layer.top !== 'number' || isNaN(layer.top)) layer.top = 0;
            if (typeof layer.left !== 'number' || isNaN(layer.left)) layer.left = 0;
        }

        // --- Final Composite ---
        let baseBg: sharp.Color = { r: 0, g: 0, b: 0, alpha: 0 };
        if (composition.backgroundColor) {
            baseBg = resolveColor(composition.backgroundColor, themeColors, '#000000');
        }

        const base = sharp({
            create: {
                width: composition.width,
                height: composition.height,
                channels: 4,
                background: baseBg
            }
        });

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
    
    // Ensure Sharp compatibility. Strip URLs or gradients and extract just the base color.
    // e.g., "#0b0f0b url(...)" -> "#0b0f0b"
    const hexMatch = current.match(/(#[0-9a-fA-F]{3,8})/i);
    if (hexMatch) return hexMatch[1];
    
    const rgbMatch = current.match(/(rgba?\([^)]+\))/i);
    if (rgbMatch) return rgbMatch[1];

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

    const offsets =[
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