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

// C:\Chronicle Hub\chronicle-hub\src\app\api\resolve\route.ts
// C:\Chronicle Hub\chronicle-hub\src\app\api\resolve\route.ts

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
        
    console.log('[RESOLVE DEBUG 1] Before any logic, tutorial_progress is:', (character.qualities['tutorial_progress'] as any)?.level);

    // First, regenerate actions on the raw character object
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
    }

    // NOW, create the single, authoritative engine for this entire transaction.
    // It starts with the most up-to-date character state (including regenerated actions).
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);

    const storyletDef = await getEvent(storyId, storyletId);
    if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // --- Validations (your existing logic is fine) ---
    if ('location' in storyletDef && storyletDef.location && character.currentLocationId !== storyletDef.location) {
        return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
    }
    if ('deck' in storyletDef) {
        const hand = character.opportunityHands?.[storyletDef.deck] || [];
        if (!hand.includes(storyletDef.id)) {
            return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
        }
    }
    const pendingAutofires = await getAutofireStorylets(storyId);
    const activeAutofire = pendingAutofires.find(e => engine.evaluateCondition(e.autofire_if));
    if (activeAutofire && activeAutofire.id !== storyletId) {
        return NextResponse.json({ error: 'You are locked in a story event.', redirectId: activeAutofire.id }, { status: 409 });
    }
    const option = storyletDef.options.find(o => o.id === optionId);
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

    // --- Action Cost Logic using the single engine ---
    if (gameData.settings.useActionEconomy) {
        let costExpr: string | number = gameData.settings.defaultActionCost ?? 1;
        if (option.action_cost) { costExpr = option.action_cost; }
        else if (option.tags?.includes('instant_redirect')) { costExpr = 0; }

        const costStr = engine.evaluateText(`{${costExpr}}`);
        const numericCost = parseInt(costStr, 10);

        if (!isNaN(numericCost) && numericCost > 0) {
            const actionQid = gameData.settings.actionId.replace('$', '');
            if (engine.getEffectiveLevel(actionQid) < numericCost) {
                return NextResponse.json({ error: 'You do not have enough actions.' }, { status: 429 });
            }
            // Apply cost directly to our single engine
            engine.applyEffects(`$${actionQid} -= ${numericCost}`);
            character.lastActionTimestamp = new Date();
        } else if (costExpr) { // Check if costExpr has a non-numeric value
            engine.applyEffects(String(costExpr));
        }
    }

    // --- Resolve Outcome using the SAME engine ---
    // The engine's state is already updated with action costs.
    // resolveOption will now ADD its outcome changes to the existing change log.
    const engineResult = engine.resolveOption(storyletDef, option);
    const engineQualities = engine.getQualities();
    console.log('[RESOLVE DEBUG 2] After engine.resolveOption, tutorial_progress is:', (engineQualities['tutorial_progress'] as any)?.level);

    // *** THE CRITICAL STEP ***
    // Get the final, combined state from the single engine and update the character object.
    character.qualities = engine.getQualities();

    // The rest of the logic can now safely use the fully updated 'character' object
    processScheduledUpdates(character, engineResult.scheduledUpdates);
    await applyWorldUpdates(storyId, engineResult.qualityChanges);
    processAutoEquip(character, engineResult.qualityChanges, gameData);

    const staticTags = option.tags || [];
    let dynamicTags: string[] = [];
    if (option.dynamic_tags) {
        const resolvedTags = engine.evaluateText(`{${option.dynamic_tags}}`);
        dynamicTags = resolvedTags.split(',').map(s => s.trim()).filter(Boolean);
    }
    const finalTags = new Set([...staticTags, ...dynamicTags]);
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        if (finalTags.has('clear_hand')) {
             if (character.opportunityHands[deck]) character.opportunityHands[deck] = [];
        } else {
             character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
        }
    } else if (finalTags.has('clear_hand')) {
         const locDeck = gameData.locations[character.currentLocationId]?.deck;
         if (locDeck && character.opportunityHands[locDeck]) {
             character.opportunityHands[locDeck] = [];
         }
    }
    const postResolutionEngine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const newAutofire = pendingAutofires.find(e => postResolutionEngine.evaluateCondition(e.autofire_if));
    let finalRedirectId: string | undefined = undefined;
    if (newAutofire) { finalRedirectId = newAutofire.id; }
    else if (engineResult.redirectId) { finalRedirectId = engineResult.redirectId; }
    else if (!('deck' in storyletDef)) { finalRedirectId = character.currentStoryletId; }
    const newLocationId = engineResult.moveToId;
    if (newLocationId) {
        const oldLoc = gameData.locations[character.currentLocationId];
        const newLoc = gameData.locations[newLocationId];
        if (newLoc) {
            character.currentLocationId = newLocationId;
            if (oldLoc && oldLoc.deck !== newLoc.deck) {
                const oldDeckDef = gameData.decks[oldLoc.deck];
                if (oldDeckDef && oldDeckDef.saved === 'False' && character.opportunityHands[oldLoc.deck]) {
                    character.opportunityHands[oldLoc.deck] = [];
                }
            }
            if (!engineResult.redirectId && !newAutofire) {
                finalRedirectId = undefined; 
            }
        }
    }
    console.log('[RESOLVE DEBUG 3] Right before saving, tutorial_progress is:', (character.qualities['tutorial_progress'] as any)?.level);
    // --- Final Save & Response ---
    character.currentStoryletId = finalRedirectId || "";
    await saveCharacterState(character);

    const cleanTitle = evaluateText(resolutionTitle(option, engineResult), character.qualities, gameData.qualities, null, 0);
    const cleanBody = evaluateText(engineResult.body, character.qualities, gameData.qualities, null, 0);

    return NextResponse.json({ 
        newQualities: character.qualities,
        updatedHand: 'deck' in storyletDef || finalTags.has('clear_hand') ? character.opportunityHands : undefined, 
        result: { ...engineResult, title: cleanTitle, body: cleanBody, redirectId: finalRedirectId }
    });
}

function resolutionTitle(option: any, result: any) {
    return option.name; 
}