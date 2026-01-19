import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/engine/database';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const session = await getServerSession(authOptions);
    
    if (!session?.user && mode !== 'discover') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session?.user as any)?.id;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const enrichWorlds = async (worlds: any[]) => {
        if (worlds.length === 0) return [];
        const userIds = new Set<string>();
        worlds.forEach(w => {
            if (w.ownerId) userIds.add(w.ownerId);
            if (w.collaborators) {
                w.collaborators.forEach((c: any) => userIds.add(c.userId));
            }
        });
        const objectIds = Array.from(userIds).map(id => new ObjectId(id));
        const users = await db.collection('users').find(
            { _id: { $in: objectIds } },
            { projection: { username: 1, image: 1 } }
        ).toArray();

        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        return worlds.map(w => {
            const owner = userMap.get(w.ownerId);
            const enrichedCollaborators = (w.collaborators || []).map((c: any) => {
                const u = userMap.get(c.userId);
                return { ...c, username: u?.username || "Drifter", image: u?.image };
            });

            return {
                ...w,
                ownerName: owner?.username || "Unknown Architect",
                ownerImage: owner?.image,
                collaborators: enrichedCollaborators
            };
        });
    };

    if (mode === 'discover') {
        const rawWorlds = await db.collection('worlds')
            .find({ 
                published: true,
                "contentConfig.erotica": { $ne: true } 
            })
            .sort({ playerCount: -1, createdAt: -1 })
            .limit(20)
            .project({ 
                worldId: 1, title: 1, summary: 1, coverImage: 1, tags: 1, ownerId: 1, collaborators: 1,
                contentConfig: 1, 
                'settings.visualTheme': 1,
                'settings.aiDisclaimer': 1, 
                'settings.attributions': 1 
            })
            .toArray();

        const enriched = await enrichWorlds(rawWorlds);
        return NextResponse.json(enriched);
    }

    if (!userId) {
        return NextResponse.json({ myWorlds: [], playedWorlds: [] });
    }

    try {
        const rawMyWorlds = await db.collection('worlds')
            .find({ 
                $or: [
                    { ownerId: userId },
                    { "collaborators.userId": userId } 
                ]
            })
            .project({ 
                worldId: 1, title: 1, summary: 1, published: 1, coverImage: 1, tags: 1, ownerId: 1, collaborators: 1,
                contentConfig: 1, 
                'settings.visualTheme': 1,
                'settings.aiDisclaimer': 1, 'settings.attributions': 1 
            })
            .toArray();
        const myWorlds = await enrichWorlds(rawMyWorlds);
        const myWorldsWithUser = myWorlds.map(w => ({ ...w, currentUserId: userId }));

        const playChars = await db.collection('characters')
            .find({ userId: userId })
            .project({ storyId: 1, qualities: 1 }) 
            .toArray();

        const charMap: Record<string, string> = {};
        (playChars || []).forEach(c => {
            if (!c.qualities) return;
            const nameState = c.qualities['player_name'] || c.qualities['name'];
            if (nameState && 'stringValue' in nameState) {
                charMap[c.storyId] = (nameState as any).stringValue;
            } else {
                charMap[c.storyId] = "Unknown Drifter";
            }
        });

        const playedIds = Array.from(new Set((playChars || []).map(c => c.storyId)));
        const myWorldIds = myWorlds.map(w => w.worldId);
        
        const rawPlayedWorlds = await db.collection('worlds')
            .find({ 
                worldId: { $in: playedIds, $nin: myWorldIds },
                published: true
            })
            .project({ 
                worldId: 1, title: 1, summary: 1, coverImage: 1, ownerId: 1,
                contentConfig: 1, 
                'settings.visualTheme': 1,
                'settings.aiDisclaimer': 1, 'settings.attributions': 1 
            })
            .toArray();
        const playedWorlds = await enrichWorlds(rawPlayedWorlds);

        const enrichedPlayedWorlds = playedWorlds.map(w => ({
            ...w,
            characterName: charMap[w.worldId]
        }));
        
        return NextResponse.json({ 
            myWorlds: myWorldsWithUser || [], 
            playedWorlds: enrichedPlayedWorlds || [] 
        });

    } catch (error) {
        console.error("Error fetching worlds:", error);
        return NextResponse.json({ myWorlds: [], playedWorlds: [] }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const { title, worldId } = await request.json();
    console.log(`[API: POST /worlds] User ${userId} creating new world. Title: '${title}', ID: '${worldId}'.`);

    if (!/^[a-z0-9_-]+$/.test(worldId)) {
        return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const existing = await db.collection('worlds').findOne({ worldId });
    if (existing) return NextResponse.json({ error: 'World ID taken' }, { status: 409 });

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
            defaultActionCost: 1,
            currencyQualities: [],
        },
        content: {
            qualities: {},
            locations: {},
            decks: {},
            regions: {},
            images: {},
            char_create: {}
        },
        collaborators: [],
        worldState: {},
    };

    await db.collection('worlds').insertOne(newWorld);
    
    return NextResponse.json({ success: true, worldId });
}