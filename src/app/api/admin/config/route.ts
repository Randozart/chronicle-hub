import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { updateWorldConfigItem, deleteWorldConfigItem } from '@/engine/worldService';
import { verifyWorldAccess } from '@/engine/accessControl';

export async function POST(request: NextRequest) {
    try {
        // 1. Read Body ONCE
        const body = await request.json();
        const { storyId, category, itemId, data } = body;

        // 2. Validation (Allow data to be boolean false)
        if (!storyId || !category || !itemId || data === undefined) {
             return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Security Check (Pass ID, not Request)
        if (!await verifyWorldAccess(storyId, 'writer')) {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 4. Execute
        const success = await updateWorldConfigItem(storyId, category, itemId, data);
        
        return NextResponse.json({ success });

    } catch (error) {
        console.error("Admin Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        const category = searchParams.get('category') as any;
        const itemId = searchParams.get('itemId');

        if (!storyId || !category || !itemId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const success = await deleteWorldConfigItem(storyId, category, itemId);
        return NextResponse.json({ success });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}