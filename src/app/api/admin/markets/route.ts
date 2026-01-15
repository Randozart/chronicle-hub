import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!await verifyWorldAccess(storyId, 'writer')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const config = await getWorldConfig(storyId);
    const markets = config.markets ? Object.values(config.markets) : [];
    
    return NextResponse.json(markets);
}