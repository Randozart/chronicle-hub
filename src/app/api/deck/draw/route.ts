// src/app/api/deck/draw/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getOpportunitiesForDeck, getWorldState } from '@/engine/worldService'; 
import { GameEngine } from '@/engine/gameEngine';
import { regenerateDeckCharges } from '@/engine/deckService'; 
import { getContent } from '@/engine/contentCache';

const FREQUENCY_WEIGHTS: Record<string, number> = {
    "Always": Infinity, // Should be handled by Autofire, but kept for legacy decks
    "Frequent": 10,
    "Standard": 5,
    "Infrequent": 2,
    "Rare": 1,
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyId, characterId } = await request.json();

    if (!storyId || !characterId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId);
    let character = await getCharacter(userId, storyId, characterId);
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    
    const location = gameData.locations[character.currentLocationId];
    if (!location) return NextResponse.json({ error: 'Invalid location' }, { status: 500 });
    
    const deckDef = gameData.decks[location.deck];
    if (!deckDef) return NextResponse.json({ message: 'There is no deck here.' });

    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
    }

    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);

    let costExpression = deckDef.draw_cost || gameData.settings.defaultDrawCost || "1";
    const resolvedCost = engine.evaluateText(`{${costExpression}}`);
    const numericCost = parseInt(resolvedCost, 10);
    const isPureNumber = !isNaN(numericCost);

    if (isPureNumber && numericCost > 0) {
        if (gameData.settings.useActionEconomy) {
            const actionQid = gameData.settings.actionId.replace('$', '');
            const currentActions = engine.getEffectiveLevel(actionQid);
            if (currentActions < numericCost) return NextResponse.json({ message: 'Not enough actions to draw.' });
            engine.applyEffects(`$${actionQid} -= ${numericCost}`);
            character.lastActionTimestamp = new Date();
        }
    } else {
        try {
            if (costExpression.match(/(-=|\+=|=)/)) engine.applyEffects(costExpression);
        } catch (e) { console.error("Draw Cost Error:", e); }
    }

    character.qualities = engine.getQualities();
    regenerateDeckCharges(character, deckDef, gameData);
    
    const deckId = deckDef.id;
    if (!character.opportunityHands) character.opportunityHands = {};
    if (!character.opportunityHands[deckId]) character.opportunityHands[deckId] = [];
    if (!character.deckCharges) character.deckCharges = {};

    const handSizeVal = engine.evaluateText(`{${deckDef.hand_size}}`);
    const handSize = parseInt(handSizeVal, 10) || 3;
    let deckSize = 0;
    if (deckDef.deck_size) {
        const deckSizeVal = engine.evaluateText(`{${deckDef.deck_size}}`);
        deckSize = parseInt(deckSizeVal, 10);
    }

    const currentHand = character.opportunityHands[deckId];
    const currentCharges = character.deckCharges[deckId] ?? 0;

    if (currentHand.length >= handSize) return NextResponse.json({ character, message: `Your hand is full (${currentHand.length}/${handSize}).` });
    if (deckSize > 0 && currentCharges <= 0) return NextResponse.json({ character, message: 'The deck is empty. Wait for it to refresh.' });

    // --- CARD SELECTION LOGIC ---
    const allCardsInDeck = await getOpportunitiesForDeck(storyId, location.deck);
    
    const eligibleCards = allCardsInDeck.filter(card => {
        const drawCond = engine.evaluateCondition(card.draw_condition);
        const notInHand = !currentHand.includes(card.id);
        return drawCond && notInHand;
    });

    if (eligibleCards.length === 0) {
        return NextResponse.json({ character, message: 'No cards are available to draw right now.' });
    }

    // --- STORYNEXUS MODE: PRIORITY DRAW ---
    let poolToDrawFrom = eligibleCards;
    
    if (gameData.settings.storynexusMode) {
        // High urgency cards MUST be drawn before Normal ones
        const highUrgencyCards = eligibleCards.filter(c => c.urgency === 'High');
        if (highUrgencyCards.length > 0) {
            poolToDrawFrom = highUrgencyCards;
            console.log("[SN Mode] High Priority Deck Draw Active");
        }
    }
    
    let drawnCardId: string | undefined = undefined;
    const alwaysCard = poolToDrawFrom.find(card => card.frequency === "Always");
    
    if (alwaysCard) {
        drawnCardId = alwaysCard.id;
    } else {
        const lotteryPool: string[] = [];
        for (const card of poolToDrawFrom) {
            const weight = FREQUENCY_WEIGHTS[card.frequency] || 5;
            for (let i = 0; i < weight; i++) { lotteryPool.push(card.id); }
        }
        if (lotteryPool.length > 0) {
            drawnCardId = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];
        }
    }

    if (drawnCardId) {
        if (deckSize > 0) character.deckCharges[deckId] = Math.max(0, currentCharges - 1);
        character.opportunityHands[deckId].push(drawnCardId);
        await saveCharacterState(character);
        return NextResponse.json({ character }); 
    } else {
        return NextResponse.json({ character, message: 'Failed to draw a card (Pool Empty).' });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId, cardId, deckId } = await request.json();

    if (!storyId || !characterId || !cardId || !deckId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const character = await getCharacter(userId, storyId, characterId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // Ensure the hand exists
    if (!character.opportunityHands || !character.opportunityHands[deckId]) {
        return NextResponse.json({ error: 'Deck not found on character' }, { status: 404 });
    }

    // Filter out the card
    const originalLength = character.opportunityHands[deckId].length;
    character.opportunityHands[deckId] = character.opportunityHands[deckId].filter(id => id !== cardId);

    if (character.opportunityHands[deckId].length === originalLength) {
        return NextResponse.json({ error: 'Card not found in hand' }, { status: 404 });
    }

    // Save
    await saveCharacterState(character);

    return NextResponse.json({ success: true, hand: character.opportunityHands[deckId] });
}