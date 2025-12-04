import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { getEvent, getWorldState } from '@/engine/worldService'; 
import { applyWorldUpdates, processAutoEquip } from '@/engine/resolutionService'; // <--- NEW IMPORTS

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId, characterId } = await request.json();
    
    // 1. Load Data (Including World State)
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
    // Ensure user isn't ignoring a forced event
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
        
        const checkEngine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
        
        // 1. Determine the Cost Expression
        let costExpr: string | number = gameData.settings.defaultActionCost ?? 1;
        
        // Specific option overrides default
        if (option.action_cost) {
            costExpr = option.action_cost;
        } else if (option.tags?.includes('instant_redirect')) {
            costExpr = 0;
        }

        // 2. Evaluate Logic
        // Is it a simple number?
        const numericCost = parseInt(checkEngine.evaluateBlock(`{${costExpr}}`), 10);
        const isPureNumber = !isNaN(numericCost) && /^\d+$/.test(String(costExpr).trim());

        if (isPureNumber) {
            // --- STANDARD NUMERIC COST ---
            const cost = numericCost;
            const actionQid = gameData.settings.actionId.replace('$', '');
            const currentActions = checkEngine.getEffectiveLevel(actionQid);

            if (currentActions < cost) {
                return NextResponse.json({ error: 'You do not have enough actions.' }, { status: 429 });
            }
            
            // Deduct
            if (cost > 0) {
                // We can use applyEffect for safety
                const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
                engine.applyEffect(`$${actionQid} -= ${cost}`);
                character.qualities = engine.getQualities();
                character.lastActionTimestamp = new Date();
            }
        } else {
            // --- CUSTOM LOGIC COST ($stress++) ---
            // Note: This does not "Gate" the action (check for affordability). 
            // It just applies the tax.
            const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
            engine.applyEffect(String(costExpr));
            character.qualities = engine.getQualities();
            
            // We don't reset timestamp for custom logic usually, or maybe we do? 
            // Let's assume custom logic handles its own flow.
        }
    }

    // 5. Resolve Outcome (The Engine Run)
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const engineResult = engine.resolveOption(storyletDef, option);

    // --- A. HANDLE LIVING STORIES (Schedules) ---
    const updates = (engineResult as any).scheduledUpdates;
    if (updates && updates.length > 0) {
        if (!character.pendingEvents) character.pendingEvents = [];
        
        updates.forEach((upd: any) => {
            if (upd.type === 'add') {
                character.pendingEvents = character.pendingEvents!.filter(e => e.qualityId !== upd.qualityId);
                character.pendingEvents.push({
                    id: upd.qualityId, 
                    qualityId: upd.qualityId,
                    op: upd.op,
                    value: upd.value,
                    triggerTime: new Date(Date.now() + upd.delayMs)
                });
            } else if (upd.type === 'remove') {
                character.pendingEvents = character.pendingEvents!.filter(e => e.qualityId !== upd.qualityId);
            }
        });
    }

    // --- B. HANDLE GLOBAL STATE (World Updates) ---
    // We extract changes tagged with scope: 'world' and write to the World DB
    await applyWorldUpdates(storyId, (engineResult as any).qualityChanges);

    // --- C. UPDATE LOCAL CHARACTER ---
    // Update Qualities
    character.qualities = engine.getQualities();
    
    // Handle Auto-Equip (via Helper)
    processAutoEquip(character, (engineResult as any).qualityChanges, gameData);
    
    // Handle Card Discard
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
    }

    // 6. Calculate Redirects & Movement
    const newAutofire = pendingAutofires.find(e => engine.evaluateCondition(e.autofire_if));
    let finalRedirectId: string | undefined = undefined;

    if (newAutofire) {
        finalRedirectId = newAutofire.id;
    } else if (engineResult.redirectId) {
        finalRedirectId = engineResult.redirectId;
    } else if (!('deck' in storyletDef)) {
        finalRedirectId = character.currentStoryletId;
    }

    const newLocationId = (engineResult as any).moveToId;
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
                finalRedirectId = undefined; // Return to Hub
            }
        }
    }

    // 7. Final Save & Response
    character.currentStoryletId = finalRedirectId || "";
    
    await saveCharacterState(character);

    const cleanTitle = evaluateText(option.name, character.qualities, gameData.qualities);
    const cleanBody = evaluateText(engineResult.body, character.qualities, gameData.qualities);

    return NextResponse.json({ 
        newQualities: character.qualities,
        updatedHand: 'deck' in storyletDef ? character.opportunityHands : undefined, 
        result: {
            ...engineResult,
            title: cleanTitle,
            body: cleanBody,
            redirectId: finalRedirectId 
        }
    });
}