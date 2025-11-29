import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    // 1. Security Check
    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 2. Aggregation Pipeline
        // We grab characters for this story, then look up their human User details
        const players = await db.collection('characters').aggregate([
            { 
                $match: { storyId: storyId } 
            },
            {
                // Convert string userId to ObjectId for lookup
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
                $unwind: '$userInfo' 
            },
            {
                $project: {
                    _id: 0, // Hide internal DB ID
                    userId: 1,
                    username: '$userInfo.username',
                    email: '$userInfo.email',
                    location: '$currentLocationId',
                    lastActive: '$lastActionTimestamp',
                    // We can verify "Online" status by checking lastActive vs Now
                    actions: { $ifNull: ['$qualities.actions.level', 0] } // Extract actions if they exist
                }
            },
            { 
                $sort: { lastActive: -1 } // Most recent players first
            },
            { 
                $limit: 100 // Safety limit
            }
        ]).toArray();

        return NextResponse.json(players);

    } catch (e) {
        console.error("Error fetching players:", e);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}