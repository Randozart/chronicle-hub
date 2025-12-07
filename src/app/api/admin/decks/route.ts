import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const config = await getWorldConfig(storyId);
    
    // Sort Decks
    const decks = Object.values(config.decks || {}).sort((a: any, b: any) => {
        return (a.ordering || 0) - (b.ordering || 0);
    });
    
    return NextResponse.json(decks);
}