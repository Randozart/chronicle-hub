import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storyId, targetLocationId, characterId } = await request.json();
    const userId = (session.user as any).id;

    if (!storyId || !targetLocationId || !characterId) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const character = await getCharacter(userId, storyId, characterId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const gameData = await getContent(storyId);
    const targetLoc = gameData.locations[targetLocationId];
    
    if (!targetLoc) {
        return NextResponse.json({ error: 'Invalid location' }, { status: 404 });
    }

    const currentLoc = gameData.locations[character.currentLocationId];
    
    character.currentLocationId = targetLocationId;
    character.currentStoryletId = "";
    
    let handCleared = false;
    if (currentLoc && currentLoc.regionId !== targetLoc.regionId && gameData.settings.storynexusMode) {
        character.opportunityHands = {};
        handCleared = true;
    }

    await saveCharacterState(character);

    return NextResponse.json({ 
        success: true,
        newLocation: targetLoc,
        currentLocationId: targetLocationId,
        handCleared: handCleared
    });
}