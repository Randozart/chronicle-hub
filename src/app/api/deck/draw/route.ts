import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache';
import { drawCards } from '@/engine/deckService'; // Import the service we just created
import { GameEngine } from '@/engine/gameEngine';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId, deckId } = await request.json(); 

    const gameData = await getContent(storyId);
    
    // We retrieve the character as a nullable type
    let character = await getCharacter(userId, storyId, characterId);

    // Explicit Null Check
    if (!character) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // 1. Resolve which deck to draw from
    let targetDeckId = deckId;
    
    // Fallback logic
    if (!targetDeckId) {
        const location = gameData.locations[character.currentLocationId];
        if (location && location.deck) {
            targetDeckId = location.deck.split(',')[0].trim();
        }
    }

    if (!targetDeckId || !gameData.decks[targetDeckId]) {
        return NextResponse.json({ message: 'No valid deck found here.' }, { status: 400 });
    }

    const deckDef = gameData.decks[targetDeckId];

    // 2. Action Cost Logic
    if (gameData.settings.deckDrawCostsAction !== false && gameData.settings.useActionEconomy) {
        // regenerateActions returns a non-null CharacterDocument if input was not null
        // We cast it to ensure TS understands character is not null here
        const regeneratedChar = await regenerateActions(character);
        if (!regeneratedChar) return NextResponse.json({ error: 'Error regenerating actions' }, { status: 500 });
        character = regeneratedChar;

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
        // character is guaranteed not null here
        character = await drawCards(character, targetDeckId, gameData);
        await saveCharacterState(character);
        
        // Ensure opportunityHands exists before accessing
        const hand = character.opportunityHands ? character.opportunityHands[targetDeckId] : [];
        return NextResponse.json({ success: true, hand });
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

    // Ensure the hand exists
    if (!character.opportunityHands || !character.opportunityHands[deckId]) {
        return NextResponse.json({ error: 'Deck not found on character' }, { status: 404 });
    }

    // Filter out the card
    const originalLength = character.opportunityHands[deckId].length;
    character.opportunityHands[deckId] = character.opportunityHands[deckId].filter(id => id !== cardId);

    if (character.opportunityHands[deckId].length === originalLength) {
        return NextResponse.json({ error: 'Card not found in hand' }, { status: 404 });
    }

    // Save
    await saveCharacterState(character);

    return NextResponse.json({ success: true, hand: character.opportunityHands[deckId] });
}