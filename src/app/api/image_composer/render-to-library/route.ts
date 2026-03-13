import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { uploadAsset } from '@/engine/storageService';
import { updateWorldConfigItem } from '@/engine/worldService';
import { ImageDefinition } from '@/engine/models';
import { ObjectId } from 'mongodb';

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

        // Render the image by calling the existing render endpoint
        // Add cache-busting parameter to ensure fresh render
        const cacheBuster = `_=${Date.now()}`;
        const separator = renderUrl.includes('?') ? '&' : '?';

        // For internal requests, we need to construct the URL properly
        // The issue is that request.nextUrl.origin returns https://container-id:3000
        // but SSL isn't configured for internal requests
        // Solution: Use HTTP instead of HTTPS, and try different hostnames

        const port = process.env.PORT || '3000';

        // Get the hostname from the request URL (without protocol)
        const requestHostname = request.nextUrl.hostname;

        // Try different origins in order of preference
        const originAttempts = [
            `http://localhost:${port}`,  // Standard localhost
            `http://127.0.0.1:${port}`,  // IPv4 localhost
            `http://${requestHostname}:${port}`,  // Container hostname (from request)
        ];

        let renderResponse: Response | null = null;
        let lastError: Error | null = null;

        for (const origin of originAttempts) {
            try {
                const fullRenderUrl = `${origin}${renderUrl}${separator}${cacheBuster}&refresh=true`;
                console.log(`[Render to Library] Attempting to render from: ${fullRenderUrl}`);

                // Use a timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    renderResponse = await fetch(fullRenderUrl, {
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    // If we get any response (even non-OK), we've successfully connected
                    // Break out of the loop to handle the response
                    break;
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    throw fetchError;
                }
            } catch (error) {
                console.log(`[Render to Library] Failed with origin ${origin}:`, error);
                lastError = error as Error;
                renderResponse = null;
                continue;
            }
        }

        if (!renderResponse) {
            console.error('[Render to Library] All origin attempts failed:', lastError);
            return NextResponse.json({ error: 'Failed to render image: could not connect to render service' }, { status: 500 });
        }

        if (!renderResponse.ok) {
            const errorText = await renderResponse.text();
            console.error(`[Render to Library] Render failed: ${renderResponse.status} - ${errorText}`);
            return NextResponse.json({ error: `Render failed: ${renderResponse.status}` }, { status: 500 });
        }

        // Check if the response is actually an image
        const contentType = renderResponse.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            const errorText = await renderResponse.text();
            console.error(`[Render to Library] Render returned non-image: ${contentType} - ${errorText.substring(0, 200)}`);
            return NextResponse.json({ error: 'Render did not return an image' }, { status: 500 });
        }

        // Get the image buffer
        const imageBuffer = Buffer.from(await renderResponse.arrayBuffer());
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