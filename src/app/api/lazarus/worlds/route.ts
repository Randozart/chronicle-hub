import { NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET() {
    const { access, role, allowedWorlds } = await verifyLazarusAccess();
    if (!access) return NextResponse.json({ worlds: [] });

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Query distinct worlds found in the evidence collection
        const allWorlds = await db.collection('lazarus_evidence').distinct('world');
        
        let visibleWorlds: string[] = [];

        if (role === 'full') {
            visibleWorlds = allWorlds;
        } else {
            // Filter based on user's specific access tags
            visibleWorlds = allWorlds.filter((w: string) => allowedWorlds.includes(w));
        }

        return NextResponse.json({ worlds: visibleWorlds.sort() });
    } catch (e) {
        console.error("Failed to list lazarus worlds:", e);
        return NextResponse.json({ worlds: [] });
    }
}