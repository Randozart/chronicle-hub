import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    try {
        const config = await getWorldConfig(storyId);
        return NextResponse.json(config.regions || {});
    } catch (e) {
        console.error("Error fetching regions:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}