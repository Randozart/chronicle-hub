// src/app/api/storylet/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/engine/worldService'; // <-- Use the new, efficient service

const STORY_ID = 'trader_johns_world'; // Assume a single story for now

export async function GET(request: NextRequest) {
    try {
        // Manually parse the ID from the request URL's pathname.
        // request.nextUrl.pathname is '/api/storylet/trader_john_convo'
        // .split('/') splits it into ['', 'api', 'storylet', 'trader_john_convo']
        // .pop() gets the very last element.
        const storyletId = request.nextUrl.pathname.split('/').pop();

        if (!storyletId) {
            return NextResponse.json({ error: 'Could not determine Storylet ID from URL.' }, { status: 400 });
        }

        const event = await getEvent(STORY_ID, storyletId);

        if (!event) {
            return NextResponse.json({ error: `Event with ID '${storyletId}' not found` }, { status: 404 });
        }

        return NextResponse.json(event);

    } catch (error) {
        console.error(`[API /api/storylet]`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}