import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; // Use CACHE
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText, calculateSkillCheckChance } from '@/engine/textProcessor';
import { getEvent } from '@/engine/worldService'; // Import this!
import { getWorldConfig } from '@/engine/worldService';


export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId } = await request.json(); // Pass storyId from client
    
// 1. Efficient Data Load (Config only)
    const gameData = await getContent(storyId || 'trader_johns_world');
    let character = await getCharacter(userId, storyId || 'trader_johns_world');
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // 2. CONTEXT VALIDATION
    // FETCH THE EVENT FROM DB
    const storyletDef = await getEvent(storyId || 'trader_johns_world', storyletId);
    
    if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // A. Location Check
    if ('location' in storyletDef && storyletDef.location) {
        if (character.currentLocationId !== storyletDef.location) {
            return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
        }
    }

    // B. Hand Check (if it's a card)
    if ('deck' in storyletDef) {
         const deck = storyletDef.deck;
         const hand = character.opportunityHands?.[deck] || [];
         if (!hand.includes(storyletDef.id)) {
             return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
         }
    }

    const option = storyletDef.options.find(o => o.id === optionId);
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

    // 3. Process Action Economy (Existing logic...)
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
        
        const checkEngine = new GameEngine(character.qualities, gameData, character.equipment);
        
        let actionCost = 1; 
        
        if (option.action_cost) {
            // Use evaluateBlock to handle "$cost_variable" or formulas
            const resolvedCost = checkEngine.evaluateBlock(option.action_cost);
            actionCost = parseInt(resolvedCost, 10);
            if (isNaN(actionCost)) actionCost = 1;
        }        

        const actionQid = gameData.settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid] as any;
        if (actionsState.level < 1) return NextResponse.json({ error: 'No actions.' }, { status: 429 });
        actionsState.level -= 1;
    }

    const engine = new GameEngine(character.qualities, gameData, character.equipment);
    const engineResult = engine.resolveOption(storyletDef, option);
    
    // 5. Update Character State
    character.qualities = engine.getQualities();
    
    // Handle Card Discard
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        // Fix the type error by adding (id: string)
        character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
    }

    const isCard = 'deck' in storyletDef;
    if (isCard) {
        const deck = storyletDef.deck;
        character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
    }

    // 6. AUTOFIRE CHECK (The "Must" Event System)
    // Check if the player should be forced somewhere else (e.g., Menace area)

    const autofireEvents = await getAutofireStorylets(storyId || 'trader_johns_world');
    let forcedRedirectId: string | null = null;

    for (const event of autofireEvents) {
        // We use the engine to evaluate the condition against the NEW qualities
        // Note: We create a new engine instance with the *new* qualities to be safe
        const checkEngine = new GameEngine(character.qualities, gameData);
        
        if (checkEngine.evaluateCondition(event.autofire_if)) {
            console.log(`[Autofire] Triggered: ${event.id}`);
            forcedRedirectId = event.id;
            break; // Trigger the first valid one we find
        }
    }
    
    // If an autofire triggered, it overrides the result's redirect
    let finalRedirectId: string | undefined = undefined;

    if (forcedRedirectId) {
        // Must go to autofire event
        finalRedirectId = forcedRedirectId;
    } else if (engineResult.redirectId) {
        // Result explicitly sends us somewhere
        finalRedirectId = engineResult.redirectId;
    } else if (!isCard) {
        // If it's a Location Storylet and we didn't redirect, we stay here.
        // BUT if it's a Card, we do NOT default to currentStoryletId.
        // We default to undefined (returning to hub).
        finalRedirectId = character.currentStoryletId;
    }

        const newLocationId = (engineResult as any).moveToId;

    if (newLocationId) {
        const config = await getWorldConfig(storyId || 'trader_johns_world');
        const oldLoc = config.locations[character.currentLocationId];
        const newLoc = config.locations[newLocationId];

        if (newLoc) {
            // Update the character's location
            character.currentLocationId = newLocationId;
            
            // Logic: Handle Deck Persistence
            if (oldLoc && oldLoc.deck !== newLoc.deck) {
                // The deck has changed. 
                // Check if the OLD deck is "Saved" (Persistent)
                const oldDeckDef = config.decks[oldLoc.deck];
                
                // If the deck is NOT saved (e.g., 'saved': 'False'), wipe the hand.
                // If it IS saved, we do nothing. The cards stay in 'opportunityHands[oldDeck]',
                // but won't be visible in the new location.
                if (oldDeckDef && oldDeckDef.saved === 'False') {
                    if (character.opportunityHands[oldLoc.deck]) {
                        character.opportunityHands[oldLoc.deck] = [];
                    }
                }
            }
        }
    }

    if (forcedRedirectId) {
        finalRedirectId = forcedRedirectId;
    } else if (engineResult.redirectId) {
        finalRedirectId = engineResult.redirectId;
    } else if (!isCard) {
        // If we MOVED, we usually shouldn't stay in the old storylet.
        // If pass_redirect was NOT set, but pass_move_to WAS set, default to null (Hub).
        if (newLocationId && !engineResult.redirectId) {
            finalRedirectId = undefined; // Go to Hub of new location
        } else {
            finalRedirectId = character.currentStoryletId;
        }
    }
    
    character.currentStoryletId = finalRedirectId || "";
    
    await saveCharacterState(character);

    const rawTitle = option.name; 
    
    const cleanTitle = evaluateText(rawTitle, character.qualities, gameData.qualities);
    const cleanBody = evaluateText(engineResult.body, character.qualities, gameData.qualities);


    return NextResponse.json({ 
        newQualities: character.qualities,
        updatedHand: isCard ? character.opportunityHands : undefined, 
        result: {
            ...engineResult,
            title: cleanTitle,
            body: cleanBody,
            redirectId: finalRedirectId 
        }
    });
}