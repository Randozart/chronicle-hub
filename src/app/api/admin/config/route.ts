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

        if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
            dataToSave = { ...data, version: newVersion, lastModifiedAt: new Date() };
            console.log(`[API: POST /admin/config] Updating OBJECT ${category}/${itemId} (v${newVersion})`);
        } else {

            newVersion = 0;
            console.log(`[API: POST /admin/config] Updating PRIMITIVE ${category}/${itemId}`);
        }

        const success = await updateWorldConfigItem(storyId, category, itemId, dataToSave);
        
        if (success) {
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