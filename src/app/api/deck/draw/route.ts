import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getContent, getStorylets } from '@/engine/contentCache';
import { drawCards } from '@/engine/deckService';
import { GameEngine } from '@/engine/gameEngine';
import { Opportunity } from '@/engine/models';
export async function POST(request: NextRequest) {
    
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : 'guest';
    
    const { storyId, characterId, deckId, guestState } = await request.json(); 

    try {
        const gameData = await getContent(storyId);
        let character = null;
        
        if (userId === 'guest' && guestState) {
            character = guestState;
        } else {
            character = await getCharacter(userId, storyId, characterId);
        }

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }
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
        
        if (userId !== 'guest') {
            await saveCharacterState(character);
        }
                
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
    const session = await getServerSession(authOptions);

    const userId = session?.user ? (session.user as any).id : 'guest';
    const { storyId, characterId, cardId, deckId, guestState } = await request.json();
    
    try {
        
        let character = null;
        if (userId === 'guest' && guestState) {
            character = guestState;
        } else {
            character = await getCharacter(userId, storyId, characterId);
        }

        if (!character.opportunityHands?.[deckId]) {
            return NextResponse.json({ error: 'Deck not found on character' }, { status: 404 });
        }

        character.opportunityHands[deckId] = character.opportunityHands[deckId].filter((id: any) => id !== cardId);
        
        if (userId !== 'guest') {
            await saveCharacterState(character);
        }
        
        const handIds = character.opportunityHands[deckId] || [];
        const allEvents = await getStorylets(storyId);
        const handDefinitions = handIds.map((id: string) => allEvents.find(e => e.id === id)).filter(Boolean);
        
        return NextResponse.json({ success: true, hand: handDefinitions });
    } catch (e: any) {
        return NextResponse.json({ message: "Failed to discard card" }, { status: 500 });
    }
}