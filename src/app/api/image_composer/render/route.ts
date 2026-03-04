import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { getAssetBuffer } from '@/engine/storageService';
import { getAllThemes } from '@/engine/themeParser';
import { ImageComposition } from '@/engine/models';
import sharp from 'sharp';

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

const RENDER_CACHE = new Map<string, Buffer>();
const CACHE_SIZE_LIMIT = 50;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const compositionId = searchParams.get('id');
    const storyId = searchParams.get('storyId'); 
    
    if (!compositionId || !storyId) {
        return NextResponse.json({ error: 'Missing ID or StoryID' }, { status: 400 });
    }

    // Cache Check
    const cacheKey = request.url;
    if (RENDER_CACHE.has(cacheKey)) {
        return new NextResponse(RENDER_CACHE.get(cacheKey)! as any, { 
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
                storyId: composition.storyId, 
                category: 'settings', 
                itemId: 'settings' 
            });
            themeName = worldConfig?.data?.visualTheme || 'default';
        }

        const allThemes = getAllThemes();
        const finalThemeName = themeName || 'default';
        const themeColors = { ...(allThemes[':root'] || {}), ...(allThemes[finalThemeName] || {}) };
        
        // --- Layer Processing ---
        const layersToRender: sharp.OverlayOptions[] = [];
        const sortedLayers = composition.layers.sort((a, b) => a.zIndex - b.zIndex);

        for (const layer of sortedLayers) {
            // Logic Filtering
            if (layer.groupId) {
                const paramValue = searchParams.get(layer.groupId);
                if (paramValue !== layer.variantValue) continue;
            }

            // Asset Resolution
            let assetUrl = layer.assetId;
            if (assetUrl === 'presets') continue; // Skip invalid legacy data

            if (!assetUrl.includes('/') && !assetUrl.startsWith('http')) {
                 const assetDoc = await db.collection('assets').findOne({ id: assetUrl });
                 assetUrl = assetDoc ? (assetDoc.url as string) : `/uploads/misc/${assetUrl}.png`;
            }

            let buffer = await getAssetBuffer(assetUrl);
            if (!buffer) {
                console.warn(`Layer asset missing: ${assetUrl}`);
                continue;
            }

            // SVG Theme Tinting
            const isSvg = assetUrl.toLowerCase().endsWith('.svg');
            if (isSvg && (layer.enableThemeColor || layer.tintColor)) {
                let svgString = buffer.toString('utf-8');
                
                // Replace CSS vars
                svgString = svgString.replace(/var\((--[^)]+)\)/g, (match, varName) => themeColors[varName] || match);
                
                // Manual Tint
                if (layer.tintColor) {
                    let color = layer.tintColor;
                    if (color.startsWith('var(')) {
                        const varName = color.match(/var\((--[^)]+)\)/)?.[1];
                        if (varName) color = themeColors[varName] || color;
                    }
                    // Simple regex replacement for fills/strokes - acceptable for simple icons
                    svgString = svgString.replace(/fill="[^"]*"/g, `fill="${color}"`);
                    svgString = svgString.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
                }
                buffer = Buffer.from(svgString);
            }

            // Transform Pipeline (Resize/Rotate)
            let pipeline = sharp(buffer);
            
            // We must get metadata to scale correctly
            const meta = await pipeline.metadata();
            
            if (layer.scale !== 1 && meta.width) {
                pipeline.resize(Math.round(meta.width * layer.scale));
            }
            if (layer.rotation !== 0) {
                pipeline.rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
            }
            
            const layerBuffer = await pipeline.toBuffer();
            
            // --- Effects ---

            // 1. Stroke / Outline
            if (layer.effects?.stroke?.enabled) {
                const st = layer.effects.stroke;
                const strokeColor = resolveColor(st.color, themeColors);
                
                try {
                    const strokeBuffer = await createStrokeLayer(layerBuffer, strokeColor, st.width);
                    layersToRender.push({
                        input: strokeBuffer,
                        // Offset by stroke width because the stroke buffer is larger
                        top: Math.round(layer.y - st.width),
                        left: Math.round(layer.x - st.width),
                        blend: 'over',
                    });
                } catch(e) { console.error("Stroke error", e); }
            }
            
            // 2. Glow
            if (layer.effects?.glow?.enabled) {
                const g = layer.effects.glow;
                const glowColor = resolveColor(g.color, themeColors);
                
                try {
                    // We add padding to the glow so it doesn't clip
                    const padding = g.blur * 2; 
                    const glowBuffer = await createShadowLayer(layerBuffer, glowColor, g.blur, padding);
                    layersToRender.push({
                        input: glowBuffer,
                        top: Math.round(layer.y - padding),
                        left: Math.round(layer.x - padding),
                        blend: 'screen'
                    });
                } catch (e) { console.error("Glow error", e); }
            }

            // 3. Drop Shadow
            if (layer.effects?.shadow?.enabled) {
                const s = layer.effects.shadow;
                const shadowColor = resolveColor(s.color, themeColors, '#000000');

                try {
                    const padding = s.blur * 2;
                    const shadowBuffer = await createShadowLayer(layerBuffer, shadowColor, s.blur, padding);
                    layersToRender.push({
                        input: shadowBuffer,
                        top: Math.round(layer.y + s.y - padding),
                        left: Math.round(layer.x + s.x - padding),
                        blend: 'multiply'
                    });
                } catch (e) { console.error("Shadow error", e); }
            }

            // 4. Main Layer
            layersToRender.push({
                input: layerBuffer,
                top: Math.round(layer.y),
                left: Math.round(layer.x),
                blend: (layer.blendMode as any) || 'over' 
            });
        }

        // --- Background Handling ---
        if (composition.backgroundColor) {
            const resolvedBg = resolveColor(composition.backgroundColor, themeColors, '#000000');
            
            // Create a background layer
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

        // --- Final Composite ---
        const base = sharp({
            create: {
                width: composition.width,
                height: composition.height,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
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

        return new NextResponse(outputBuffer as any, {
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

// Helper to resolve CSS variables
function resolveColor(input: string, themeColors: Record<string, string>, fallback = '#ffffff') {
    if (input.startsWith('var(')) {
        const key = input.match(/--[\w-]+/)?.[0] || '';
        return themeColors[key] || fallback;
    }
    return input;
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

    // 1. Create solid silhouette
    const solidColor = await sharp({
        create: {
            width: w,
            height: h,
            channels: 4,
            background: color
        }
    }).png().toBuffer();

    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }]) // cut out shape
        .png()
        .toBuffer();

    // 2. Extend canvas to prevent blur clipping
    // 3. Blur
    return sharp(silhouette)
        .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .blur(Math.max(0.3, blurRadius / 2)) // Sigma approximation
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

    // Solid silhouette
    const solidColor = await sharp({
        create: { width: w, height: h, channels: 4, background: color }
    }).png().toBuffer();

    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // Create larger canvas
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

    // Circular offsets for stroke effect
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