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
    
    const { storyId, choices } = await request.json();
    if (!storyId || !choices) {
        return NextResponse.json({ error: 'Missing storyId or choices' }, { status: 400 });
    }
    if (userId) {
        console.log(`[API: POST /character/create] User ${userId} creating new character in story '${storyId}'.`);
        try {
            const newCharacter = await getOrCreateCharacter(userId, storyId, choices);
            if (newCharacter) {
                return NextResponse.json({ success: true, character: newCharacter });
            } else {
                return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
            }
        } catch (error) {
            console.error("Character creation error:", error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
    console.log(`[API: POST /character/create] Guest creating character in story '${storyId}'.`);
    try {
        const gameData = await getContent(storyId);
        if (!gameData) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
        const tempEngine = new GameEngine({}, gameData);
        for (const ruleId in gameData.char_create) {
            const rule = gameData.char_create[ruleId];
            const providedVal = choices[ruleId];
            if (providedVal !== undefined && providedVal !== "") {
                if (gameData.qualities[ruleId]) {
                    tempEngine.changeQuality(ruleId, '=', providedVal, { source: 'Creation' });
                } else {
                    tempEngine.createNewQuality(ruleId, providedVal, null, {});
                }
            } 
            else if (rule.type === 'static' || rule.readOnly) {
                let val = rule.rule;
                try {
                    val = tempEngine.evaluateText(rule.rule);
                } catch (e) {}
                const num = parseFloat(val);
                const finalVal = !isNaN(num) && val.trim() !== "" ? num : val;

                if (gameData.qualities[ruleId]) {
                    tempEngine.changeQuality(ruleId, '=', finalVal, { source: 'Creation (Static)' });
                } else {
                    tempEngine.createNewQuality(ruleId, finalVal, null, {});
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

        return NextResponse.json({ success: true, character: guestCharacter });

    } catch (e) {
        console.error("Guest creation error:", e);
        return NextResponse.json({ error: 'Guest creation failed' }, { status: 500 });
    }
}