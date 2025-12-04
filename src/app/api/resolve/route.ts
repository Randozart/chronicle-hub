import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText } from '@/engine/textProcessor';
import { getEvent, getWorldState } from '@/engine/worldService'; 

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId, characterId } = await request.json();
    
    // 1. Load Data
    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId); // <--- FETCH
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
        
        const checkEngine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
        
        // FIX: Use Default from Settings
        let actionCost = gameData.settings.defaultActionCost ?? 1;
        
        const isInstant = option.tags?.includes('instant_redirect');

        if (option.action_cost) {
            const resolvedCost = checkEngine.evaluateBlock(option.action_cost);
            const parsed = parseInt(resolvedCost, 10);
            actionCost = isNaN(parsed) ? actionCost : parsed;
        } else if (isInstant) {
            actionCost = 0;
        }

        const actionQid = gameData.settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid] as any;
        const currentActions = (actionsState && 'level' in actionsState) ? actionsState.level : 0;

        if (currentActions < actionCost) {
            return NextResponse.json({ error: 'You do not have enough actions.' }, { status: 429 });
        }
        
        if (actionsState && 'level' in actionsState) {
            actionsState.level -= actionCost;
            if (actionCost > 0) {
                character.lastActionTimestamp = new Date();
            }
        }
    }

    // 5. Resolve Outcome
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const engineResult = engine.resolveOption(storyletDef, option);

    // --- HANDLE LIVING STORY SCHEDULES ---
    const updates = (engineResult as any).scheduledUpdates;
    if (updates && updates.length > 0) {
        if (!character.pendingEvents) character.pendingEvents = [];
        
        updates.forEach((upd: any) => {
            if (upd.type === 'add') {
                // Remove existing timer for this quality (overwrite behavior)
                character.pendingEvents = character.pendingEvents!.filter(e => e.qualityId !== upd.qualityId);
                
                character.pendingEvents.push({
                    id: upd.qualityId, // Use qualityId as key
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
    
    // Update Character
    character.qualities = engine.getQualities();
    
    // Handle Card Discard
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        // Filter out the played card
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
        // Storylets stay open unless redirected
        finalRedirectId = character.currentStoryletId;
    }

    // Handle Movement
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
                finalRedirectId = undefined; // Clear storylet (return to Hub)
            }
        }
    }

    // --- AUTO/FORCE EQUIP LOGIC ---
    const changes = (engineResult as any).qualityChanges || []; 

    for (const change of changes) {
        if (change.levelAfter > 0 && change.type === 'E') {
            const itemDef = gameData.qualities[change.qid];
            if (!itemDef) continue;
            
            const slot = itemDef.category?.split(',')[0].trim(); 
            if (!slot) continue;

            const isForce = itemDef.tags?.includes('force_equip');
            const isAuto = itemDef.tags?.includes('auto_equip');

            if (isForce || (isAuto && !character.equipment[slot])) {
                character.equipment[slot] = change.qid;
            }
        }
    }
    // ------------------------------

    // Final Sync
    character.qualities = engine.getQualities();
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