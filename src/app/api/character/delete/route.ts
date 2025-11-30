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
    
    // Security: Must match User ID and Character ID
    const result = await db.collection('characters').deleteOne({ 
        userId, 
        storyId, 
        characterId 
    });

    if (result.deletedCount === 1) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }
}