import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url); // <--- ADD THIS LINE
    const mode = searchParams.get('mode'); // 'my', 'played', 'discover'

    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);


    // Fetch My Worlds
    const myWorlds = await db.collection('worlds')
        .find({ ownerId: userId })
        .project({ 
            worldId: 1, 
            title: 1, 
            summary: 1, 
            published: 1, 
            coverImage: 1, 
            tags: 1, 
            'settings.visualTheme': 1 // <--- ADD THIS
        })
        .toArray();
    const playChars = await db.collection('characters')
        .find({ userId: userId })
        .project({ storyId: 1, qualities: 1 }) 
        .toArray();

    const charMap: Record<string, string> = {};
    playChars.forEach(c => {
        // SAFETY CHECK
        if (!c.qualities) return;
        
        // Try to find a name. 
        // You might have different keys in different games? 
        // Check "player_name", "name", "PlayerName", etc.
        // Or just grab the first String Quality found? No, that's risky.
        
        const nameState = c.qualities['player_name'] || c.qualities['name'];
        if (nameState && 'stringValue' in nameState) {
            charMap[c.storyId] = nameState.stringValue;
        } else {
            charMap[c.storyId] = "Unknown Drifter";
        }
    });

    // Get unique story IDs played
    const playedIds = Array.from(new Set(playChars.map(c => c.storyId)));
    
    // Fetch details for played worlds (excluding owned ones to avoid dupes if you play your own game)
    const playedWorlds = await db.collection('worlds')
        .find({ 
            worldId: { $in: playedIds, $ne: myWorlds.map(w => w.worldId) },
            published: true
        })
        .project({ worldId: 1, title: 1, summary: 1 })
        .toArray();

    const enrichedPlayedWorlds = playedWorlds.map(w => ({
        ...w,
        characterName: charMap[w.worldId] // Inject name
    }));

    if (mode === 'discover') {
        const worlds = await db.collection('worlds')
            .find({ published: true })
            .sort({ playerCount: -1, createdAt: -1 }) // Popularity sort
            .limit(20)
            .project({ worldId: 1, title: 1, summary: 1, coverImage: 1, 'settings.visualTheme': 1 })
            .toArray();
        return NextResponse.json(worlds);
    }

    return NextResponse.json({ 
        myWorlds, 
        playedWorlds: enrichedPlayedWorlds 
    });
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