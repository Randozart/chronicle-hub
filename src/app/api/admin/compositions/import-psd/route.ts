import { NextRequest, NextResponse } from 'next/server';
import { readPsd } from 'ag-psd';
import { uploadAsset } from '@/engine/storageService';
import clientPromise from '@/engine/database';
import { CompositionLayer, GlobalAsset, UserDocument } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: NextRequest) {
    try {
        // Auth & Permissions
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const userId = (session.user as any).id;
        const userEmail = session.user.email;

        // SysAdmin / Role Check
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection<UserDocument>('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isSysAdmin = (ADMIN_EMAIL && userEmail === ADMIN_EMAIL) || 
                           user.roles?.includes('admin');

        // Optional: Restrict access to non-basic users if desired
        if (!isSysAdmin && !user.roles?.includes('premium')) {
            return NextResponse.json({ error: 'Feature requires Premium' }, { status: 403 });
        }

        // Read Params & Body
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        const compositionId = searchParams.get('compositionId');

        if (!storyId || !compositionId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }

        const buffer = await request.arrayBuffer();
        
        if (!buffer || buffer.byteLength === 0) {
            return NextResponse.json({ error: 'Empty file' }, { status: 400 });
        }

        // Pre-check Quota (using Raw PSD size as rough estimate, actual usage updated later)
        // SysAdmins bypass this check.
        if (!isSysAdmin) {
            const currentUsage = user.storageUsage || 0;
            const storageLimit = user.storageLimit || (20 * 1024 * 1024); // Default 20MB
            
            // Allow 5MB buffer overhead for processing
            if (currentUsage + buffer.byteLength > storageLimit) {
                return NextResponse.json({ error: 'Storage quota exceeded.' }, { status: 402 });
            }
        }
        
        // Parse PSD
        // Wrap in try-catch to handle truncated buffers gracefully
        let psd;
        try {
            psd = readPsd(Buffer.from(buffer), { skipLayerImageData: false });
        } catch (parseError) {
            console.error("PSD Parse Error:", parseError);
            return NextResponse.json({ 
                error: 'Failed to parse PSD. File may be corrupted or too large for the server configuration.' 
            }, { status: 400 });
        }

        const newLayers: CompositionLayer[] = [];
        let totalUploadSize = 0;

        // Recursive Processing
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
                    
                    const imageBuffer = node.canvas.toBuffer();

                    const folderPath = `compositions/${compositionId}/${parentGroupId || 'base'}`;
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

        // Update User Storage Usage (If not SysAdmin, or update anyway for tracking)
        // We always track usage, even for admins, but we only block non-admins.
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { storageUsage: totalUploadSize } }
        );

        return NextResponse.json({ 
            success: true, 
            layers: newLayers,
            width: psd.width,
            height: psd.height
        });

    } catch (e: any) {
        console.error("PSD Import Error:", e);
        return NextResponse.json({ error: 'Import failed: ' + e.message }, { status: 500 });
    }
}