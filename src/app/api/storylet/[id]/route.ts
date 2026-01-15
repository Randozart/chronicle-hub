// src/app/api/storylet/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/engine/worldService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const id = request.nextUrl.pathname.split('/').pop();
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        const event = await getEvent(storyId, id);
        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        return NextResponse.json(event);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}