import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    const config = await getWorldConfig(storyId);
    const qualities = Object.values(config.qualities).sort((a: any, b: any) => {
        const orderA = a.ordering || 0;
        const orderB = b.ordering || 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.name || a.id).localeCompare(b.name || b.id);
    });

    return NextResponse.json(qualities);
}