import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache';
import { regenerateDeckCharges } from '@/engine/deckService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId } = await request.json();

    try {
        const gameData = await getContent(storyId);
        let character = await getCharacter(userId, storyId, characterId);

        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

        // Regenerate charges for ALL decks
        if (gameData.decks) {
            for (const deckId in gameData.decks) {
                character = regenerateDeckCharges(character, gameData.decks[deckId], gameData);
            }
        }

        await saveCharacterState(character);

        return NextResponse.json({ 
            success: true, 
            deckCharges: character.deckCharges,
            lastDeckUpdate: character.lastDeckUpdate 
        });

    } catch (e: any) {
        console.error("Deck Regen Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}