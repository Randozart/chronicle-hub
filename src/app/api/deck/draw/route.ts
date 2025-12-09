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
    const { storyId, characterId } = await request.json();

    if (!storyId || !characterId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // 1. Load Content & Character
    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId);
    let character = await getCharacter(userId, storyId, characterId);
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    
    const location = gameData.locations[character.currentLocationId];
    if (!location) return NextResponse.json({ error: 'Invalid location' }, { status: 500 });
    
    const deckDef = gameData.decks[location.deck];
    if (!deckDef) return NextResponse.json({ message: 'There is no deck here.' });

    // 2. Regenerate Actions (Action Economy)
    // We do this BEFORE creating the engine so the engine sees the updated action count.
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
    }

    // 3. Initialize Engine
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);

    // 4. Resolve Costs
    let costExpression = deckDef.draw_cost || gameData.settings.defaultDrawCost || "1";
    
    // Evaluate logic first (e.g. "{ $draw_tax }" -> "2")
    const resolvedCost = engine.evaluateText(`{${costExpression}}`);
    const numericCost = parseInt(resolvedCost, 10);
    const isPureNumber = !isNaN(numericCost);

    if (isPureNumber && numericCost > 0) {
        // --- CASE A: ACTION ECONOMY ---
        if (gameData.settings.useActionEconomy) {
            const actionQid = gameData.settings.actionId.replace('$', '');
            // Check effective level
            const currentActions = engine.getEffectiveLevel(actionQid);
            
            if (currentActions < numericCost) {
                 return NextResponse.json({ message: 'Not enough actions to draw.' });
            }
            
            // Deduct Actions using Engine
            engine.applyEffects(`$${actionQid} -= ${numericCost}`);
            character.lastActionTimestamp = new Date(); // Reset regen timestamp
        }
    } else {
        // --- CASE B: CUSTOM LOGIC ($gold -= 5) ---
        try {
            // Only apply if it looks like an assignment or mutation
            if (costExpression.match(/(-=|\+=|=)/)) {
                engine.applyEffects(costExpression);
            }
        } catch (e) {
            console.error("Draw Cost Error:", e);
        }
    }

    // 5. Update Character with Engine State (Costs Paid)
    character.qualities = engine.getQualities();

    // 6. Regenerate Deck Charges
    // This mutates the character object based on time passed
    regenerateDeckCharges(character, deckDef, gameData);
    
    const deckId = deckDef.id;
    
    // Ensure arrays/objects exist
    if (!character.opportunityHands) character.opportunityHands = {};
    if (!character.opportunityHands[deckId]) character.opportunityHands[deckId] = [];
    if (!character.deckCharges) character.deckCharges = {};

    // 7. Resolve Dynamic Deck Sizes
    const handSizeVal = engine.evaluateText(`{${deckDef.hand_size}}`);
    const handSize = parseInt(handSizeVal, 10) || 3;

    let deckSize = 0;
    if (deckDef.deck_size) {
        const deckSizeVal = engine.evaluateText(`{${deckDef.deck_size}}`);
        deckSize = parseInt(deckSizeVal, 10);
    }

    const currentHand = character.opportunityHands[deckId];
    const currentCharges = character.deckCharges[deckId] ?? 0;

    // CHECK: Hand Full
    if (currentHand.length >= handSize) {
        return NextResponse.json({ character, message: `Your hand is full (${currentHand.length}/${handSize}).` });
    }

    // CHECK: No Charges (Only if deck_size is set)
    if (deckSize > 0 && currentCharges <= 0) {
        return NextResponse.json({ character, message: 'The deck is empty. Wait for it to refresh.' });
    }

    // 8. Fetch Cards & Filter
    const allCardsInDeck = await getOpportunitiesForDeck(storyId, location.deck);
    
    const eligibleCards = allCardsInDeck.filter(card => {
        // Check Logic: Draw Condition
        // engine has the updated state (costs paid), so we use it here
        const drawCond = engine.evaluateCondition(card.draw_condition);
        
        // Check Exclusions: Already in hand?
        const notInHand = !currentHand.includes(card.id);
        
        return drawCond && notInHand;
    });

    if (eligibleCards.length === 0) {
        // Save state (costs were paid) even if no card drawn? 
        // Typically NO. If no card, we shouldn't charge actions. 
        // However, restoring state is complex. For now, we return message.
        // Ideally, we'd check eligibility before paying cost, but cost might affect eligibility.
        // We will just return without saving the character cost deduction.
        return NextResponse.json({ character, message: 'No cards are available to draw right now.' });
    }

    // 9. Draw Logic (Weighted Random)
    let drawnCardId: string | undefined = undefined;
    
    // Check for "Always" priority first
    const alwaysCard = eligibleCards.find(card => card.frequency === "Always");
    
    if (alwaysCard) {
        drawnCardId = alwaysCard.id;
    } else {
        const lotteryPool: string[] = [];
        for (const card of eligibleCards) {
            const weight = FREQUENCY_WEIGHTS[card.frequency] || 5;
            for (let i = 0; i < weight; i++) { lotteryPool.push(card.id); }
        }
        
        if (lotteryPool.length > 0) {
            drawnCardId = lotteryPool[Math.floor(Math.random() * lotteryPool.length)];
        }
    }

    // 10. Commit
    if (drawnCardId) {
        // Deduct Charge
        if (deckSize > 0) {
            character.deckCharges[deckId] = Math.max(0, currentCharges - 1);
        }
        
        // Add to Hand
        character.opportunityHands[deckId].push(drawnCardId);
        
        // Final Save
        await saveCharacterState(character);
        return NextResponse.json({ character }); 
    } else {
        return NextResponse.json({ character, message: 'Failed to draw a card (Pool Empty).' });
    }
}