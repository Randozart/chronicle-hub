import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getContent, getStorylets } from '@/engine/contentCache'; // Import getStorylets
import { drawCards } from '@/engine/deckService';
import { GameEngine } from '@/engine/gameEngine';
import { Opportunity } from '@/engine/models';

// DRAW CARD
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId, deckId } = await request.json(); 

    const gameData = await getContent(storyId);
    let character = await getCharacter(userId, storyId, characterId);

    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

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

    // 2. Action Cost Logic
    if (gameData.settings.deckDrawCostsAction !== false && gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
        if (!character) return NextResponse.json({ error: 'Character load failed' }, { status: 500 });

        const engine = new GameEngine(character.qualities, gameData, character.equipment);
        let costExpr = deckDef.draw_cost || gameData.settings.defaultDrawCost || "1";
        const costVal = parseInt(engine.evaluateText(`{${costExpr}}`), 10) || 1;

        const actionQid = gameData.settings.actionId.replace('$', '');
        if (engine.getEffectiveLevel(actionQid) < costVal) {
            return NextResponse.json({ message: 'Not enough actions.' }, { status: 400 });
        }
        
        engine.applyEffects(`$${actionQid} -= ${costVal}`);
        character.qualities = engine.getQualities();
        character.lastActionTimestamp = new Date();
    }

    // 3. Draw
    try {
        character = await drawCards(character, targetDeckId, gameData);
        await saveCharacterState(character);
        
        const handIds = character.opportunityHands[targetDeckId] || [];
        const allEvents = await getStorylets(storyId);
        const handDefinitions = handIds.map(id => allEvents.find(e => e.id === id)).filter(Boolean);

        return NextResponse.json({ 
            success: true, 
            hand: handDefinitions,
            newQualities: character.qualities 
        });
    } catch (e: any) {
        return NextResponse.json({ message: e.message || "Failed to draw card" }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId, cardId, deckId } = await request.json();

    if (!storyId || !characterId || !cardId || !deckId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const character = await getCharacter(userId, storyId, characterId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    if (!character.opportunityHands?.[deckId]) {
        return NextResponse.json({ error: 'Deck not found on character' }, { status: 404 });
    }

    character.opportunityHands[deckId] = character.opportunityHands[deckId].filter(id => id !== cardId);
    await saveCharacterState(character);

    const handIds = character.opportunityHands[deckId] || [];
    const allEvents = await getStorylets(storyId);
    const handDefinitions = handIds.map(id => allEvents.find(e => e.id === id)).filter(Boolean);

    return NextResponse.json({ success: true, hand: handDefinitions });
}