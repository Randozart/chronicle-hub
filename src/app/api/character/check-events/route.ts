import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState, checkLivingStories } from '@/engine/characterService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const { storyId, characterId } = await request.json();

    try {
        let character = await getCharacter(userId, storyId, characterId);
        if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        const updatedCharacter = await checkLivingStories(character);

        return NextResponse.json({ 
            success: true, 
            character: updatedCharacter 
        });

    } catch (e: any) {
        console.error("Check Events API Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}