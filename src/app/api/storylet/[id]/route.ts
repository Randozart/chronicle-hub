// src/app/api/storylet/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getWorldConfig } from '@/engine/worldService';
import { getCharacter } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
    // 1. We need the User Session to get their Qualities for parsing
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    // 2. Get params
    const id = request.nextUrl.pathname.split('/').pop();
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const characterId = searchParams.get('characterId'); // <-- ADD THIS

    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });
    if (!characterId) return NextResponse.json({ error: 'Missing characterId' }, { status: 400 }); // <-- ADD THIS

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    try {
        // 3. Load Data
        const event = await getEvent(storyId, id);
        if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Use the specific characterId now
        const character = await getCharacter(userId, storyId, characterId); // <-- UPDATE THIS CALL
        if (!character) return NextResponse.json({ error: 'No character' }, { status: 404 });
        
        const config = await getWorldConfig(storyId);

        // 4. PRE-RENDER with Game Engine
        const engine = new GameEngine(character.qualities, config, character.equipment);
        const renderedEvent = engine.renderStorylet(event);

        return NextResponse.json(renderedEvent);


    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}