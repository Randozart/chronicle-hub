// src/app/api/deck/draw/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { loadGameData } from '@/engine/dataLoader';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { repositories } from '@/engine/repositories';
import { GameEngine } from '@/engine/gameEngine';
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

    const character = await getCharacter(userId, STORY_ID);
    if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // --- DECK DRAWING LOGIC ---
    let updatedCharacter = { ...character };

    const location = repositories.getLocation(character.currentLocationId);
    if (!location) {
        return NextResponse.json({ error: 'Current location has no deck' }, { status: 400 });
    }

    // Determine hand size from qualities
    const engineForCheck = new GameEngine(character.qualities, gameData);
    const handSize = parseInt(engineForCheck.evaluateBlock(location.hand_size), 10) || 1;

    // Check if hand is full
    if (character.opportunityHand.length >= handSize) {
        return NextResponse.json({ error: 'Your hand is full' }, { status: 400 });
    }

    // If draw deck is empty, reshuffle discard pile (minus any "sticky" cards)
    if (character.drawDeck.length === 0) {
        console.log("Reshuffling discard pile into draw deck.");
        updatedCharacter.drawDeck = [...character.discardPile];
        updatedCharacter.discardPile = [];
    }
    
    const allCardsInDeck = Object.values(gameData.opportunities)
        .filter(opp => opp.deck === location.deck);

    const eligibleCards = allCardsInDeck.filter(card => {
        const alreadyPresent = updatedCharacter.opportunityHand.includes(card.id) || updatedCharacter.drawDeck.includes(card.id);
        // 3. Use the public method to check conditions.
        const meetsConditions = engineForCheck.evaluateCondition(card.visible_if);
        return !alreadyPresent && meetsConditions;
    });

    if (eligibleCards.length > 0) {
        const drawnCard = eligibleCards[Math.floor(Math.random() * eligibleCards.length)];
        updatedCharacter.opportunityHand.push(drawnCard.id);
        console.log(`User ${userId} drew card: ${drawnCard.id}`);
    } else {
        console.log(`User ${userId} had no eligible cards to draw.`);
        // 4. Correct the response format.
        return NextResponse.json({ message: 'No cards available to draw.', character: updatedCharacter });
    }
    // --- END OF FIX ---

    await saveCharacterState(updatedCharacter);
    return NextResponse.json(updatedCharacter);
}