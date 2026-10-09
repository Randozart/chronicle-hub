import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { v4 as uuidv4 } from 'uuid';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; 
import { getCharacter, saveCharacterState, regenerateActions, processScheduledUpdates, checkLivingStories, enforceEquipmentVisibility } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { getEvent, getWorldState } from '@/engine/worldService'; 
import { applyWorldUpdates, processAutoEquip } from '@/engine/resolutionService';
import { verifyWorldAccess } from '@/engine/accessControl';
import { CharacterDocument, SocialEvent } from '@/engine/models';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user ? (session.user as any).id : 'guest';

        const { storyletId, optionId, storyId, characterId, guestState, targetCharacterId } = await request.json();
        const canDebug = await verifyWorldAccess(storyId, 'writer');

        const gameData = await getContent(storyId);
        const worldState = await getWorldState(storyId);
        let character = null;

        if (userId === 'guest' && guestState) {
            character = guestState;
        } else {
            character = await getCharacter(userId, storyId, characterId);
        }

        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
            
        if (gameData.settings.useActionEconomy) {
            character = await regenerateActions(character);
        }
        character = await checkLivingStories(character);
        const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
        
        if (character.dynamicQualities) {
            engine.dynamicQualities = { ...character.dynamicQualities };
            Object.assign(engine.worldContent.qualities, character.dynamicQualities);
        }

        const storyletDef = await getEvent(storyId, storyletId);
        
        if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        
        if (storyletDef.status === 'maintenance' && !canDebug) {
            return NextResponse.json({ error: 'This content is currently undergoing maintenance.' }, { status: 403 });
        }

        const isAutofire = storyletDef.urgency === 'Must' || !!storyletDef.autofire_if;
        if ('location' in storyletDef && storyletDef.location) {
            const locs = storyletDef.location.split(',').map((l: string) => l.trim()).filter(Boolean);
            if (!locs.includes(character.currentLocationId) && !isAutofire) {
                return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
            }
        }
        
        if ('deck' in storyletDef) {
            const hand = character.opportunityHands?.[storyletDef.deck] || [];
            // A card reached as the current event (e.g. via a pass_redirect from a storylet, like
            // the office fridge sending you to the noodle bar) is playable even though it was never
            // drawn into the hand.
            const isActiveEvent = character.currentStoryletId === storyletDef.id;
            if (!hand.includes(storyletDef.id) && !isActiveEvent) {
                return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
            }
            // Stale-card enforcement: draw_condition is re-checked at resolve so a card whose
            // moment has passed can't be played out of a lingering hand (validateOpportunityHand
            // only prunes at draw/hand-load). keep_if_invalid cards ride anyway; redirect-target
            // cards bypass via the active-event path above.
            if (!isActiveEvent && !storyletDef.keep_if_invalid && storyletDef.draw_condition &&
                !engine.evaluateCondition(storyletDef.draw_condition)) {
                return NextResponse.json({ error: 'The moment for this has passed.' }, { status: 403 });
            }
        }
        const pendingAutofires = await getAutofireStorylets(storyId);
        const eligibleAutofires = pendingAutofires.filter(e =>
            e.autofire_if !== undefined &&
            e.autofire_if.trim() !== "" &&
            (!(e as any).location || (e as any).location.split(',').map((l: string) => l.trim()).includes(character.currentLocationId)) &&
            engine.evaluateCondition(e.autofire_if)
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

        // --- Social action validation (before any action cost is spent) ---
        let targetDoc: CharacterDocument | null = null;
        if (option.social) {
            if (userId === 'guest') {
                return NextResponse.json({ error: 'Social actions require a registered account.' }, { status: 403 });
            }
            if (!targetCharacterId) {
                return NextResponse.json({ error: 'No target selected.' }, { status: 400 });
            }
            const client = await clientPromise;
            targetDoc = await client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db')
                .collection<CharacterDocument>('characters')
                .findOne({ characterId: targetCharacterId, storyId }) ?? null;
            if (!targetDoc) {
                return NextResponse.json({ error: 'Target character not found.' }, { status: 404 });
            }
            if (targetDoc.characterId === character.characterId) {
                return NextResponse.json({ error: 'You cannot target yourself.' }, { status: 400 });
            }
            if (targetDoc.userId === 'guest') {
                return NextResponse.json({ error: 'That character cannot be targeted.' }, { status: 403 });
            }
            if ((option.social_scope || 'here') === 'here' && targetDoc.currentLocationId !== character.currentLocationId) {
                return NextResponse.json({ error: 'That character is not here.' }, { status: 403 });
            }
            if (option.social_if) {
                const targetEngine = new GameEngine(targetDoc.qualities, gameData, targetDoc.equipment, worldState);
                if (targetDoc.dynamicQualities) {
                    Object.assign(targetEngine.worldContent.qualities, targetDoc.dynamicQualities);
                }
                if (!targetEngine.evaluateCondition(option.social_if)) {
                    return NextResponse.json({ error: 'That character does not meet the requirements.' }, { status: 403 });
                }
            }
        }

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
            } else if (costExpr) {
                engine.applyEffects(String(costExpr));
            }
        }
        // Common costs: world-defined secondary meters ("Time passes", "Stamina").
        // Options opt in per option via common_costs; effects are arbitrary ScribeScript.
        // See docs/plans/2026-10-08-common-costs-design.md
        if (gameData.settings.commonCosts?.length && option.common_costs?.length) {
            for (const ccKey of option.common_costs) {
                const cc = gameData.settings.commonCosts.find(c => c.key === ccKey);
                if (cc?.effects) { engine.applyEffects(cc.effects); }
            }
        }

        const engineResult = engine.resolveOption(storyletDef, option);
        character.qualities = engine.getQualities();
        const updatedWorldState = engine.getWorldQualities();

        const newDefinitions = engine.getDynamicQualities();
        if (Object.keys(newDefinitions).length > 0) {
            character.dynamicQualities = { ...(character.dynamicQualities || {}), ...newDefinitions };
        }

        processScheduledUpdates(character, engineResult.scheduledUpdates);
        await applyWorldUpdates(storyId, engineResult.qualityChanges);
        processAutoEquip(character, engineResult.qualityChanges, gameData);
        enforceEquipmentVisibility(character, gameData);

        // --- Social action: snapshot + enqueue on the target ---
        // Actor effects are already applied (locked ordering); $target.* reads
        // now see post-act state. The target's own effects stay pending until
        // they accept (or their next tick, for auto-accept acts).
        if (option.social && targetDoc) {
            const targetCtx = { name: targetDoc.name, qualities: JSON.parse(JSON.stringify(targetDoc.qualities)) };
            engine.setTargetContext(targetCtx);

            const outcome: 'pass' | 'fail' = engineResult.wasSuccess ? 'pass' : 'fail';
            // target_text is stored raw: it narrates TO the target ABOUT the
            // actor, so it evaluates in the target's context at accept time,
            // where $target is the acting player.
            const narration = option.target_text;

            const socialEvent: SocialEvent = {
                instanceId: uuidv4(),
                type: 'social',
                triggerTime: new Date(),
                description: narration,
                fromCharacterId: character.characterId,
                fromName: character.name,
                socialOptionId: option.id,
                socialOptionName: option.name,
                effects: {
                    pass: option.target_pass_quality_change,
                    fail: option.target_fail_quality_change,
                },
                outcome,
                autoAccept: !!option.auto_accept,
                actorSnapshot: {
                    name: character.name,
                    // Post-act actor state: mirroring reads see the actor AFTER
                    // their own effects resolved.
                    qualities: JSON.parse(JSON.stringify(character.qualities)),
                },
            };

            // Append-only write: never touch the rest of the target's document,
            // so a concurrent save on their side cannot be clobbered.
            const client = await clientPromise;
            await client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db')
                .collection<CharacterDocument>('characters')
                .updateOne(
                    { characterId: targetDoc.characterId },
                    { $push: { pendingEvents: socialEvent } }
                );
        }

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
                 character.opportunityHands[deck] = (character.opportunityHands[deck] || []).filter((id: string) => id !== storyletId);
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
        const postResolutionEngine = new GameEngine(character.qualities, gameData, character.equipment, updatedWorldState);
        if (character.dynamicQualities) {
             Object.assign(postResolutionEngine.worldContent.qualities, character.dynamicQualities);
        }
        // Actor prose may reference $target.* — same snapshot the event stores.
        if (option.social && targetDoc) {
            postResolutionEngine.setTargetContext({
                name: targetDoc.name,
                qualities: JSON.parse(JSON.stringify(targetDoc.qualities))
            });
        }
        const newEligibleAutofires = pendingAutofires.filter(e =>
            e.autofire_if !== undefined &&
            e.autofire_if.trim() !== "" &&
            (!(e as any).location || (e as any).location.split(',').map((l: string) => l.trim()).includes(character.currentLocationId)) &&
            postResolutionEngine.evaluateCondition(e.autofire_if)
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
            // Determine if this is a "Root" storylet which is attached to the location
            // or a "Transient" storylet (a redirect/result event).
            const isLocationRoot = 'location' in storyletDef && !!storyletDef.location &&
                storyletDef.location.split(',').map((l: string) => l.trim()).some(l => l === character.currentLocationId);
            
            // We only stick to the current storylet if it's a Root location 
            // or it's an Autofire event that keeps triggering.
            if (isLocationRoot || isAutofire) {
                finalRedirectId = character.currentStoryletId; 
                
                if (isAutofire) {
                     const stillEligible = newEligibleAutofires.some(e => e.id === storyletDef.id);
                     if (!stillEligible) {
                         // Autofire condition no longer met, release the player
                         finalRedirectId = undefined;
                     }
                }
            } else {
                // If it's a Transient event and the option didn't specify a new destination,
                // we assume the interaction is over and return to the Hub and clear the redirect ID.
                finalRedirectId = undefined;
            }
        }
        
        character.currentStoryletId = finalRedirectId || "";
        
        if (userId !== 'guest') {
            await saveCharacterState(character);
        }
        
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
        
            pendingEvents: character.pendingEvents,
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