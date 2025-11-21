// src/app/api/deck/draw/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { loadGameData } from '@/engine/dataLoader';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument } from '@/engine/models';

const STORY_ID = 'trader_johns_world';

// Define the "ticket" values for each frequency
const FREQUENCY_WEIGHTS = {
    "Always": Infinity,
    "Frequent": 10,
    "Standard": 5,
    "Infrequent": 2,
    "Rare": 1,
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const gameData = await loadGameData();
    let character = await getCharacter(userId, STORY_ID);
    if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Use a GameEngine instance for evaluating conditions
    const engineForCheck = new GameEngine(character.qualities, gameData);
    const handSize = engineForCheck.getQualityValue('hand_size') || 1;

    if (character.opportunityHand.length >= handSize) {
        return NextResponse.json({ error: 'Your hand is full' }, { status: 400 });
    }

    const location = gameData.locations[character.currentLocationId];
    if (!location) {
        return NextResponse.json({ error: 'Current location has no deck' }, { status: 400 });
    }

    // 1. Get the "universe" of all cards for this location's deck
    const allCardsInDeck = Object.values(gameData.opportunities)
        .filter(opp => opp.deck === location.deck);

    // 2. Filter for cards the player is currently eligible to draw
    const eligibleCards = allCardsInDeck.filter(card => {
        const meetsConditions = engineForCheck.evaluateCondition(card.draw_condition);
        const notInHand = !character.opportunityHand.includes(card.id);
        return meetsConditions && notInHand;
    });

    if (eligibleCards.length === 0) {
        return NextResponse.json({ message: 'No cards available to draw.', character });
    }
    
    // 3. Perform the Weighted Draw
    let drawnCardId: string | undefined = undefined;

    const alwaysCard = eligibleCards.find(card => card.frequency === "Always");
    if (alwaysCard) {
        drawnCardId = alwaysCard.id;
    } else {
        const lotteryPool: string[] = [];
        for (const card of eligibleCards) {
            const weight = FREQUENCY_WEIGHTS[card.frequency] || 1;
            for (let i = 0; i < weight; i++) {
                lotteryPool.push(card.id);
            }
        }
        
        if (lotteryPool.length > 0) {
            drawnCardId = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];
        }
    }
    
    if (drawnCardId) {
    character.opportunityHand.push(drawnCardId);
        await saveCharacterState(character);
        return NextResponse.json(character); 
    } else {
        return NextResponse.json(character); 
    }
}