import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { deleteAsset } from '@/engine/storageService';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const userId = (session.user as any).id;
        const body = await request.json();
        const { action, assetIds, targetFolder, assetId, newId } = body;
        
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // MOVE ASSETS
        if (action === 'move') {
            if (!assetIds || !Array.isArray(assetIds)) return NextResponse.json({ error: 'Missing assetIds' }, { status: 400 });
            
            // We only update the 'folder' metadata. Physical file stays put to ensure URLs don't break.
            await db.collection('assets').updateMany(
                { id: { $in: assetIds } }, 
                { $set: { folder: targetFolder } }
            );

            // Also update the nested user.assets array (legacy support)
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { "assets.$[elem].folder": targetFolder } },
                { arrayFilters: [{ "elem.id": { $in: assetIds } }] }
            );

            return NextResponse.json({ success: true, count: assetIds.length });
        }

        // RENAME ASSET
        if (action === 'rename') {
            if (!assetId || !newId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
            
            // Check collision
            const existing = await db.collection('assets').findOne({ id: newId });
            if (existing) return NextResponse.json({ error: 'ID already exists' }, { status: 409 });

            await db.collection('assets').updateOne({ id: assetId }, { $set: { id: newId } });
            
            // Update user array
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId), "assets.id": assetId },
                { $set: { "assets.$.id": newId } }
            );

            return NextResponse.json({ success: true });
        }

        // DELETE ASSETS
        if (action === 'delete') {
            if (!assetIds || !Array.isArray(assetIds)) return NextResponse.json({ error: 'Missing assetIds' }, { status: 400 });
            
            // Get URLs to delete files
            const assetsToDelete = await db.collection('assets').find({ id: { $in: assetIds } }).toArray();
            
            for (const asset of assetsToDelete) {
                if (asset.url) await deleteAsset(asset.url);
            }

            // Remove from DB
            await db.collection('assets').deleteMany({ id: { $in: assetIds } });
            
            // Remove from User
            await db.collection('users').updateOne(
                { _id: new ObjectId(userId) },
                { $pull: { assets: { id: { $in: assetIds } } } } as any
            );

            return NextResponse.json({ success: true, count: assetsToDelete.length });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (e: any) {
        console.error("Asset Manage Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}