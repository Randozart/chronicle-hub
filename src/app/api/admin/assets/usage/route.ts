import { NextRequest, NextResponse } from 'next/server';
import { verifyWorldAccess } from '@/engine/accessControl';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const assetId = searchParams.get('assetId'); 

    if (!storyId || !await verifyWorldAccess(storyId, 'writer')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    if (assetId) {
        const regex = new RegExp(`\\b${assetId}\\b`);
        
        const inStorylets = await db.collection('storylets').countDocuments({ 
            worldId: storyId, 
            $or: [{ image_code: assetId }, { text: regex }] 
        });
        
        const inCards = await db.collection('opportunities').countDocuments({ 
            worldId: storyId, 
            $or: [{ image_code: assetId }, { text: regex }] 
        });

        const worldDoc = await db.collection('worlds').findOne({ worldId: storyId });
        const worldStr = JSON.stringify(worldDoc?.content || {});
        const inConfig = worldStr.includes(`"${assetId}"`) ? 1 : 0;

        return NextResponse.json({ used: inStorylets + inCards + inConfig > 0 });
    }
    const usedImages = new Set<string>();

    const storylets = await db.collection('storylets').find({ worldId: storyId }, { projection: { image_code: 1 } }).toArray();
    storylets.forEach(s => { if(s.image_code) usedImages.add(s.image_code); });

    const cards = await db.collection('opportunities').find({ worldId: storyId }, { projection: { image_code: 1 } }).toArray();
    cards.forEach(c => { if(c.image_code) usedImages.add(c.image_code); });

    const world = await db.collection('worlds').findOne({ worldId: storyId });
    if(world && world.content) {
        Object.values(world.content.locations || {}).forEach((l: any) => { if(l.image) usedImages.add(l.image); });
        Object.values(world.content.qualities || {}).forEach((q: any) => { if(q.image) usedImages.add(q.image); });
    }

    return NextResponse.json({ usedIds: Array.from(usedImages) });
}