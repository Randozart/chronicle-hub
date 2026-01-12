import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions, processScheduledUpdates, checkLivingStories } from '@/engine/characterService'; 
import { GameEngine } from '@/engine/gameEngine';
import { getEvent, getWorldState } from '@/engine/worldService'; 
import { applyWorldUpdates, processAutoEquip } from '@/engine/resolutionService';
import { verifyWorldAccess } from '@/engine/accessControl';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        const { storyletId, optionId, storyId, characterId } = await request.json();
        
        // Check permissions
        const canDebug = await verifyWorldAccess(storyId, 'writer');

        const gameData = await getContent(storyId);
        const worldState = await getWorldState(storyId);
        let character = await getCharacter(userId, storyId, characterId);

        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
            
        if (gameData.settings.useActionEconomy) {
            character = await regenerateActions(character);
        }

        // Check Living Stories (Timers) before resolving
        character = await checkLivingStories(character);

        // 1. Initialize Engine 
        const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
        
        if (character.dynamicQualities) {
            engine.dynamicQualities = { ...character.dynamicQualities };
            Object.assign(engine.worldContent.qualities, character.dynamicQualities);
        }

        const storyletDef = await getEvent(storyId, storyletId);
        if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

        // Validation Checks (Location, Deck, Actions)
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
        
        // Autofire Pre-Check
        const pendingAutofires = await getAutofireStorylets(storyId);
        const eligibleAutofires = pendingAutofires.filter(e => 
            (!e.location || e.location === character.currentLocationId) && 
            engine.evaluateCondition(e.autofire_if || "")
        );
        eligibleAutofires.sort((a, b) => {
            const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
            const pA = priority[a.urgency || 'Normal'] || 1;
            const pB = priority[b.urgency || 'Normal'] || 1;
            return pB - pA; 
        });

        const activeAutofire = eligibleAutofires[0];
        if (activeAutofire && activeAutofire.id !== storyletId) {
            return NextResponse.json({ error: 'You are locked in a story event.', redirectId: activeAutofire.id }, { status: 409 });
        }

        const option = storyletDef.options.find(o => o.id === optionId);
        if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

        if (!engine.evaluateCondition(option.visible_if)) {
             return NextResponse.json({ error: 'Option is not available.' }, { status: 403 });
        }

        // Action Cost Logic
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
                // Timestamp isn't reset here anymore to preserve grid
            } else if (costExpr) {
                engine.applyEffects(String(costExpr));
            }
        }

        // 2. Resolve Option
        const engineResult = engine.resolveOption(storyletDef, option);

        // Update character qualities
        character.qualities = engine.getQualities();

        // Capture updated World Qualities (Important for global flags)
        const updatedWorldState = engine.getWorldQualities();

        const newDefinitions = engine.getDynamicQualities();
        if (Object.keys(newDefinitions).length > 0) {
            character.dynamicQualities = { ...(character.dynamicQualities || {}), ...newDefinitions };
        }

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
        
        // Handle Hand/Deck Management
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
        
        const newLocationId = engineResult.moveToId;
        if (newLocationId) {
            const oldLoc = gameData.locations[character.currentLocationId];
            const newLoc = gameData.locations[newLocationId];
            if (newLoc) {
                character.currentLocationId = newLocationId;
                
                if (oldLoc) {
                    if (oldLoc.deck !== newLoc.deck) {
                        const oldDeckDef = gameData.decks[oldLoc.deck];
                        if (oldDeckDef && oldDeckDef.saved === 'False' && character.opportunityHands[oldLoc.deck]) {
                            character.opportunityHands[oldLoc.deck] = [];
                        }
                    }
                    if (gameData.settings.storynexusMode && oldLoc.regionId !== newLoc.regionId) {
                        character.opportunityHands = {}; 
                    }
                }
            }
        }

        // 3. Post-Resolution Checks (Redirects & Autofires)
        const postResolutionEngine = new GameEngine(character.qualities, gameData, character.equipment, updatedWorldState);
        if (character.dynamicQualities) {
             Object.assign(postResolutionEngine.worldContent.qualities, character.dynamicQualities);
        }

        // Check autofires (Now checks against the NEW location)
        const newEligibleAutofires = pendingAutofires.filter(e => 
            (!e.location || e.location === character.currentLocationId) && 
            postResolutionEngine.evaluateCondition(e.autofire_if || "")
        );
        newEligibleAutofires.sort((a, b) => {
            const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
            const pA = priority[a.urgency || 'Normal'] || 1;
            const pB = priority[b.urgency || 'Normal'] || 1;
            return pB - pA;
        });
        
        const newAutofire = newEligibleAutofires[0];
        let finalRedirectId: string | undefined = undefined;

        if (newAutofire) {
            finalRedirectId = newAutofire.id;
        }
        else if (engineResult.redirectId) {
            finalRedirectId = engineResult.redirectId;
        }
         else if (engineResult.moveToId) {
            finalRedirectId = undefined; 
        }
        else if (!('deck' in storyletDef)) {
            finalRedirectId = character.currentStoryletId; 
            
            if (isAutofire) {
                 const stillEligible = newEligibleAutofires.some(e => e.id === storyletDef.id);
                 if (!stillEligible) {
                     finalRedirectId = undefined;
                 }
            }
        }
        
        if (newLocationId && !engineResult.redirectId && !newAutofire) {
             finalRedirectId = undefined;
        }
        
        character.currentStoryletId = finalRedirectId || "";
        await saveCharacterState(character);

        const cleanTitle = postResolutionEngine.evaluateText(resolutionTitle(option, engineResult));
        const cleanBody = postResolutionEngine.evaluateText(engineResult.body);

        const visibleQualityChanges = canDebug 
            ? engineResult.qualityChanges 
            : engineResult.qualityChanges.filter(c => !c.hidden);

        return NextResponse.json({ 
            newQualities: character.qualities,
            newDefinitions: Object.keys(newDefinitions).length > 0 ? newDefinitions : undefined,
            equipment: character.equipment, 
            updatedHand: 'deck' in storyletDef || finalTags.has('clear_hand') ? character.opportunityHands : undefined, 
            currentLocationId: character.currentLocationId,
            result: { 
                ...engineResult, 
                title: cleanTitle, 
                body: cleanBody, 
                redirectId: finalRedirectId,
                qualityChanges: visibleQualityChanges,
                errors: canDebug ? (engineResult as any).errors : undefined,
                rawEffects: canDebug ? (engineResult as any).rawEffects : undefined,
                resolvedEffects: canDebug ? (engineResult as any).resolvedEffects : undefined
            }
        });

    } catch (fatalError: any) {
        console.error("FATAL RESOLVE ERROR:", fatalError);
        return NextResponse.json({ 
            error: "An unexpected error occurred while processing the script.",
            details: fatalError.message || String(fatalError)
        }, { status: 200 });
    }
}

function resolutionTitle(option: any, result: any) {
    return option.name; 
}