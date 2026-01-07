import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storyId, targetLocationId, characterId } = await request.json();
    const userId = (session.user as any).id;

    if (!storyId || !targetLocationId || !characterId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Fetch Character & Content
    const character = await getCharacter(userId, storyId, characterId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const gameData = await getContent(storyId);
    const targetLoc = gameData.locations[targetLocationId];
    
    if (!targetLoc) {
        return NextResponse.json({ error: 'Invalid location' }, { status: 404 });
    }

    // 2. Validate Travel (Simple check: is it in the same region?)
    // You can expand this logic (e.g., check connections, unlock conditions)
    const currentLoc = gameData.locations[character.currentLocationId];
    
    // Optional: Security check to ensure they aren't teleporting across the map if you use strict pathing
    // For now, we assume if the MapModal showed it, they can travel there.

    // 3. Update Character
    character.currentLocationId = targetLocationId;
    character.currentStoryletId = ""; // Clear active storylet
    
    // Clear Hand if region changes (Optional, mimics Fallen London behavior)
    if (currentLoc && currentLoc.regionId !== targetLoc.regionId && gameData.settings.storynexusMode) {
        character.opportunityHands = {};
    }

    await saveCharacterState(character);

    return NextResponse.json({ success: true });
}