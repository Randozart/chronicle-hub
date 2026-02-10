import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const { storyId, action } = await request.json(); // action: 'schedule' | 'cancel'

        if (!storyId || !['schedule', 'cancel'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        // Only Owner can delete
        if (!await verifyWorldAccess(storyId, 'owner')) {
            return NextResponse.json({ error: 'Forbidden: Only the Owner can delete a world.' }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        let updateOp: any = {};
        let resultDate: Date | null = null;

        if (action === 'schedule') {
            const date = new Date();
            date.setDate(date.getDate() + 30); // 30 days from now
            resultDate = date;
            updateOp = { 
                $set: { 
                    "settings.deletionScheduledAt": date.toISOString(),
                    "deletionScheduledAt": date.toISOString() // Store at root for easy cron cleanup later
                } 
            };
        } else {
            updateOp = { 
                $unset: { 
                    "settings.deletionScheduledAt": "", 
                    "deletionScheduledAt": "" 
                } 
            };
        }

        await db.collection('worlds').updateOne({ worldId: storyId }, updateOp);

        return NextResponse.json({ 
            success: true, 
            deletionScheduledAt: resultDate ? resultDate.toISOString() : null 
        });

    } catch (error) {
        console.error("World deletion error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}