import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getOrCreateCharacter } from '@/engine/characterService';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    
    const { storyId, choices } = await request.json();
    if (!storyId || !choices) {
        return NextResponse.json({ error: 'Missing storyId or choices' }, { status: 400 });
    }

    // PREVIOUSLY: We checked for existingCharacter here and returned 409.
    // NOW: We skip that check to allow multiple characters.

    try {
        // This always creates a NEW document with a unique characterId
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