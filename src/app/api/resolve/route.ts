// src/app/api/resolve/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions, processScheduledUpdates } from '@/engine/characterService'; 
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { getEvent, getWorldState } from '@/engine/worldService'; 
import { applyWorldUpdates, processAutoEquip } from '@/engine/resolutionService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId, characterId } = await request.json();

    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId);
    let character = await getCharacter(userId, storyId, characterId);

    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
    }

    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);

     const storyletDef = await getEvent(storyId, storyletId);
    if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // --- MODIFIED LOCATION CHECK ---
    // If it's a Must event, we ignore location constraints.
    // This allows global interruptions (dreams, arrests, messages) to work.
    
    const isAutofire = storyletDef.urgency === 'Must' || !!storyletDef.autofire_if;

    if ('location' in storyletDef && storyletDef.location) {
        if (character.currentLocationId !== storyletDef.location && !isAutofire) {
            return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
        }
    }
    if ('deck' in storyletDef) {
        const hand = character.opportunityHands?.[storyletDef.deck] || [];
        if (!hand.includes(storyletDef.id)) {
            return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
        }
    }

    // --- AUTOFIRE PRIORITY CHECK ---
    const pendingAutofires = await getAutofireStorylets(storyId);
    
    // Filter first
    const eligibleAutofires = pendingAutofires.filter(e => engine.evaluateCondition(e.autofire_if));
    
    // Sort by Urgency: Must > High > Normal
    eligibleAutofires.sort((a, b) => {
        const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
        const pA = priority[a.urgency || 'Normal'];
        const pB = priority[b.urgency || 'Normal'];
        return pB - pA; // Descending
    });

    const activeAutofire = eligibleAutofires[0];

    // Lock check: You cannot play a normal storylet if an Autofire event is waiting
    if (activeAutofire && activeAutofire.id !== storyletId) {
        return NextResponse.json({ error: 'You are locked in a story event.', redirectId: activeAutofire.id }, { status: 409 });
    }

    const option = storyletDef.options.find(o => o.id === optionId);
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

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
            engine.applyEffects(`$${actionQid} -= ${numericCost}`);
            character.lastActionTimestamp = new Date();
        } else if (costExpr) {
            engine.applyEffects(String(costExpr));
        }
    }

    const engineResult = engine.resolveOption(storyletDef, option);
    character.qualities = engine.getQualities();

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
    
    // Re-check autofire for redirect logic
    const postResolutionEngine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const newEligibleAutofires = pendingAutofires.filter(e => postResolutionEngine.evaluateCondition(e.autofire_if));
    newEligibleAutofires.sort((a, b) => {
        const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
        return priority[b.urgency || 'Normal'] - priority[a.urgency || 'Normal'];
    });
    
    const newAutofire = newEligibleAutofires[0];

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
            
            // --- DECK & SETTING LOGIC ---
            if (oldLoc) {
                // 1. Explicit Deck Change (Standard CH)
                if (oldLoc.deck !== newLoc.deck) {
                    const oldDeckDef = gameData.decks[oldLoc.deck];
                    if (oldDeckDef && oldDeckDef.saved === 'False' && character.opportunityHands[oldLoc.deck]) {
                        character.opportunityHands[oldLoc.deck] = [];
                    }
                }
                
                // 2. StoryNexus Mode: Region Change (Setting Change)
                if (gameData.settings.storynexusMode && oldLoc.regionId !== newLoc.regionId) {
                    // WIPE ALL HANDS when moving between Regions/Settings
                    console.log("[SN Mode] Region changed. Clearing all hands.");
                    character.opportunityHands = {}; 
                }
            }
            
            if (!engineResult.redirectId && !newAutofire) {
                finalRedirectId = undefined; 
            }
        }
    }
    
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