import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getContent, getStorylets } from '@/engine/contentCache';
import { drawCards } from '@/engine/deckService';
import { GameEngine } from '@/engine/gameEngine';
import { Opportunity } from '@/engine/models';

// DRAW CARD
export async function POST(request: NextRequest) {
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { storyId, characterId, deckId } = await request.json(); 

    try {
        const gameData = await getContent(storyId);
        let character = await getCharacter(userId, storyId, characterId);

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        // 1. Resolve Deck
        let targetDeckId = deckId;
        if (!targetDeckId) {
            const location = gameData.locations[character.currentLocationId];
            if (location && location.deck) {
                targetDeckId = location.deck.split(',')[0].trim();
            }
        }

        if (!targetDeckId || !gameData.decks[targetDeckId]) {
            return NextResponse.json({ message: 'No valid deck found.' }, { status: 400 });
        }

        const deckDef = gameData.decks[targetDeckId];

        if (gameData.settings.deckDrawCostsAction !== false && gameData.settings.useActionEconomy) {
            character = await regenerateActions(character);
            if (!character) throw new Error("Character load failed after regenerating actions.");

            const engine = new GameEngine(character.qualities, gameData, character.equipment);
            const actionQid = gameData.settings.actionId.replace('$', '');
            const actionsBefore = engine.getEffectiveLevel(actionQid);
            
            let costExpr = deckDef.draw_cost || gameData.settings.defaultDrawCost || "1";
            const costVal = parseInt(engine.evaluateText(`{${costExpr}}`), 10) || 1;

            if (actionsBefore < costVal) {
                return NextResponse.json({ message: 'Not enough actions.' }, { status: 400 });
            }
            
            engine.applyEffects(`$${actionQid} -= ${costVal}`);
            character.qualities = engine.getQualities();
        }


        character = await drawCards(character, targetDeckId, gameData);
        
        await saveCharacterState(character);
        
        const handIds = character.opportunityHands[targetDeckId] || [];
        
        const allEvents = await getStorylets(storyId);
        const handDefinitions = handIds.map(id => {
            const eventDef = allEvents.find(e => e.id === id);
            return eventDef;
        }).filter(Boolean) as Opportunity[];

        return NextResponse.json({ 
            success: true, 
            hand: handDefinitions,
            newQualities: character.qualities,
            newCharges: character.deckCharges,
            lastDeckUpdate: character.lastDeckUpdate
        });

    } catch (e: any) {
        return NextResponse.json({ message: e.message || "Failed to draw card" }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest) {
    //console.log("\n--- [API] /api/deck/draw: DELETE request received ---");
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        //console.error("[API] Unauthorized DELETE attempt.");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { storyId, characterId, cardId, deckId } = await request.json();
    //console.log(`[API] Request Params: storyId=${storyId}, characterId=${characterId}, cardId=${cardId}, deckId=${deckId}`);

    try {
        const character = await getCharacter(userId, storyId, characterId);
        if (!character) {
            //console.error(`[API] Character not found for DELETE: ${characterId}`);
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }

        if (!character.opportunityHands?.[deckId]) {
            //console.error(`[API] Deck not found on character for DELETE: ${deckId}`);
            return NextResponse.json({ error: 'Deck not found on character' }, { status: 404 });
        }

        character.opportunityHands[deckId] = character.opportunityHands[deckId].filter(id => id !== cardId);
        await saveCharacterState(character);
        //console.log(`[API] Card '${cardId}' removed and character state saved.`);

        const handIds = character.opportunityHands[deckId] || [];
        const allEvents = await getStorylets(storyId);
        const handDefinitions = handIds.map(id => allEvents.find(e => e.id === id)).filter(Boolean);

        //console.log("[API] Final 'handDefinitions' after DELETE:", JSON.stringify(handDefinitions, null, 2));
        //console.log("--- [API] /api/deck/draw: DELETE successful ---");
        return NextResponse.json({ success: true, hand: handDefinitions });
    } catch (e: any) {
        //console.error("--- [API] /api/deck/draw: An error occurred during DELETE ---", e);
        return NextResponse.json({ message: "Failed to discard card" }, { status: 500 });
    }
}