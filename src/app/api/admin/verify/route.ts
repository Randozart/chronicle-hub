import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) {
        return NextResponse.json({ allowed: false, error: "No ID" }, { status: 400 });
    }

    const isAllowed = await verifyWorldAccess(storyId, 'reader'); // 'reader' is minimum entry level

    if (!isAllowed) {
        return NextResponse.json({ allowed: false }, { status: 403 });
    }

    return NextResponse.json({ allowed: true });
}