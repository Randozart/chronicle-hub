import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateWorldConfigItem, deleteWorldConfigItem } from '@/engine/worldService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    // In a real app, check if session.user.role === 'admin'
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { storyId, category, itemId, data } = await request.json();

        if (!storyId || !category || !itemId || !data) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Basic Validation for MongoDB Key safety
        if (itemId.includes('.') || itemId.startsWith('$')) {
            return NextResponse.json({ error: 'ID cannot contain "." or start with "$"' }, { status: 400 });
        }

        const success = await updateWorldConfigItem(storyId, category, itemId, data);
        
        return NextResponse.json({ success });
    } catch (error) {
        console.error("Admin Save Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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