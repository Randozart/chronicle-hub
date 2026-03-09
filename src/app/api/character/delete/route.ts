import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import clientPromise from '@/engine/database';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { storyId, characterId } = await request.json();
    const userId = (session.user as any).id;

    if (!storyId || !characterId) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    let result;
    if (Array.isArray(characterId)) {
        console.log(`[API: DELETE /character/delete] User ${userId} deleting ${characterId.length} characters from story '${storyId}'.`);
        if (characterId.length === 0) return NextResponse.json({ error: 'Empty characterId array' }, { status: 400 });
        result = await db.collection('characters').deleteMany({
            userId,
            storyId,
            characterId: { $in: characterId }
        });
    } else {
        console.log(`[API: DELETE /character/delete] User ${userId} deleting character '${characterId}' from story '${storyId}'.`);
        result = await db.collection('characters').deleteOne({
            userId,
            storyId,
            characterId
        });
    }

    if (result.deletedCount > 0) {
        return NextResponse.json({ success: true, deletedCount: result.deletedCount });
    } else {
        return NextResponse.json({ error: 'Character(s) not found' }, { status: 404 });
    }
}