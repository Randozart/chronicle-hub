import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { getAssetBuffer } from '@/engine/storageService';
import { getAllThemes } from '@/engine/themeParser';
import { ImageComposition, CompositionLayer } from '@/engine/models';
import sharp from 'sharp';
const RENDER_CACHE = new Map<string, Buffer>();
const CACHE_SIZE_LIMIT = 50;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const compositionId = searchParams.get('id');
    const storyId = searchParams.get('storyId'); 
    
    if (!compositionId || !storyId) {
        return NextResponse.json({ error: 'Missing ID or StoryID' }, { status: 400 });
    }

    const cacheKey = request.url;
    if (RENDER_CACHE.has(cacheKey)) {
        const buffer = RENDER_CACHE.get(cacheKey)!;
        return new NextResponse(buffer as any, { 
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
        // Ensure themeName is treated as a string. Fallback to 'default' if logic fails to prevent casting 'null'
        const finalThemeName = themeName || 'default';
        const themeColors = { ...(allThemes[':root'] || {}), ...(allThemes[finalThemeName] || {}) };
        const layersToRender: sharp.OverlayOptions[] = [];
        const sortedLayers = composition.layers.sort((a, b) => a.zIndex - b.zIndex);

        for (const layer of sortedLayers) {
            if (layer.groupId) {
                const paramValue = searchParams.get(layer.groupId);
                if (paramValue !== layer.variantValue) {
                    continue;
                }
            }
            let assetUrl = layer.assetId;
            if (!assetUrl.includes('/') && !assetUrl.startsWith('http')) {
                 const assetDoc = await db.collection('assets').findOne({ id: assetUrl }); 
                 if (!assetDoc) assetUrl = `/uploads/misc/${assetUrl}.png`; 
                 else assetUrl = assetDoc.url as string;
            }

            let buffer = await getAssetBuffer(assetUrl);
            if (!buffer) {
                console.warn(`Layer asset missing: ${assetUrl}`);
                continue;
            }
            const isSvg = assetUrl.toLowerCase().endsWith('.svg');
            
            if (isSvg && (layer.enableThemeColor || layer.tintColor)) {
                let svgString = buffer.toString('utf-8');
                svgString = svgString.replace(/var\((--[^)]+)\)/g, (match, varName) => {
                    return themeColors[varName] || match;
                });
                if (layer.tintColor) {
                    let color = layer.tintColor;
                    if (color.startsWith('var(')) {
                        const varName = color.match(/var\((--[^)]+)\)/)?.[1];
                        if (varName) color = themeColors[varName] || color;
                    }
                    svgString = svgString.replace(/fill="[^"]*"/g, `fill="${color}"`);
                    svgString = svgString.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
                }

                buffer = Buffer.from(svgString);
            }
            let pipeline = sharp(buffer);
            if (layer.scale !== 1) {
                const meta = await pipeline.metadata();
                if (meta.width) {
                    pipeline.resize(Math.round(meta.width * layer.scale));
                }
            }
            if (layer.rotation !== 0) {
                pipeline.rotate(layer.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
            }
            
            const layerBuffer = await pipeline.toBuffer();
            
            if (layer.effects?.stroke?.enabled) {
                const st = layer.effects.stroke;
                const strokeColor = st.color.startsWith('var(') 
                    ? (themeColors[st.color.match(/--[\w-]+/)?.[0] || ''] || '#ffffff') 
                    : st.color;
                
                try {
                    const strokeBuffer = await createStrokeLayer(layerBuffer, strokeColor, st.width);
                    // Stroke is larger than original, so offset position
                    layersToRender.push({
                        input: strokeBuffer,
                        top: Math.round(layer.y - st.width),
                        left: Math.round(layer.x - st.width),
                        blend: 'over',
                    });
                } catch(e) { console.error("Stroke error", e); }
            }
            
            // Glow
            if (layer.effects?.glow?.enabled) {
                const g = layer.effects.glow;
                const glowColor = g.color.startsWith('var(') 
                    ? (themeColors[g.color.match(/--[\w-]+/)?.[0] || ''] || '#ffffff') 
                    : g.color;
                
                try {
                    const glowBuffer = await createShadowLayer(layerBuffer, glowColor, g.blur);
                    layersToRender.push({
                        input: glowBuffer,
                        top: Math.round(layer.y), // No offset for glow
                        left: Math.round(layer.x),
                        blend: 'screen'
                    });
                } catch (e) { console.error("Glow error", e); }
            }

            // Drop Shadow
            if (layer.effects?.shadow?.enabled) {
                const s = layer.effects.shadow;
                const shadowColor = s.color.startsWith('var(') 
                    ? (themeColors[s.color.match(/--[\w-]+/)?.[0] || ''] || '#000000') 
                    : s.color;

                try {
                    const shadowBuffer = await createShadowLayer(layerBuffer, shadowColor, s.blur);
                    layersToRender.push({
                        input: shadowBuffer,
                        top: Math.round(layer.y + s.y),
                        left: Math.round(layer.x + s.x),
                        blend: 'multiply' // Shadows darken
                    });
                } catch (e) { console.error("Shadow error", e); }
            }

            // Main Layer
            layersToRender.push({
                input: layerBuffer,
                top: Math.round(layer.y),
                left: Math.round(layer.x),
                blend: (layer.blendMode as any) || 'over' 
            });
        }

        if (composition.backgroundColor) {
            const bgKey = composition.backgroundColor.match(/--[\w-]+/)?.[0] || '';
            const resolvedBg = composition.backgroundColor.startsWith('var(') 
                ? (themeColors[bgKey] || '#000000') 
                : composition.backgroundColor;

            try {
                const bgBuffer = await sharp({
                    create: {
                        width: composition.width,
                        height: composition.height,
                        channels: 4,
                        background: resolvedBg
                    }
                }).png().toBuffer();

                layersToRender.unshift({ input: bgBuffer, blend: 'dest-over' });
            } catch (e) {
                console.warn("Invalid background color:", resolvedBg);
            }
        }

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

async function createShadowLayer(
    inputBuffer: Buffer, 
    color: string, 
    blurRadius: number
): Promise<Buffer> {
    // Get dimensions
    const meta = await sharp(inputBuffer).metadata();
    
    // Create a solid color canvas of the same size
    const solidColor = await sharp({
        create: {
            width: meta.width || 100,
            height: meta.height || 100,
            channels: 4,
            background: color
        }
    })
    .png()
    .toBuffer();

    // Composite the solid color In to the input image
    // This keeps the input's alpha channel but replaces pixels with the solid color
    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // Apply Blur
    // Sigma calculation: Sharp's blur is sigma, CSS is radius. Approx sigma = radius / 2
    const sigma = Math.max(0.3, blurRadius / 2);
    
    return sharp(silhouette).blur(sigma).toBuffer();
}

async function createStrokeLayer(
    inputBuffer: Buffer,
    color: string,
    width: number
): Promise<Buffer> {
    // Create a solid color silhouette (same as shadow)
    const meta = await sharp(inputBuffer).metadata();
    const solidColor = await sharp({
        create: {
            width: meta.width || 100,
            height: meta.height || 100,
            channels: 4,
            background: color
        }
    }).png().toBuffer();

    const silhouette = await sharp(solidColor)
        .composite([{ input: inputBuffer, blend: 'dest-in' }])
        .png()
        .toBuffer();

    // Dilate the silhouette to create the stroke
    // Sharp's 'extend' or 'linear' won't work well for arbitrary shapes.
    // A robust trick is to blur the solid silhouette heavily, then threshold the alpha.
    // Or, simply create 4-8 copies offset in a circle for a cheap stroke.
    // For performance and quality, the "Multi-Offset" method is standard for backend stroke without GPU.
    
    // We'll generate a larger buffer to hold the stroke
    const strokeCanvas = sharp({
        create: {
            width: (meta.width || 100) + width * 2,
            height: (meta.height || 100) + width * 2,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    });

    const offsets = [
        { top: 0, left: width }, { top: width * 2, left: width }, 
        { top: width, left: 0 }, { top: width, left: width * 2 },
        // Diagonals for smoother corners
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