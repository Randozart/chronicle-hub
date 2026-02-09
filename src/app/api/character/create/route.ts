import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getOrCreateCharacter } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache';
import { GameEngine } from '@/engine/gameEngine';
import { authOptions } from '@/lib/auth';
import { CharacterDocument } from '@/engine/models';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    
    // Read the body and the config to normalize the choices before creation logic
    let { storyId, choices } = await request.json();

    if (!storyId || !choices) {
        return NextResponse.json({ error: 'Missing storyId or choices' }, { status: 400 });
    }

    try {
        const gameData = await getContent(storyId);
        if (!gameData) return NextResponse.json({ error: 'Story not found' }, { status: 404 });

        // If the world is configured to skip character creation, we ensure defaults are applied
        if (gameData.settings.skipCharacterCreation) {
            console.log(`[API: POST /character/create] Auto-filling defaults for skipped creation in story '${storyId}'.`);
            
            // 1. Set Name Default if missing
            if (!choices['name']) {
                choices['name'] = gameData.settings.playerName || 'Visitor';
            }

            // 2. Set Portrait Default if missing
            if (!choices['portrait'] && gameData.settings.playerImage) {
                choices['portrait'] = gameData.settings.playerImage;
            }

            // 3. Apply any static rules from char_create that might be missed if the UI was skipped
            if (gameData.char_create) {
                 for (const ruleId in gameData.char_create) {
                     const rule = gameData.char_create[ruleId];
                     // If it's a static value and not provided in choices, force it
                     if (rule.type === 'static' && choices[ruleId] === undefined) {
                         choices[ruleId] = rule.rule;
                     }
                 }
            }
        }
        
        // Proceed with standard creation logic using enriched choices
        if (userId) {
            console.log(`[API: POST /character/create] User ${userId} creating new character in story '${storyId}'.`);
            
            const newCharacter = await getOrCreateCharacter(userId, storyId, choices);
            if (newCharacter) {
                return NextResponse.json({ success: true, character: newCharacter });
            } else {
                return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
            }
        }
        
        console.log(`[API: POST /character/create] Guest creating character in story '${storyId}'.`);
        
        const tempEngine = new GameEngine({}, gameData);
        for (const ruleId in gameData.char_create) {
            const rule = gameData.char_create[ruleId];
            const val = choices[ruleId];
            
            const cleanId = ruleId.startsWith('$') ? ruleId.substring(1) : ruleId;

            if (val !== undefined && val !== "") {
                if (gameData.qualities[cleanId]) {
                    tempEngine.changeQuality(cleanId, '=', val, { source: 'Creation' });
                } else {
                    tempEngine.createNewQuality(cleanId, val, null, {});
                }
            } 
            else if (rule.type === 'static' || rule.readOnly) {
                let calculated = rule.rule;
                try {
                    calculated = tempEngine.evaluateText(rule.rule);
                } catch (e) {}

                const num = parseFloat(calculated);
                const finalVal = !isNaN(num) && calculated.trim() !== "" ? num : calculated;

                if (gameData.qualities[cleanId]) {
                    tempEngine.changeQuality(cleanId, '=', finalVal, { source: 'Creation (Static)' });
                } else {
                    tempEngine.createNewQuality(cleanId, finalVal, null, {});
                }
            }
        }

        const guestCharacter: CharacterDocument = {
            characterId: `guest_${uuidv4()}`,
            userId: 'guest',
            storyId,
            name: choices['name'] || 'Drifter',
            qualities: tempEngine.getQualities(),
            currentLocationId: gameData.settings.startLocation || Object.keys(gameData.locations)[0],
            currentStoryletId: '',
            opportunityHands: {},
            deckCharges: {},
            lastDeckUpdate: {},
            lastActionTimestamp: new Date(),
            equipment: {},
            pendingEvents: [],
            dynamicQualities: {}
        };
        
        // Normally auto-equip logic is handled elsewhere, but because guest characters function a little differently and aren't 
        // written to the database, we handle auto- and force-equipping at game start here.
        const computedQualities = guestCharacter.qualities;
        for (const qid in computedQualities) {
            const def = gameData.qualities[qid];
            
            if (def && def.type === 'E') {
                const tags = def.tags || [];
                const isAuto = tags.includes('auto_equip');
                const isForce = tags.includes('force_equip');

                if (isAuto || isForce) {
                    const state = computedQualities[qid];
                    if (state && 'level' in state && state.level > 0) {
                        const slot = (def.category || 'Misc').split(',')[0].trim();
                        
                        if (isForce || !guestCharacter.equipment[slot]) {
                            guestCharacter.equipment[slot] = qid;
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true, character: guestCharacter });

    } catch (error) {
        console.error("Character creation error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}