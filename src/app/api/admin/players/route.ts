import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const players = await db.collection('characters').aggregate([
            { 
                $match: { storyId: storyId } 
            },
            {
                $addFields: {
                    userObjectId: { $toObjectId: "$userId" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userObjectId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { 
                $unwind: {
                    path: '$userInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: { $toString: "$_id" },
                    characterId: 1,
                    userId: 1,
                    username: { $ifNull: ['$userInfo.username', 'Unknown User'] },
                    email: { $ifNull: ['$userInfo.email', ''] },
                    name: 1,
                    qualities: 1,
                    location: '$currentLocationId',
                    lastActive: '$lastActionTimestamp',
                    actions: { $ifNull: ['$qualities.actions.level', 0] } 
                }
            },
            { 
                $sort: { lastActive: -1 } 
            },
            { 
                $limit: 100 
            }
        ]).toArray();

        return NextResponse.json(players);

    } catch (e) {
        console.error("Error fetching players:", e);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}