// src/app/api/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GameEngine } from '@/engine/gameEngine';
import { loadGameData } from '@/engine/dataLoader';
import { getCharacter, saveCharacterState, CharacterDocument } from '@/engine/characterService';
import { repositories } from '@/engine/repositories'; // Stateless functions
import { evaluateText } from '@/engine/textProcessor'; // Server-side text evaluation

const STORY_ID = 'trader_johns_world';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const gameData = await loadGameData();
    repositories.initialize(gameData);    

    const { storyletId, optionId } = await request.json();
    
    const character = await getCharacter(userId, STORY_ID);
    if (!character) {
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

    console.log(`--- [STARTING ENGINE for user ${userId}] ---`);
    console.log(`Qualities BEFORE:`, JSON.stringify(character.qualities, null, 2));

    const engine = new GameEngine(character.qualities, gameData);
    const engineResult = engine.resolveOption(storylet, option);
    const newQualities = engine.getQualities();

    const nextStoryletId = engineResult.redirectId || storyletId;

    const updatedCharacter: CharacterDocument = {
        ...character,
        qualities: newQualities,
        currentStoryletId: nextStoryletId,
    };
    
    await saveCharacterState(updatedCharacter);

    const finalResult = {
        ...engineResult, 
        // Use stateless text processor
        title: evaluateText(option.name, newQualities),
        body: evaluateText(engineResult.body, newQualities),
    };

    return NextResponse.json({ newQualities, result: finalResult });
}