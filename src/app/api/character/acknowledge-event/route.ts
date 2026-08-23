import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { CharacterDocument } from '@/engine/models';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { storyId, characterId, instanceId, guestState } = body;

        if (!storyId || !instanceId) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        // Guests carry their whole character in the request body (same
        // convention as the resolve API); there is no DB document to load.
        const session = await getServerSession(authOptions);
        let character: CharacterDocument | null = null;
        let isGuest = false;

        if (!session?.user) {
            if (!guestState) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            character = guestState as CharacterDocument;
            isGuest = true;
        } else {
            const userId = (session.user as any).id;
            if (!characterId) {
                return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
            }
            character = await getCharacter(userId, storyId, characterId);
        }

        if (!character) {
            return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
        }

        if (character.pendingEvents) {
            const initialCount = character.pendingEvents.length;
            character.pendingEvents = character.pendingEvents.filter(e => e.instanceId !== instanceId);
            const removed = character.pendingEvents.length < initialCount;
            if (removed && !isGuest) {
                await saveCharacterState(character);
            }
        }

        return NextResponse.json({ success: true, character });

    } catch (error: any) {
        console.error("Acknowledge Event Error:", error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}
