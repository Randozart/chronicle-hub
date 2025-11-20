// src/app/api/resolve/route.ts 

import { NextRequest, NextResponse } from 'next/server';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { loadGameData } from '@/engine/dataLoader';
import { repositories } from '@/engine/repositories';
//import { getPlayer, savePlayerQualities } from '@/engine/playerService';
import { getServerSession } from 'next-auth/next'; 
import { authOptions } from '@/app/api/auth/[...nextauth]/route'; 
import { saveCharacterState } from '@/engine/characterService'; 
import { getCharacter, getOrCreateCharacter } from '@/engine/characterService';

const TEST_USER_ID = 'test_user_01';
const STORY_ID = 'trader_johns_world';


export async function POST(request: NextRequest) {
    
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const username = session.user.name || 'Adventurer';


    const gameData = loadGameData();
    repositories.initialize(gameData);

    const { storyletId, optionId } = await request.json();
    
    console.log(`\n\n--- [API RESOLVE START] Received request for Storylet: ${storyletId}, Option: ${optionId} ---`);
    
    const player = await getOrCreateCharacter(userId, STORY_ID, username);
    if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const storylet = repositories.getStorylet(storyletId);
    if (!storylet) {
        return NextResponse.json({ error: 'Storylet not found' }, { status: 404 });
    }

    

    const option = storylet.options.find(o => o.id === optionId);
    
    if (!option) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    console.log(`\n--- [API TRACE] ---`);
    console.log(`Player Qualities BEFORE:`, JSON.stringify(player.qualities, null, 2));
    console.log(`Executing Option ID: ${option.id}`);
    console.log(`PASS_QUALITY_CHANGE string: "${option.pass_quality_change}"`);
    console.log(`FAIL_QUALITY_CHANGE string: "${option.fail_quality_change}"`);
    console.log(`--- [STARTING ENGINE] ---`);

    const character = await getCharacter(userId, STORY_ID);
    if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
    
    const engine = new GameEngine(character.qualities);
    const engineResult = engine.resolveOption(storylet, option);
    const newQualities = engine.getQualities();
    
    const nextStoryletId = engineResult.redirectId || storyletId;

    await saveCharacterState(userId, STORY_ID, newQualities, nextStoryletId);

    console.log(`--- [ENGINE FINISHED] ---`);
    console.log(`Player Qualities AFTER:`, JSON.stringify(newQualities, null, 2));
    console.log(`--- [END API TRACE] ---\n`);
    
    //await savePlayerQualities(userId, newQualities);

    const finalResult = {
        ...engineResult, 
        title: evaluateText(option.name, newQualities),
        body: evaluateText(engineResult.body, newQualities),
    };

    return NextResponse.json({ newQualities, result: finalResult });
}