import { NextRequest, NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string, eventId: string }> }
) {
    const { worldId, eventId } = await params;
    const { access } = await verifyLazarusAccess(worldId);
    
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const id = parseInt(eventId);

    try {
        const variations = await db.collection('lazarus_evidence')
            .find({ world: worldId, eventId: id })
            .sort({ lastSeen: -1 })
            .toArray();

        return NextResponse.json({ variations });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}