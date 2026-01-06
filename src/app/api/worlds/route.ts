import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'my' or 'discover'

    const session = await getServerSession(authOptions);
    
    // SECURITY: Only block if trying to fetch private data ('my' worlds)
    // If accessing public API, allow through (middleware handles page protection)
    if (!session?.user && mode !== 'discover') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session?.user as any)?.id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. DISCOVER MODE (Public)
    if (mode === 'discover') {
        const worlds = await db.collection('worlds')
            .find({ published: true })
            .sort({ playerCount: -1, createdAt: -1 })
            .limit(20)
            .project({ 
                worldId: 1, title: 1, summary: 1, coverImage: 1, tags: 1, 
                'settings.visualTheme': 1,
                'settings.aiDisclaimer': 1, 
                'settings.attributions': 1 
            })
            .toArray();
        return NextResponse.json(worlds);
    }

    // 2. MY WORLDS & PLAYED WORLDS (Private)
    if (!userId) {
        return NextResponse.json({ myWorlds: [], playedWorlds: [] });
    }

    // --- CHANGE 1: Update Query to include Collaborations ---
    const myWorlds = await db.collection('worlds')
        .find({ /* ... */ })
        .project({ 
            worldId: 1, title: 1, summary: 1, published: 1, coverImage: 1, tags: 1, 
            'settings.visualTheme': 1, ownerId: 1,
            // ADD THESE TWO LINES:
            'settings.aiDisclaimer': 1, 
            'settings.attributions': 1 
        })
        .toArray();

    const playChars = await db.collection('characters')
        .find({ userId: userId })
        .project({ storyId: 1, qualities: 1 }) 
        .toArray();

    const charMap: Record<string, string> = {};
    playChars.forEach(c => {
        if (!c.qualities) return;
        const nameState = c.qualities['player_name'] || c.qualities['name'];
        if (nameState && 'stringValue' in nameState) {
            charMap[c.storyId] = nameState.stringValue;
        } else {
            charMap[c.storyId] = "Unknown Drifter";
        }
    });

    const playedIds = Array.from(new Set(playChars.map(c => c.storyId)));
    
    // Exclude worlds we own or collab on from the "Played" list
    const myWorldIds = myWorlds.map(w => w.worldId);
    
    const myWorldsWithUser = myWorlds.map(w => ({
        ...w,
        currentUserId: userId // Add this field
    }));

    const playedWorlds = await db.collection('worlds')
        .find({ /* ... */ })
        .project({ 
            worldId: 1, title: 1, summary: 1, coverImage: 1, 
            'settings.visualTheme': 1,
            'settings.aiDisclaimer': 1, 
            'settings.attributions': 1 
        })
        .toArray();

    const enrichedPlayedWorlds = playedWorlds.map(w => ({
        ...w,
        characterName: charMap[w.worldId]
    }));

    return NextResponse.json({ 
        myWorlds: myWorldsWithUser, 
        playedWorlds: enrichedPlayedWorlds 
    });
}

// CREATE NEW WORLD
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { title, worldId } = await request.json();
    
    if (!/^[a-z0-9_-]+$/.test(worldId)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const existing = await db.collection('worlds').findOne({ worldId });
    if (existing) return NextResponse.json({ error: 'World ID taken' }, { status: 409 });

    // --- CHANGE 2: Add Default Settings for new schema ---
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
            defaultActionCost: 1,     // <--- NEW DEFAULT
            currencyQualities: [],    // <--- NEW DEFAULT
        },
        content: {
            qualities: {},
            locations: {},
            decks: {},
            regions: {},
            images: {},
            char_create: {}
        },
        collaborators: [], // <--- Initialize array
        worldState: {}, // <--- Init empty
    };

    await db.collection('worlds').insertOne(newWorld);
    
    return NextResponse.json({ success: true, worldId });
}