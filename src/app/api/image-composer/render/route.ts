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
    
    if (!compositionId) {
        return NextResponse.json({ error: 'Missing composition ID' }, { status: 400 });
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

        const composition = await db.collection<ImageComposition>('compositions').findOne({ id: compositionId });

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

            layersToRender.push({
                input: layerBuffer,
                top: Math.round(layer.y),
                left: Math.round(layer.x),
                blend: 'over'
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