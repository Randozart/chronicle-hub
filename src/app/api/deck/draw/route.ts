// src/app/api/deck/draw/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getWorldContent, getOpportunitiesForDeck } from '@/engine/worldService'; // We need the full content for the engine
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument, Opportunity } from '@/engine/models';
import { regenerateDeckCharges } from '@/engine/deckService'; // <-- IMPORT THE NEW SERVICE
import { getContent } from '@/engine/contentCache';


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
    const gameData = await getContent(STORY_ID); // Loads config (decks definition)
    
    let character = await getCharacter(userId, STORY_ID);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

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
    
    const engineForCheck = new GameEngine(character.qualities, gameData);

    const location = gameData.locations[character.currentLocationId];
    if (!location) return NextResponse.json({ character, message: 'Current location is invalid.' });
    
    const deckDef = gameData.decks[location.deck];
    if (!deckDef) return NextResponse.json({ character, message: 'Location has no valid deck.' });

    // 1. Regenerate charges based on time passed. This mutates the character object.
    regenerateDeckCharges(character, deckDef, gameData);
    
    const handSize = parseInt(engineForCheck.evaluateBlock(`{${deckDef.hand_size}}`), 10) || 1;
    const deckId = deckDef.id;
    const currentCharges = character.deckCharges?.[deckId] ?? 0;
    const currentHand = character.opportunityHands?.[deckId] ?? [];

    // 2. Check if player can draw.
    if (currentHand.length >= handSize) {
        return NextResponse.json({ character, message: 'Your hand for this deck is full.' });
    }
    if (deckDef.deck_size && currentCharges <= 0) { // Only check charges for timed decks
        return NextResponse.json({ character, message: 'No draws available for this deck right now.' });
    }
    // --- END NEW LOGIC ---

    const allCardsInDeck = await getOpportunitiesForDeck(STORY_ID, location.deck);

    const eligibleCards = allCardsInDeck.filter(card => {
        const meetsConditions = engineForCheck.evaluateCondition(card.draw_condition);
        const notInHand = !currentHand.includes(card.id);
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
        // Spend the charge and add the card to the correct hand
        if (deckDef.deck_size) character.deckCharges[deckId]--;
        if (!character.opportunityHands) character.opportunityHands = {};
        if (!character.opportunityHands[deckId]) character.opportunityHands[deckId] = [];
        character.opportunityHands[deckId].push(drawnCardId);
        
        // NOW we spend the action, since the draw was successful.
        if (gameData.settings.useActionEconomy && gameData.settings.deckDrawCostsAction) {
            const actionQid = gameData.settings.actionId.replace('$', '');
            if(character.qualities[actionQid] && 'level' in character.qualities[actionQid]) {
                (character.qualities[actionQid] as any).level--;
            }
        }
        
        await saveCharacterState(character);
        return NextResponse.json(character); 
    } else {
        await saveCharacterState(character);
        return NextResponse.json(character);
    }
}