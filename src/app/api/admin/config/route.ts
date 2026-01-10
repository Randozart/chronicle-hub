// src/app/api/admin/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateWorldConfigItem, deleteWorldConfigItem } from '@/engine/worldService';
import { verifyWorldAccess } from '@/engine/accessControl';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, category, itemId, data } = body;
        
        // 1. Validation
        if (!storyId || !category || !itemId || data === undefined) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 2. Security
        if (!await verifyWorldAccess(storyId, 'writer')) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 3. Versioning Logic (Simple increment for Config items)
        const currentVersion = data.version || 0;
        const newVersion = currentVersion + 1;
        const dataToSave = { ...data, version: newVersion, lastModified: new Date() };

        console.log(`[API: POST /admin/config] Updating ${category}/${itemId} (v${newVersion})`);

        // 4. Execute
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