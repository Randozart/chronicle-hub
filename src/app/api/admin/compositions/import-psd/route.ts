import { NextRequest, NextResponse } from 'next/server';
import { readPsd, initializeCanvas } from 'ag-psd';
import { uploadAsset } from '@/engine/storageService';
import clientPromise from '@/engine/database';
import { CompositionLayer, GlobalAsset, UserDocument } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';

/**
 * Persistent Canvas Mock
 * This creates a mock canvas that actually stores decoded pixel data
 * in a way that we can retrieve it during the layer loop.
 */
initializeCanvas((width, height) => {
    let _data: Uint8ClampedArray | null = null;
    return {
        width,
        height,
        getContext: () => ({
            createImageData: (w: number, h: number) => {
                const data = new Uint8ClampedArray(w * h * 4);
                return { data };
            },
            putImageData: (imgData: any) => {
                // Capture the decoded pixels
                _data = imgData.data;
            },
            getImageData: () => ({ data: _data }),
            // No-op stubs for safety
            save: () => {}, restore: () => {}, clearRect: () => {},
            fillRect: () => {}, drawImage: () => {}, translate: () => {},
            rotate: () => {}, scale: () => {}, setTransform: () => {},
        })
    } as any;
});

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const TMP_DIR = path.join(os.tmpdir(), 'chronicle-uploads');

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const step = searchParams.get('step'); 
        const uploadId = searchParams.get('uploadId') || uuidv4();
        const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0');
        const storyId = searchParams.get('storyId');
        const compositionId = searchParams.get('compositionId');

        try { await fs.access(TMP_DIR); } catch { await fs.mkdir(TMP_DIR, { recursive: true }); }
        const tempFilePath = path.join(TMP_DIR, `${uploadId}.bin`);

        if (!step || step === 'upload') {
            const arrayBuffer = await request.arrayBuffer();
            if (!arrayBuffer || arrayBuffer.byteLength === 0) return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
            const buffer = Buffer.from(new Uint8Array(arrayBuffer));
            if (!step || chunkIndex === 0) await fs.writeFile(tempFilePath, buffer);
            else await fs.appendFile(tempFilePath, buffer);
            if (step === 'upload') return NextResponse.json({ success: true });
        }

        if (!step || step === 'finish') {
            if (!storyId || !compositionId) {
                try { await fs.unlink(tempFilePath); } catch {}
                return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
            }

            const fullBuffer = await fs.readFile(tempFilePath);
            const userId = (session.user as any).id;
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const user = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(userId) });
            const isSysAdmin = (ADMIN_EMAIL && session.user.email === ADMIN_EMAIL) ||  user?.roles?.includes('admin');

            let psd;
            try {
                // Force decode everything
                psd = readPsd(fullBuffer, { skipLayerImageData: false, skipThumbnail: true } as any);
            } catch (err: any) {
                console.error("ag-psd parse error:", err);
                await fs.unlink(tempFilePath);
                return NextResponse.json({ error: `PSD Parse Error: ${err.message}` }, { status: 400 });
            }

            await fs.unlink(tempFilePath);

            const newLayers: CompositionLayer[] = [];
            let totalUploadSize = 0;
            let zIndexCounter = 0;

            const processNode = async (children: any[], parentGroupId?: string) => {
                for (let i = 0; i < children.length; i++) {
                    const node = children[i];
                    
                    if (node.children) {
                        const groupId = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        const effectiveGroupId = (groupId.includes('group') || groupId === 'base') ? parentGroupId : groupId;
                        await processNode(node.children, effectiveGroupId || parentGroupId);
                        continue; 
                    }

                    const nodeWidth = (node.right ?? 0) - (node.left ?? 0);
                    const nodeHeight = (node.bottom ?? 0) - (node.top ?? 0);

                    // Skip common meta-layers that shouldn't be imported
                    if (node.name.includes('Adjustment') || nodeWidth <= 1 || nodeHeight <= 1) {
                        continue;
                    }

                    // Skip if the layer is completely transparent (common in exports)
                    if (node.opacity === 0) {
                        continue;
                    }
                    
                    let pixels = node.imageData?.data;

                    if (!pixels && node.canvas) {
                        const ctx = node.canvas.getContext('2d');
                        pixels = ctx.getImageData()?.data;
                    }

                    if (pixels && pixels.length > 0 && nodeWidth > 0 && nodeHeight > 0) {
                        const layerNameClean = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        const uniqueAssetId = `${compositionId}_${layerNameClean.slice(0,10)}_${uuidv4().slice(0,4)}`;
                        
                        try {
                            const imageBuffer = await sharp(Buffer.from(pixels), {
                                raw: { width: nodeWidth, height: nodeHeight, channels: 4 }
                            }).webp({ quality: 95 }).toBuffer();

                            const folderPath = `compositions/${compositionId}/${parentGroupId || 'base'}`;
                            const { url, size } = await uploadAsset(imageBuffer, folderPath, { filename: layerNameClean });

                            totalUploadSize += size;
                            await db.collection('assets').updateOne(
                                { id: uniqueAssetId },
                                { $set: { id: uniqueAssetId, url, size, category: 'composition_part', folder: folderPath, uploadedAt: new Date(), type: 'image' } },
                                { upsert: true }
                            );

                            newLayers.push({
                                id: uuidv4(),
                                assetId: uniqueAssetId,
                                name: node.name,
                                zIndex: 0,
                                x: node.left || 0,
                                y: node.top || 0,
                                scale: 1,
                                rotation: 0,
                                opacity: node.opacity ?? 1,
                                editorHidden: node.hidden || false,
                                groupId: parentGroupId,
                                variantValue: parentGroupId ? layerNameClean : undefined,
                                blendMode: 'over'
                            });
                        } catch (e) { console.error(e); }
                    }
                }
            };

            if (psd.children) {
                await processNode(psd.children);
            }

            newLayers.reverse();
            newLayers.forEach((layer, index) => {
                layer.zIndex = index;
            });

            if (psd.children) await processNode(psd.children);
            if (user) await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $inc: { storageUsage: totalUploadSize } });

             const newAssetEntries = newLayers.map(layer => {
                return {
                    id: layer.assetId,
                };
            });
            
            // Fetch all assets for this composition folder to be sure
            const folderPath = `compositions/${compositionId}`;
            const assetsForComposition = await db.collection('assets').find({ folder: { $regex: new RegExp(`^${folderPath}`) } }).toArray();

            return NextResponse.json({ 
                success: true, 
                layers: newLayers, 
                newAssets: assetsForComposition, 
                width: psd.width, 
                height: psd.height 
            });
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
    } catch (e: any) {
        console.error("Final Import Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}