import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getOpportunitiesForDeck, getEvent } from '@/engine/worldService'; 
import { GameEngine } from '@/engine/gameEngine';
import { CharacterDocument, Opportunity } from '@/engine/models';
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
    const { storyId, characterId } = await request.json(); // <--- REQUIRE CHARACTER ID

    if (!storyId || !characterId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // 1. Load Content & Character
    const gameData = await getContent(storyId);
    let character = await getCharacter(userId, storyId, characterId);
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    
    const engineForCheck = new GameEngine(character.qualities, gameData, character.equipment);
    const location = gameData.locations[character.currentLocationId];
    
    if (!location) return NextResponse.json({ error: 'Invalid location' }, { status: 500 });
    
    const deckDef = gameData.decks[location.deck];

    if (!deckDef) return NextResponse.json({ message: 'There is no deck here.' });
    // 2. Action Economy Cost (If enabled)

    // Determine final cost expression
    let costExpression = deckDef.draw_cost || gameData.settings.defaultDrawCost || "1";

    // If it resolves to a number, treat as Actions
    const numericCost = parseInt(costExpression, 10);
    const isPureNumber = !isNaN(numericCost) && /^\d+$/.test(costExpression.trim());

    if (isPureNumber && numericCost > 0) {
        // --- CASE A: ACTION ECONOMY ---
        if (gameData.settings.useActionEconomy) {
            character = await regenerateActions(character);
            
            const actionQid = gameData.settings.actionId.replace('$', '');
            const actionsState = character.qualities[actionQid];
            const currentActions = (actionsState && 'level' in actionsState) ? actionsState.level : 0;
            
            if (currentActions < numericCost) {
                 return NextResponse.json({ message: 'Not enough actions to draw.' });
            }
            
            // Deduct Actions
            if (actionsState && 'level' in actionsState) {
                (actionsState as any).level -= numericCost;
                character.lastActionTimestamp = new Date(); // Reset regen
            }
        }
    } else {
        // --- CASE B: CUSTOM LOGIC ($gold -= 5) ---
        try {
            if (costExpression.match(/(-=|\+=|=)/)) {
                const engine = new GameEngine(character.qualities, gameData, character.equipment);
                engine.applyEffect(costExpression);
                character.qualities = engine.getQualities();
            }
        } catch (e) {
            console.error("Draw Cost Error:", e);
        }
    }    

    // This mutates the character object with new charge counts if time has passed
    regenerateDeckCharges(character, deckDef, gameData);
    
    const handSize = parseInt(engineForCheck.evaluateBlock(`{${deckDef.hand_size}}`), 10) || 3;
    const deckId = deckDef.id;
    
    // Ensure arrays/objects exist
    if (!character.opportunityHands) character.opportunityHands = {};
    if (!character.opportunityHands[deckId]) character.opportunityHands[deckId] = [];
    if (!character.deckCharges) character.deckCharges = {};

    const currentHand = character.opportunityHands[deckId];
    
    // Resolve Deck Size (Cap)
    let deckSize = 0;
    if (deckDef.deck_size) {
        const val = engineForCheck.evaluateBlock(`{${deckDef.deck_size}}`);
        deckSize = parseInt(val, 10);
    }

    const currentCharges = character.deckCharges[deckId] ?? 0;

    // ERROR 1: Hand Full
    if (currentHand.length >= handSize) {
        return NextResponse.json({ character, message: `Your hand is full (${currentHand.length}/${handSize}).` });
    }

    // ERROR 2: No Charges (Only if deck_size is set)
    if (deckSize > 0 && currentCharges <= 0) {
        return NextResponse.json({ character, message: 'The deck is empty. Wait for it to refresh.' });
    }

    // 5. Fetch Cards & Filter
    const allCardsInDeck = await getOpportunitiesForDeck(storyId, location.deck);
    
    const eligibleCards = allCardsInDeck.filter(card => {
        // Check Logic: Visible If (legacy) AND Draw Condition
        const drawCond = engineForCheck.evaluateCondition(card.draw_condition);
        
        // Check Exclusions: Already in hand?
        const notInHand = !currentHand.includes(card.id);
        
        return drawCond && notInHand;
    });

    // ERROR 3: No Eligible Cards
    if (eligibleCards.length === 0) {
        return NextResponse.json({ character, message: 'No cards are available to draw right now.' });
    }

    // 6. Draw Logic (Weighted Random)
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

    // 7. Commit Draw
    if (drawnCardId) {
        // Deduct Charge
        if (deckSize > 0) {
            character.deckCharges[deckId] = Math.max(0, currentCharges - 1);
        }
        
        // Add to Hand
        character.opportunityHands[deckId].push(drawnCardId);
        
        await saveCharacterState(character);
        return NextResponse.json({ character }); 
    } else {
        return NextResponse.json({ character, message: 'Failed to draw a card (Pool Empty).' });
    }
}