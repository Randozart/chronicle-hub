import { NextRequest, NextResponse } from 'next/server';
import { getWorldConfig } from '@/engine/worldService';
import clientPromise from '@/engine/database'; // Import DB client

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 });

    // 1. Fetch Config (Cached)
    const config = await getWorldConfig(storyId);

    // 2. Fetch Root Data (Published status)
    // We need to hit the DB directly for this one field
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const world = await db.collection('worlds').findOne(
        { worldId: storyId }, 
        { projection: { published: 1 } }
    );

    // 3. Merge and Return
    return NextResponse.json({
        ...config.settings,
        isPublished: world?.published || false
    });
}