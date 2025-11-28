import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Fetch My Worlds
    const myWorlds = await db.collection('worlds')
        .find({ ownerId: userId })
        .project({ worldId: 1, title: 1, summary: 1, published: 1 })
        .toArray();

    // Fetch Worlds I Play (Optional: query characters collection for distinct storyIds)
    const playChars = await db.collection('characters')
        .find({ userId: userId })
        .project({ storyId: 1 })
        .toArray();
    
    // Get unique story IDs played
    const playedIds = Array.from(new Set(playChars.map(c => c.storyId)));
    
    // Fetch details for played worlds (excluding owned ones to avoid dupes if you play your own game)
    const playedWorlds = await db.collection('worlds')
        .find({ worldId: { $in: playedIds, $ne: myWorlds.map(w => w.worldId) } })
        .project({ worldId: 1, title: 1, summary: 1 })
        .toArray();

    return NextResponse.json({ myWorlds, playedWorlds });
}

// CREATE NEW WORLD
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { title, worldId } = await request.json();
    
    // Validate ID format (a-z, 0-9, _, -)
    if (!/^[a-z0-9_-]+$/.test(worldId)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Check uniqueness
    const existing = await db.collection('worlds').findOne({ worldId });
    if (existing) return NextResponse.json({ error: 'World ID taken' }, { status: 409 });

    // Create Template
    const newWorld = {
        worldId,
        ownerId: userId,
        title: title || worldId,
        published: false,
        createdAt: new Date(),
        settings: {
            useActionEconomy: true,
            maxActions: 20,
            actionId: "$actions",
            // ... defaults ...
        },
        content: {
            qualities: {},
            locations: {},
            decks: {},
            regions: {},
            images: {},
            char_create: {}
        }
    };

    await db.collection('worlds').insertOne(newWorld);
    
    return NextResponse.json({ success: true, worldId });
}