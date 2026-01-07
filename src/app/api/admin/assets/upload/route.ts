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

        // 1. Parse Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const storyId = formData.get('storyId') as string;
        const category = formData.get('category') as string || 'uncategorized';
        const altText = formData.get('alt') as string || '';
        const qualityRaw = formData.get('quality'); // Get quality string
        console.log(`[API: POST /admin/assets/upload] User ${userId} uploading file '${file.name}' to story '${storyId}' in category '${category}'.`);
        
        // 2. Validation
        if (!file || !storyId) {
            return NextResponse.json({ error: 'Missing file or storyId' }, { status: 400 });
        }

        // Validate File Type (Added svg+xml)
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images allowed.' }, { status: 400 });
        }

        // 3. Check Storage Limits
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium');
        const currentUsage = user.storageUsage || 0;
        const storageLimit = user.storageLimit || (isPremium ? 1024 * 1024 * 1024 : FREE_LIMIT_BYTES);

        if (currentUsage + file.size > storageLimit) {
            return NextResponse.json({ error: 'Storage limit exceeded.' }, { status: 402 });
        }

        // 4. Upload (with Context-Aware Optimization)
        let preset: 'high' | 'balanced' | 'icon' = 'balanced';
        
        // Map UI category to Compression Preset
        if (['map', 'background', 'banner', 'cover'].includes(category)) {
            preset = 'high'; // Minimal compression, allow 4k
        } else if (['icon'].includes(category)) {
            preset = 'icon'; // Aggressive resize (512px)
        }

        // Parse quality override if present
        const qualityOverride = qualityRaw ? parseInt(qualityRaw as string) : undefined;
        
        const { url, size } = await uploadAsset(file, 'images', { 
            optimize: true, 
            preset,
            qualityOverride
        });

        // 5. Update User Usage & Asset List
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

        // 6. Save Metadata to World Config (MongoDB)
        const imageId = assetEntry.id;
        const imageData: ImageDefinition = {
            id: imageId,
            url: url,
            alt: altText || file.name,
            category: category as any,
            size: size
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