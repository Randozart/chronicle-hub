// src/app/api/resolve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { loadGameData } from '@/engine/dataLoader';
import { repositories } from '@/engine/repositories';
// --- CORRECT IMPORTS ---
import { getCharacter, saveCharacterState, CharacterDocument } from '@/engine/characterService';

// This is the single story ID we are working with for now.
const STORY_ID = 'trader_johns_world';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const gameData = loadGameData();
    repositories.initialize(gameData);

    const { storyletId, optionId } = await request.json();
    
    // --- STEP 1: FETCH DATA (ONCE) ---
    // We only need to get the character data once at the start.
    const character = await getCharacter(userId, STORY_ID);
    if (!character) {
        // We use a more specific error message now.
        return NextResponse.json({ error: 'Character not found for this user and story.' }, { status: 404 });
    }

    const storylet = repositories.getEvent(storyletId); // Use getEvent to check both storylets and opportunities
    if (!storylet) {
        return NextResponse.json({ error: `Event with ID '${storyletId}' not found` }, { status: 404 });
    }

    const option = storylet.options.find(o => o.id === optionId);
    if (!option) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    // --- STEP 2: RUN THE ENGINE ---
    console.log(`--- [STARTING ENGINE for user ${userId}] ---`);
    console.log(`Qualities BEFORE:`, JSON.stringify(character.qualities, null, 2));

    const engine = new GameEngine(character.qualities);
    const engineResult = engine.resolveOption(storylet, option);
    const newQualities = engine.getQualities();
    
    console.log(`Qualities AFTER:`, JSON.stringify(newQualities, null, 2));
    console.log(`--- [ENGINE FINISHED] ---`);

    // --- STEP 3: PREPARE AND SAVE THE NEW STATE ---
    // Determine the player's next "current" storylet for progress saving.
    // If it's a redirect, that's the new current one. Otherwise, they stay where they are.
    const nextStoryletId = engineResult.redirectId || storyletId;

    // Create the complete, updated character document.
    const updatedCharacter: CharacterDocument = {
        ...character, // Start with the existing character data (userId, storyId, etc.)
        qualities: newQualities, // Overwrite with the new qualities from the engine
        currentStoryletId: nextStoryletId,
        // TODO: We will update deck state here later on
    };
    
    // Call the save function with the single, complete object.
    await saveCharacterState(updatedCharacter);

    // --- STEP 4: PREPARE THE CLIENT RESPONSE ---
    const finalResult = {
        ...engineResult, 
        title: evaluateText(option.name, newQualities),
        body: evaluateText(engineResult.body, newQualities),
    };

    return NextResponse.json({ newQualities, result: finalResult });
}