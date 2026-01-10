import { NextRequest, NextResponse } from 'next/server';
import { updateWorldConfigItem, deleteWorldConfigItem } from '@/engine/worldService';
import { verifyWorldAccess } from '@/engine/accessControl';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, category, itemId, data } = body;
        
        if (!storyId || !category || !itemId || data === undefined) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!await verifyWorldAccess(storyId, 'writer')) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let dataToSave = data;
        let newVersion = (data?.version || 0) + 1;

        // --- THE FIX ---
        // Only apply object-based versioning if the data is actually a non-array object.
        // This prevents arrays (like 'tags') from being corrupted.
        if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
            dataToSave = { ...data, version: newVersion, lastModifiedAt: new Date() };
            console.log(`[API: POST /admin/config] Updating OBJECT ${category}/${itemId} (v${newVersion})`);
        } else {
            // For arrays and primitives, we don't add versioning metadata directly to them.
            // The version is tracked on the parent object (like 'settings'), not the array itself.
            // We set newVersion to 0 to indicate no specific version bump happened on this primitive.
            newVersion = 0;
            console.log(`[API: POST /admin/config] Updating PRIMITIVE ${category}/${itemId}`);
        }

        const success = await updateWorldConfigItem(storyId, category, itemId, dataToSave);
        
        if (success) {
            // Return newVersion so hooks on object-based pages (Qualities, etc.) update correctly.
            // For primitive saves (like from the Settings page), this value is ignored.
            return NextResponse.json({ success: true, newVersion });
        } else {
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

    } catch (error) {
        console.error("Admin Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const category = searchParams.get('category') as any;
    const itemId = searchParams.get('itemId');

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!storyId || !category || !itemId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const success = await deleteWorldConfigItem(storyId, category, itemId);
    return NextResponse.json({ success });
}