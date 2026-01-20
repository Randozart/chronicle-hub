import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'chronicle-hub-db');

    const totalUsers = await db.collection('users').countDocuments();
    const totalWorlds = await db.collection('worlds').countDocuments();
    const totalAssets = await db.collection('users').aggregate([
        { $unwind: "$assets" },
        { $count: "count" }
    ]).toArray();

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await db.collection('characters').distinct('userId', {
        lastActionTimestamp: { $gt: yesterday }
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const growthData = await db.collection('users').aggregate([
        { $match: { createdAt: { $gt: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]).toArray();

    return NextResponse.json({
        counts: {
            users: totalUsers,
            worlds: totalWorlds,
            assets: totalAssets[0]?.count || 0,
            dau: activeUsers.length
        },
        growth: growthData
    });
}