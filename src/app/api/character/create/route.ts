// src/app/api/character/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter, getOrCreateCharacter } from '@/engine/characterService';

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

    const existingCharacter = await getCharacter(userId, storyId);
    if (existingCharacter) {
        return NextResponse.json({ error: 'Character already exists' }, { status: 409 });
    }

    // The getOrCreateCharacter function is now perfect for this,
    // but we need to modify it to accept the player's choices.
    // We will do this in the next step. For now, we'll assume it works.
    const newCharacter = await getOrCreateCharacter(userId, storyId, choices);

    if (newCharacter) {
        return NextResponse.json({ success: true, character: newCharacter });
    } else {
        return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
    }
}