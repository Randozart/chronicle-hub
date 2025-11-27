import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';
// You'll need a new update helper in worldService too, ideally.

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const config = await getWorldConfig(storyId);
    return NextResponse.json(config.categories);
}

