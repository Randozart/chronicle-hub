// src/app/api/deck/draw/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getWorldContent } from '@/engine/worldService'; // We need the full content for the engine
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument, Opportunity } from '@/engine/models';

const STORY_ID = 'trader_johns_world';

const FREQUENCY_WEIGHTS: Record<string, number> = {
    "Always": Infinity,
    "Frequent": 10,
    "Standard": 5,
    "Infrequent": 2,
    "Rare": 1,
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;

    // We fetch the world content once for this request's logic
    const gameData = await getWorldContent(STORY_ID);
    
    let character = await getCharacter(userId, STORY_ID);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // --- Action Economy Check (No changes needed, this logic is fine) ---
    if (gameData.settings.useActionEconomy && gameData.settings.deckDrawCostsAction) {
        character = await regenerateActions(character); // Simplified call
        
        const actionQid = gameData.settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid];
        const currentActions = (actionsState && 'level' in actionsState) ? actionsState.level : 0;
        
        if (currentActions < 1) { // Assuming draw costs 1 action
            return NextResponse.json({ error: 'You are out of actions to draw.' }, { status: 429 });
        }
        
        if (actionsState && 'level' in actionsState) {
            actionsState.level--;
            character.lastActionTimestamp = new Date();
        }
    }
    
    // --- Deck Drawing Logic ---
    const engineForCheck = new GameEngine(character.qualities, gameData);
    const handSize = engineForCheck.getQualityValue('hand_size') || 1;
    if (character.opportunityHand.length >= handSize) {
        return NextResponse.json({ character, message: 'Your hand is full.' });
    }

    const location = gameData.locations[character.currentLocationId];
    if (!location) return NextResponse.json({ error: 'Current location has no deck' }, { status: 400 });

    const allCardsInDeck = Object.values(gameData.opportunities).filter(opp => opp.deck === location.deck);

    const eligibleCards = allCardsInDeck.filter(card => {
        const meetsConditions = engineForCheck.evaluateCondition(card.draw_condition, false);
        const notInHand = !character!.opportunityHand.includes(card.id);
        return notInHand && meetsConditions;
    });


    if (eligibleCards.length === 0) {
        // Return the current, unchanged character state with a message
        return NextResponse.json({ character, message: 'No cards available to draw.' });
    }
    
    let drawnCardId: string | undefined = undefined;
    const alwaysCard = eligibleCards.find(card => card.frequency === "Always");
    if (alwaysCard) {
        drawnCardId = alwaysCard.id;
    } else {
        const lotteryPool: string[] = [];
        for (const card of eligibleCards) {
            const weight = FREQUENCY_WEIGHTS[card.frequency] || 1;
            for (let i = 0; i < weight; i++) { lotteryPool.push(card.id); }
        }
        if (lotteryPool.length > 0) {
            drawnCardId = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];
        }
    }
    
    if (drawnCardId) {
        character.opportunityHand.push(drawnCardId);
        await saveCharacterState(character);
        return NextResponse.json({ character }); // Return a consistent object
    } else {
        await saveCharacterState(character);
        return NextResponse.json({ character }); // Return a consistent object
    }
}