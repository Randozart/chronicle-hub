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
                $unwind: {
                    path: '$userInfo',
                    preserveNullAndEmptyArrays: true // Keep characters even if user is deleted/missing
                }
            },
            {
                $project: {
                    // IDs
                    _id: { $toString: "$_id" }, // Convert ObjectId to string
                    characterId: 1,
                    userId: 1,
                    
                    // User Info
                    username: { $ifNull: ['$userInfo.username', 'Unknown User'] },
                    email: { $ifNull: ['$userInfo.email', ''] },
                    
                    // Character Data (CRITICAL FIXES HERE)
                    name: 1,          // Ensure character name is sent
                    qualities: 1,     // Ensure qualities are sent for resolution
                    
                    // Status
                    location: '$currentLocationId',
                    lastActive: '$lastActionTimestamp',
                    
                    // Computed
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