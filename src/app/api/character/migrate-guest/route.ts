import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { CharacterDocument } from '@/engine/models';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as any).id;
        const { storyId, guestCharacter } = await request.json();

        if (!storyId || !guestCharacter) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

        const existing = await db.collection('characters').findOne({ userId, storyId });
        if (existing) {
            return NextResponse.json({ error: 'Character already exists' }, { status: 409 });
        }

        const newCharacter: CharacterDocument = {
            ...guestCharacter,
            _id: undefined,
            userId: userId,
            storyId: storyId,
            qualities: guestCharacter.qualities || {},
            equipment: guestCharacter.equipment || {},
            currentLocationId: guestCharacter.currentLocationId,
            currentStoryletId: guestCharacter.currentStoryletId,
            opportunityHands: guestCharacter.opportunityHands || {},
            deckCharges: guestCharacter.deckCharges || {},
            pendingEvents: guestCharacter.pendingEvents || []
        };

        await db.collection('characters').insertOne(newCharacter);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}