import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const config = await getWorldConfig(storyId);
    // Return the dictionary directly or convert to array if preferred
    return NextResponse.json(config.images || {});
}