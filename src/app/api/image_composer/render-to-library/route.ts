import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { uploadAsset } from '@/engine/storageService';
import { updateWorldConfigItem } from '@/engine/worldService';
import { ImageDefinition } from '@/engine/models';
import { ObjectId } from 'mongodb';
import { GET } from '../render/route';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const body = await request.json();
        const { storyId, compositionId, renderUrl, name, category = 'composer' } = body;

        if (!storyId || !compositionId || !renderUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Get user to check storage limits
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Parse the render URL to extract parameters
        const renderUrlObj = new URL(renderUrl, 'http://localhost');
        const searchParams = renderUrlObj.searchParams;

        // Add cache-busting and refresh parameters
        searchParams.set('_', Date.now().toString());
        searchParams.set('refresh', 'true');

        // Create a mock NextRequest object for the render endpoint
        // The render endpoint only needs the search parameters, not the full origin
        const mockUrl = new URL('http://localhost' + renderUrlObj.pathname);
        searchParams.forEach((value, key) => {
            mockUrl.searchParams.set(key, value);
        });

        const mockRequest = new NextRequest(mockUrl, {
            method: 'GET',
            headers: request.headers
        });

        console.log(`[Render to Library] Calling render directly with URL: ${mockUrl.toString()}`);

        // Call the render endpoint function directly
        const renderResult = await GET(mockRequest);

        if (!renderResult.ok) {
            const errorText = await renderResult.text();
            console.error(`[Render to Library] Render failed: ${renderResult.status} - ${errorText}`);
            return NextResponse.json({ error: `Render failed: ${renderResult.status}` }, { status: 500 });
        }

        // Check if the response is actually an image
        const contentType = renderResult.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            const errorText = await renderResult.text();
            console.error(`[Render to Library] Render returned non-image: ${contentType} - ${errorText.substring(0, 200)}`);
            return NextResponse.json({ error: 'Render did not return an image' }, { status: 500 });
        }

        // Get the image buffer
        const imageBuffer = Buffer.from(await renderResult.arrayBuffer());
        const imageSize = imageBuffer.byteLength;

        // Check storage limits
        const isPremium = (user.roles || []).includes('admin') || (user.roles || []).includes('premium');
        const currentUsage = user.storageUsage || 0;
        const FREE_LIMIT_BYTES = 20 * 1024 * 1024;
        const storageLimit = user.storageLimit || (isPremium ? 1024 * 1024 * 1024 : FREE_LIMIT_BYTES);

        if (currentUsage + imageSize > storageLimit) {
            return NextResponse.json({ error: 'Storage limit exceeded' }, { status: 402 });
        }

        // Generate a filename based on composition name and timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeName = (name || compositionId).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const filename = `composer_${safeName}_${timestamp}`;

        // Upload the image to storage
        const { url, size } = await uploadAsset(imageBuffer, 'composer', {
            optimize: true,
            preset: 'balanced',
            filename: filename
        });

        // Create asset entry
        const assetEntry = {
            id: `composer_${compositionId}_${Date.now()}`,
            url,
            category,
            folder: 'composer',
            uploadedAt: new Date(),
            size
        };

        // Update user's assets and storage usage
        await db.collection('users').updateOne(
            { _id: new ObjectId(userId) },
            {
                $inc: { storageUsage: size },
                $push: { assets: assetEntry } as any
            }
        );

        // Also add to world images if storyId is provided
        const imageId = assetEntry.id;
        const imageData: ImageDefinition = {
            id: imageId,
            url: url,
            alt: name || compositionId,
            category: category as any,
            size: size
        };

        await updateWorldConfigItem(storyId, 'images', imageId, imageData);

        console.log(`[Render to Library] Successfully saved image: ${url} (${size} bytes)`);

        return NextResponse.json({
            success: true,
            filename: `${filename}.webp`,
            url,
            size,
            image: imageData,
            usage: currentUsage + size
        });

    } catch (error) {
        console.error('[Render to Library] Error:', error);
        return NextResponse.json(
            { error: 'Failed to render and save image to library' },
            { status: 500 }
        );
    }
}