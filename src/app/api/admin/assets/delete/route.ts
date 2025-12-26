import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { deleteAsset } from '@/engine/storageService';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';
import { UserDocument } from '@/engine/models';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const { url } = await request.json();
        if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // 1. Verify Ownership & Get File Info
        const user = await db.collection<UserDocument>('users').findOne(
            { _id: new ObjectId(userId) }
        );

        if (!user || !user.assets) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const assetIndex = user.assets.findIndex(a => a.url === url);
        if (assetIndex === -1) {
            return NextResponse.json({ error: 'Asset not found in your library' }, { status: 404 });
        }

        const asset = user.assets[assetIndex];

        // 2. Delete from Storage Provider (S3/MinIO/Local)
        const deleted = await deleteAsset(url);
        
        if (!deleted) {
            console.warn("Storage deletion failed, but removing DB record anyway.");
        }

        // 3. Update User Record (Remove Asset + Decrement Usage)
        // Ensure we don't go below 0 on usage
        const newUsage = Math.max(0, (user.storageUsage || 0) - (asset.size || 0));

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { 
                $pull: { assets: { url: url } } as any,
                $set: { storageUsage: newUsage }
            }
        );

        return NextResponse.json({ success: true, usage: newUsage });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}