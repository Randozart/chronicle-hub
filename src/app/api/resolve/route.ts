// src/app/api/resolve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions, processScheduledUpdates } from '@/engine/characterService'; // Imported new function
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { getEvent, getWorldState } from '@/engine/worldService'; 
import { applyWorldUpdates, processAutoEquip } from '@/engine/resolutionService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId, characterId } = await request.json();
    
    // 1. Load Data
    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId); 
    let character = await getCharacter(userId, storyId, characterId); 
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const storyletDef = await getEvent(storyId, storyletId);
    if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // 2. Validate Location/Deck constraints
    if ('location' in storyletDef && storyletDef.location) {
        if (character.currentLocationId !== storyletDef.location) {
            return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
        }
    }

    if ('deck' in storyletDef) {
         const deck = storyletDef.deck;
         const hand = character.opportunityHands?.[deck] || [];
         if (!hand.includes(storyletDef.id)) {
             return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
         }
    }

    // 3. Autofire Check (Anti-Cheat)
    const engineForCheck = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const pendingAutofires = await getAutofireStorylets(storyId);
    const activeAutofire = pendingAutofires.find(e => engineForCheck.evaluateCondition(e.autofire_if));

    if (activeAutofire && activeAutofire.id !== storyletId) {
        return NextResponse.json({ error: 'You are locked in a story event.', redirectId: activeAutofire.id }, { status: 409 });
    }

    const option = storyletDef.options.find(o => o.id === optionId);
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

    // 4. Action Cost Logic
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
        
        // Determine Cost using ScribeScript
        let costExpr: string | number = gameData.settings.defaultActionCost ?? 1;
        
        // NEW: Check dynamic tags for instant_redirect here to avoid cost?
        // Note: Dynamic tags haven't been evaluated yet. 
        // For simplicity, we assume static tags for cost skipping.
        if (option.action_cost) {
            costExpr = option.action_cost;
        } else if (option.tags?.includes('instant_redirect')) {
            costExpr = 0;
        }

        // Logic check logic handles cost calculation...
        // For now, we assume simple numeric cost if it resolves to a number
        const costStr = engineForCheck.evaluateText(`{${costExpr}}`);
        const numericCost = parseInt(costStr, 10);
        
        if (!isNaN(numericCost) && numericCost > 0) {
             const actionQid = gameData.settings.actionId.replace('$', '');
             const currentActions = engineForCheck.getEffectiveLevel(actionQid);
             
             if (currentActions < numericCost) {
                 return NextResponse.json({ error: 'You do not have enough actions.' }, { status: 429 });
             }
             
             // Deduct
             engineForCheck.applyEffects(`$${actionQid} -= ${numericCost}`);
             character.qualities = engineForCheck.getQualities();
             character.lastActionTimestamp = new Date();
        } else {
             // Custom logic cost (e.g. $stress++)
             engineForCheck.applyEffects(String(costExpr));
             character.qualities = engineForCheck.getQualities();
        }
    }

    // 5. Resolve Outcome (The Engine Run)
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const engineResult = engine.resolveOption(storyletDef, option);

    // --- A. HANDLE LIVING STORIES ---
    if (engineResult.scheduledUpdates.length > 0) {
        processScheduledUpdates(character, engineResult.scheduledUpdates);
    }

    // --- B. HANDLE GLOBAL STATE ---
    await applyWorldUpdates(storyId, engineResult.qualityChanges);

    // --- C. UPDATE LOCAL CHARACTER ---
    character.qualities = engine.getQualities();
    
    processAutoEquip(character, engineResult.qualityChanges, gameData);

    // --- D. HANDLE TAGS (Static + Dynamic) ---
    const staticTags = option.tags || [];
    let dynamicTags: string[] = [];
    if (option.dynamic_tags) {
        // Use the engine (which now has updated state) to resolve tags
        const resolvedTags = engine.evaluateText(`{${option.dynamic_tags}}`);
        dynamicTags = resolvedTags.split(',').map(s => s.trim()).filter(Boolean);
    }
    const finalTags = new Set([...staticTags, ...dynamicTags]);

    // --- E. HANDLE CARD DISCARD & CLEAR HAND ---
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        
        if (finalTags.has('clear_hand')) {
             // WIPE THE HAND
             if (character.opportunityHands[deck]) {
                 character.opportunityHands[deck] = [];
             }
        } else {
             // Standard Discard (Remove just this card)
             character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
        }
    } else if (finalTags.has('clear_hand')) {
         // Even if not a card, if 'clear_hand' is set, we need to know WHICH deck.
         // Usually, this tag is used on cards. If used on a storylet, we might check location.deck.
         const locDeck = gameData.locations[character.currentLocationId]?.deck;
         if (locDeck && character.opportunityHands[locDeck]) {
             character.opportunityHands[locDeck] = [];
         }
    }

    // 6. Calculate Redirects & Movement
    // Re-check autofire with NEW state
    const postResolutionEngine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const newAutofire = pendingAutofires.find(e => postResolutionEngine.evaluateCondition(e.autofire_if));
    
    let finalRedirectId: string | undefined = undefined;

    if (newAutofire) {
        finalRedirectId = newAutofire.id;
    } else if (engineResult.redirectId) {
        finalRedirectId = engineResult.redirectId;
    } else if (finalTags.has('instant_redirect')) {
        // If instant redirect but no specific ID, usually implies loop or error, but let's stick to redirectId logic
    } else if (!('deck' in storyletDef)) {
        // Stick to storylet unless we moved
        finalRedirectId = character.currentStoryletId;
    }

    const newLocationId = engineResult.moveToId;
    if (newLocationId) {
        const oldLoc = gameData.locations[character.currentLocationId];
        const newLoc = gameData.locations[newLocationId];

        if (newLoc) {
            character.currentLocationId = newLocationId;
            
            // Deck Persistence Logic
            if (oldLoc && oldLoc.deck !== newLoc.deck) {
                const oldDeckDef = gameData.decks[oldLoc.deck];
                if (oldDeckDef && oldDeckDef.saved === 'False') {
                    if (character.opportunityHands[oldLoc.deck]) {
                        character.opportunityHands[oldLoc.deck] = [];
                    }
                }
            }
            
            if (!engineResult.redirectId && !newAutofire) {
                finalRedirectId = undefined; 
            }
        }
    }

    // 7. Final Save & Response
    character.currentStoryletId = finalRedirectId || "";
    
    await saveCharacterState(character);

    // Clean text for frontend
    const cleanTitle = evaluateText(resolutionTitle(option, engineResult), character.qualities, gameData.qualities, null, 0);
    const cleanBody = evaluateText(engineResult.body, character.qualities, gameData.qualities, null, 0);

    return NextResponse.json({ 
        newQualities: character.qualities,
        updatedHand: 'deck' in storyletDef || finalTags.has('clear_hand') ? character.opportunityHands : undefined, 
        result: {
            ...engineResult,
            title: cleanTitle,
            body: cleanBody,
            redirectId: finalRedirectId 
        }
    });
}

function resolutionTitle(option: any, result: any) {
    // If there was a specific outcome title in the data (not currently in model but good practice), use it.
    // Otherwise use option name.
    return option.name; 
}