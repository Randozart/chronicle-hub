import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState } from '@/engine/characterService';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { storyId, characterId, instanceId } = await request.json();

        if (!storyId || !characterId || !instanceId) {
            return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
        }

        let character = await getCharacter(userId, storyId, characterId);
        if (!character) {
            return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
        }

        if (character.pendingEvents) {
            const initialCount = character.pendingEvents.length;
            character.pendingEvents = character.pendingEvents.filter(e => e.instanceId !== instanceId);
            if (character.pendingEvents.length < initialCount) {
                await saveCharacterState(character);
            }
        }

        return NextResponse.json({ success: true, character });

    } catch (error: any) {
        console.error("Acknowledge Event Error:", error);
        return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 });
    }
}