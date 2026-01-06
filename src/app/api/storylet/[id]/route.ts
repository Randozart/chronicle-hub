// src/app/api/storylet/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/engine/worldService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
    // 1. Session is not strictly needed if we just fetch raw data, 
    // but it's good for security to ensure a logged-in user is making the request.
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Get params
    const id = request.nextUrl.pathname.split('/').pop();
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    // We don't need characterId here anymore since we're not evaluating

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        // 3. Load RAW Data
        const event = await getEvent(storyId, id);
        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // 4. Return the RAW, UNEVALUATED event data
        return NextResponse.json(event);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}