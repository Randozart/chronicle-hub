import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import { uploadAsset } from '@/engine/storageService';
import { updateWorldConfigItem } from '@/engine/worldService';
import { ImageDefinition } from '@/engine/models';

export async function POST(request: NextRequest) {
    try {
        // 1. Parse Form Data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const storyId = formData.get('storyId') as string;
        const category = formData.get('category') as string || 'uncategorized';
        const altText = formData.get('alt') as string || '';

        // 2. Validation
        if (!file || !storyId) {
            return NextResponse.json({ error: 'Missing file or storyId' }, { status: 400 });
        }

        // 3. Security Check
        if (!await verifyWorldAccess(storyId, 'writer')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 4. Validate File Type (Basic security)
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images allowed.' }, { status: 400 });
        }

        // 5. Upload (This uses your storageService to save locally for now)
        const publicUrl = await uploadAsset(file, 'images');

        // 6. Generate a clean ID (e.g. "my_cool_map")
        // We strip extensions and special chars to make it a valid object key
        const rawName = file.name.split('.')[0];
        const imageId = rawName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        
        // 7. Construct the Metadata
        const imageData: ImageDefinition = {
            id: imageId,
            url: publicUrl,
            alt: altText || rawName,
            category: category as any
        };

        // 8. Save Metadata to World Config (MongoDB)
        await updateWorldConfigItem(storyId, 'images', imageId, imageData);

        return NextResponse.json({ success: true, image: imageData });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}