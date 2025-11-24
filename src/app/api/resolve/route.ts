// src/app/api/resolve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { GameEngine } from '@/engine/gameEngine';
import { getWorldContent } from '@/engine/worldService'; // Use new service
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { evaluateText } from '@/engine/textProcessor';
import { CharacterDocument, ResolveOption } from '@/engine/models';

const STORY_ID = 'trader_johns_world';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Load static game data for this request
    const gameData = await getWorldContent(STORY_ID);

    const { storyletId, optionId } = await request.json();
    
    let character = await getCharacter(userId, STORY_ID);
    if (!character) {
        return NextResponse.json({ error: 'Character not found for this user and story.' }, { status: 404 });
    }

    const storylet = gameData.storylets[storyletId] || gameData.opportunities[storyletId];
    if (!storylet) {
        return NextResponse.json({ error: `Event with ID '${storyletId}' not found` }, { status: 404 });
    }

    const option = storylet.options.find((o: ResolveOption) => o.id === optionId);
    if (!option) {
        return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    if (gameData.settings.useActionEconomy) {
        // Pass the required `gameData` argument
        character = await regenerateActions(character);
        
        let actionCost = 1; 
        // @ts-ignore - We will fix the model in a moment to add this optional property
        if (option.action_cost && !isNaN(parseInt(option.action_cost, 10))) {
            actionCost = parseInt(option.action_cost, 10);
        }

        const actionQid = gameData.settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid];
        const currentActions = (actionsState && 'level' in actionsState) ? actionsState.level : 0;

        if (currentActions < actionCost) {
            return NextResponse.json({ error: 'You do not have enough actions.' }, { status: 429 });
        }
        
        if (actionsState && 'level' in actionsState) {
            actionsState.level -= actionCost;
            character.lastActionTimestamp = new Date();
        }
    }

    // --- RUN THE ENGINE ---
    const engine = new GameEngine(character.qualities, gameData);
    const engineResult = engine.resolveOption(storylet, option);
    const newQualities = engine.getQualities();

    // --- PREPARE & SAVE UPDATED STATE ---
    const updatedCharacter: CharacterDocument = {
        ...character,
        qualities: newQualities,
        currentStoryletId: engineResult.redirectId || storyletId,
    };

    const playedCard = gameData.opportunities[storyletId];
    if (playedCard) {
        const deckId = playedCard.deck;
        
        // Ensure the hands dictionary exists.
        if (!updatedCharacter.opportunityHands) {
            updatedCharacter.opportunityHands = {};
        }
        // Ensure the hand for this specific deck exists.
        if (!updatedCharacter.opportunityHands[deckId]) {
            updatedCharacter.opportunityHands[deckId] = [];
        }

        // Remove the played card from the correct hand.
        updatedCharacter.opportunityHands[deckId] = character.opportunityHands[deckId].filter((id: string) => id !== storyletId);
    }
    
    await saveCharacterState(updatedCharacter);

    // --- PREPARE CLIENT RESPONSE ---
    const finalResult = {
        ...engineResult, 
        // Use the stateless text processor with 3 arguments
        title: evaluateText(option.name, newQualities, gameData.qualities),
        body: evaluateText(engineResult.body, newQualities, gameData.qualities),
    };

    return NextResponse.json({ newQualities, result: finalResult });
}