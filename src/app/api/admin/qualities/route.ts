import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';
import { getGlobalDynamicQualities } from '@/engine/contentCache'; // Import the new scanner

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const mode = searchParams.get('mode'); // 'standard' | 'dynamic'

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    if (mode === 'dynamic') {
        const dynamicIds = await getGlobalDynamicQualities(storyId);
        return NextResponse.json(dynamicIds);
    }

    const config = await getWorldConfig(storyId);
    
    // Convert to array and sort
    const qualities = Object.values(config.qualities).sort((a: any, b: any) => {
        // Primary: Manual Ordering (Ascending)
        const orderA = a.ordering || 0;
        const orderB = b.ordering || 0;
        if (orderA !== orderB) return orderA - orderB;
        
        // Secondary: Name (Alphabetical)
        return (a.name || a.id).localeCompare(b.name || b.id);
    });
    
    return NextResponse.json(qualities);
}