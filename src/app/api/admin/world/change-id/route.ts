import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const { currentId, newId } = await request.json();
        
        if (!currentId || !newId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }
        
        const cleanNewId = newId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (cleanNewId !== newId || cleanNewId.length < 3) {
            return NextResponse.json({ error: 'Invalid ID format. Use a-z, 0-9, underscores, hyphens (min 3 chars).' }, { status: 400 });
        }
        
        if (cleanNewId === currentId) {
             return NextResponse.json({ success: true }); 
        }

        if (!await verifyWorldAccess(currentId, 'owner')) {
            return NextResponse.json({ error: 'Forbidden: Only the Owner can rename a world.' }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const existing = await db.collection('worlds').findOne({ worldId: cleanNewId });
        if (existing) {
            return NextResponse.json({ error: `The ID "${cleanNewId}" is already taken.` }, { status: 409 });
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
        } catch (txError) {
            console.error("Transaction failed:", txError);
            throw new Error("Database transaction failed. If running locally, ensure Replica Set is enabled.");
        } finally {
            await session.endSession();
        }

        return NextResponse.json({ success: true, newId: cleanNewId });

    } catch (e: any) {
        console.error("Change ID Error:", e);
        return NextResponse.json({ error: e.message || 'Migration failed' }, { status: 500 });
    }
}