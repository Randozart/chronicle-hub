// src/app/api/resolve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GameEngine } from '@/engine/gameEngine';
import { loadGameData } from '@/engine/dataLoader';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { repositories } from '@/engine/repositories'; // Stateless functions
import { evaluateText } from '@/engine/textProcessor'; // Server-side text evaluation
import { CharacterDocument } from '@/engine/models';

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
    
    let character = await getCharacter(userId, STORY_ID);
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

    const costsAction = request.nextUrl.pathname.includes('/deck/draw') 
        ? gameData.settings.deckDrawCostsAction 
        : true;

    if (gameData.settings.useActionEconomy && costsAction) {
        // We'll need a function to handle regeneration here
        character = await regenerateActions(character, gameData.settings);
        
        const actionsState = character.qualities['actions'];
        const currentActions = (actionsState && 'level' in actionsState) ? actionsState.level : 0;

        if (currentActions <= 0) {
            return NextResponse.json({ error: 'You are out of actions.' }, { status: 429 }); // 429 Too Many Requests
        }
        
        // Decrement the actions quality
        if (actionsState && 'level' in actionsState) {
            actionsState.level--;
        }
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

    if (gameData.opportunities[storyletId]) {
        updatedCharacter.opportunityHand = character.opportunityHand.filter(id => id !== storyletId);
    }
    
    await saveCharacterState(updatedCharacter);

    const finalResult = {
        ...engineResult, 
        // Use stateless text processor
        title: evaluateText(option.name, newQualities),
        body: evaluateText(engineResult.body, newQualities),
    };

    return NextResponse.json({ newQualities, result: finalResult });
}