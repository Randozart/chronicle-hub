import { NextRequest, NextResponse } from 'next/server';
import { RENDER_CACHE, clearCacheForStory } from '../../render/route';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const clearAll = searchParams.get('all') === 'true';

    if (!storyId && !clearAll) {
        return NextResponse.json(
            { error: 'Missing storyId parameter' },
            { status: 400 }
        );
    }

    try {
        let cleared = 0;

        if (clearAll) {
            // Admin-only: clear entire cache
            cleared = RENDER_CACHE.size;
            RENDER_CACHE.clear();
            console.log(`[Cache] Cleared entire cache (${cleared} entries)`);
        } else {
            // Clear cache for specific story
            cleared = clearCacheForStory(storyId!);
        }

        return NextResponse.json({
            success: true,
            cleared,
            storyId: clearAll ? null : storyId
        });
    } catch (error) {
        console.error('[Cache] Clear error:', error);
        return NextResponse.json(
            { error: 'Cache clearing failed' },
            { status: 500 }
        );
    }
}