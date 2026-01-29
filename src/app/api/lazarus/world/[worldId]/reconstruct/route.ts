import { NextRequest, NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import clientPromise from '@/engine/database';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string }> }
) {
    const { worldId } = await params;
    const { access } = await verifyLazarusAccess(worldId);
    
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    try {
        // 1. Reconstruct Qualities
        const qualities = await db.collection('lazarus_quality_evidence').aggregate([
            { $match: { world: worldId } },
            // Group by ID
            { $group: {
                _id: "$qualityId",
                // Prefer the name from non-inferred sources (full definitions)
                // We sort so that full definitions come first
                name: { $first: "$name" }, 
                
                // Collect ALL seen images for this quality
                images: { $addToSet: "$image" },
                
                nature: { $max: "$nature" },
                category: { $max: "$category" },
                cap: { $max: "$cap" },
                tag: { $max: "$tag" },
                
                variations: { 
                    $addToSet: { 
                        level: "$observedLevel", 
                        desc: "$description" 
                    } 
                },
                variationCount: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]).toArray();

        // 2. Reconstruct Geography
        const geography = await db.collection('lazarus_geography').aggregate([
            { $match: { world: worldId } },
            { $group: {
                _id: { id: "$id", type: "$type" },
                name: { $first: "$name" },
                description: { $first: "$description" },
                image: { $first: "$image" },
                raw: { $first: "$raw" }
            }},
            { $sort: { "_id.type": 1, "_id.id": 1 } }
        ]).toArray();

        return NextResponse.json({ 
            qualities, 
            geography 
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}