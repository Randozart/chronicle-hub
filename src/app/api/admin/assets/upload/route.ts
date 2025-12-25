import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { uploadAsset } from '@/engine/storageService';
import { updateWorldConfigItem } from '@/engine/worldService';
import { ImageDefinition } from '@/engine/models';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';
const FREE_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userId = (session.user as any).id;

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const storyId = formData.get('storyId') as string;
        const category = formData.get('category') as string || 'uncategorized';
        const altText = formData.get('alt') as string || '';

        if (!file || !storyId) return NextResponse.json({ error: 'Missing Data' }, { status: 400 });

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium');
        const currentUsage = user.storageUsage || 0;

        if (!isPremium && currentUsage + file.size > FREE_LIMIT_BYTES) {
            return NextResponse.json({ error: 'Storage limit exceeded. Upgrade to Premium for more space.' }, { status: 402 });
        }

        const { url, size } = await uploadAsset(file, 'images', { 
            optimize: true, 
            maxWidth: 1920 
        });

        const assetEntry = {
            id: uuidId(file.name),
            url,
            category,
            uploadedAt: new Date(),
            size
        };

        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            { 
                $inc: { storageUsage: size },
                $push: { assets: assetEntry } as any
            }
        );

        const imageId = assetEntry.id;
        const imageData: ImageDefinition = {
            id: imageId,
            url: url,
            alt: altText || file.name,
            category: category as any
        };

        await updateWorldConfigItem(storyId, 'images', imageId, imageData);

        return NextResponse.json({ success: true, image: imageData, usage: currentUsage + size });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

function uuidId(filename: string) {
    const raw = filename.split('.')[0];
    return raw.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}