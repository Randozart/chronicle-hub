// src/app/api/admin/world/change-id/route.ts
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const { currentId, newId } = await request.json();
        if (!currentId || !newId) return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        
        const cleanNewId = newId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (cleanNewId !== newId) return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        if (!await verifyWorldAccess(currentId, 'owner')) {
            return NextResponse.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const existing = await db.collection('worlds').findOne({ worldId: cleanNewId });
        if (existing) {
            return NextResponse.json({ error: 'World ID already exists.' }, { status: 409 });
        }
        const session = client.startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection('worlds').updateOne(
                    { worldId: currentId },
                    { $set: { worldId: cleanNewId } },
                    { session }
                );
                await db.collection('storylets').updateMany(
                    { worldId: currentId },
                    { $set: { worldId: cleanNewId } },
                    { session }
                );

                await db.collection('opportunities').updateMany(
                    { worldId: currentId },
                    { $set: { worldId: cleanNewId } },
                    { session }
                );
                await db.collection('characters').updateMany(
                    { storyId: currentId },
                    { $set: { storyId: cleanNewId } },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return NextResponse.json({ success: true, newId: cleanNewId });

    } catch (e) {
        console.error("Change ID Error:", e);
        return NextResponse.json({ error: 'Migration failed' }, { status: 500 });
    }
}