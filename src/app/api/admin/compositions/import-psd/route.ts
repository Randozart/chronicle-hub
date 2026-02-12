import { NextRequest, NextResponse } from 'next/server';
import { readPsd } from 'ag-psd';
import { uploadAsset } from '@/engine/storageService';
import clientPromise from '@/engine/database';
import { CompositionLayer, GlobalAsset, UserDocument } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import os from 'os'; // Import OS module

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// Use the system's designated temporary directory (e.g. /tmp)
// This should work even on Read-Only file systems.
const TMP_DIR = path.join(os.tmpdir(), 'chronicle-uploads');

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const step = searchParams.get('step'); // 'upload' | 'finish'
        const uploadId = searchParams.get('uploadId');

        if (!uploadId) return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });

        // Ensure temp dir exists (in /tmp)
        try { await fs.access(TMP_DIR); } catch { await fs.mkdir(TMP_DIR, { recursive: true }); }
        
        const tempFilePath = path.join(TMP_DIR, `${uploadId}.bin`);

        // Append Chunk
        if (step === 'upload') {
            const chunkBuffer = await request.arrayBuffer();
            if (!chunkBuffer || chunkBuffer.byteLength === 0) {
                return NextResponse.json({ error: 'Empty chunk' }, { status: 400 });
            }
            await fs.appendFile(tempFilePath, Buffer.from(chunkBuffer));
            return NextResponse.json({ success: true });
        }

        // Process the Complete File
        if (step === 'finish') {
            const storyId = searchParams.get('storyId');
            const compositionId = searchParams.get('compositionId');

            if (!storyId || !compositionId) {
                // Cleanup if invalid
                try { await fs.unlink(tempFilePath); } catch {}
                return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
            }

            // Check if file exists
            try { await fs.access(tempFilePath); } catch {
                return NextResponse.json({ error: 'Upload not found or expired' }, { status: 404 });
            }

            // Read full file
            const fullBuffer = await fs.readFile(tempFilePath);

            // Auth & Quota Check
            const userId = (session.user as any).id;
            const client = await clientPromise;
            const db = client.db(DB_NAME);
            const user = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(userId) });
            
            const isSysAdmin = (ADMIN_EMAIL && session.user.email === ADMIN_EMAIL) || 
                            user?.roles?.includes('admin');

            if (!isSysAdmin && user) {
                const currentUsage = user.storageUsage || 0;
                const storageLimit = user.storageLimit || (20 * 1024 * 1024);
                if (currentUsage + fullBuffer.byteLength > storageLimit) {
                    await fs.unlink(tempFilePath);
                    return NextResponse.json({ error: 'Storage quota exceeded.' }, { status: 402 });
                }
            }

            // Parse PSD
            let psd;
            try {
                psd = readPsd(fullBuffer, { skipLayerImageData: false });
            } catch (parseError) {
                await fs.unlink(tempFilePath);
                console.error("PSD Parse Error:", parseError);
                return NextResponse.json({ error: 'Failed to parse PSD. Corrupt or invalid format.' }, { status: 400 });
            }

            // Clean up temp file immediately after loading into memory to free disk space
            await fs.unlink(tempFilePath);

            const newLayers: CompositionLayer[] = [];
            let totalUploadSize = 0;

            // Process Layers
            const processNode = async (children: any[], parentGroupId?: string) => {
                for (let i = children.length - 1; i >= 0; i--) {
                    const node = children[i];
                    
                    if (node.children) {
                        const groupId = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        await processNode(node.children, groupId);
                        continue;
                    }

                    if (node.canvas) {
                        const layerNameClean = node.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                        const uniqueAssetId = `${compositionId}_${parentGroupId || 'base'}_${layerNameClean}_${uuidv4().slice(0,4)}`;
                        
                        // Buffer from canvas is PNG by default in ag-psd
                        const imageBuffer = node.canvas.toBuffer();
                        const folderPath = `compositions/${compositionId}/${parentGroupId || 'base'}`;
                        
                        // Storage Service handles S3 or Local writing
                        // If Local, ensure 'public/uploads' is writable. If S3, no local write needed here.
                        const { url, size } = await uploadAsset(
                            imageBuffer, 
                            folderPath, 
                            { filename: layerNameClean, optimize: true, maxWidth: 2048 }
                        );

                        totalUploadSize += size;

                        const assetEntry: GlobalAsset = {
                            id: uniqueAssetId,
                            url,
                            size,
                            category: 'composition_part',
                            folder: folderPath,
                            uploadedAt: new Date(),
                            type: 'image'
                        };

                        await db.collection('assets').updateOne(
                            { id: uniqueAssetId },
                            { $set: assetEntry },
                            { upsert: true }
                        );

                        const newLayer: CompositionLayer = {
                            id: uuidv4(),
                            assetId: uniqueAssetId,
                            name: node.name,
                            zIndex: newLayers.length,
                            x: node.left || 0,
                            y: node.top || 0,
                            scale: 1,
                            rotation: 0,
                            opacity: node.opacity != null ? node.opacity : 1,
                            editorHidden: node.hidden || false,
                            groupId: parentGroupId,
                            variantValue: parentGroupId ? layerNameClean : undefined
                        };

                        newLayers.push(newLayer);
                    }
                }
            };

            if (psd.children) {
                await processNode(psd.children);
            }

            // Update Usage
            if (user) {
                await db.collection('users').updateOne(
                    { _id: new ObjectId(userId) },
                    { $inc: { storageUsage: totalUploadSize } }
                );
            }

            return NextResponse.json({ 
                success: true, 
                layers: newLayers,
                width: psd.width,
                height: psd.height
            });
        }

        return NextResponse.json({ error: 'Invalid step' }, { status: 400 });

    } catch (e: any) {
        console.error("PSD Import Error:", e);
        // Ensure cleanup on error
        const { searchParams } = new URL(request.url);
        const uploadId = searchParams.get('uploadId');
        if (uploadId) {
             const tempFilePath = path.join(TMP_DIR, `${uploadId}.bin`);
             try { await fs.unlink(tempFilePath); } catch {}
        }
        return NextResponse.json({ error: 'Import failed: ' + e.message }, { status: 500 });
    }
}