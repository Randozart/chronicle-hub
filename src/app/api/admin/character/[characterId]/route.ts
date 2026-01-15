import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifyWorldAccess } from '@/engine/accessControl';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ characterId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const storyId = searchParams.get('storyId');
        
        if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

        const canView = await verifyWorldAccess(storyId, 'writer');
        if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const { characterId } = await params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const query: any = { storyId };
        
        if (ObjectId.isValid(characterId)) {
            query.$or = [
                { characterId: characterId },
                { _id: new ObjectId(characterId) }
            ];
        } else {
            query.characterId = characterId;
        }

        const character = await db.collection('characters').findOne(query);

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 });
        }
        return NextResponse.json(character);

    } catch (e) {
        console.error("Error fetching character details:", e);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}