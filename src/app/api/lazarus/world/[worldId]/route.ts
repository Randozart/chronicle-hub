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
    
    if (!access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all'; // 'all', 'root', 'result'

    const skip = (page - 1) * limit;
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // Build Match Stage
    const matchStage: any = { world: worldId };
    
    if (search) {
        const isNum = !isNaN(parseInt(search));
        if (isNum) {
            matchStage.eventId = parseInt(search);
        } else {
            matchStage.title = { $regex: search, $options: 'i' };
        }
    }

    // Type Filtering
    // A "Root" event usually has no parentBranchId (it wasn't triggered by a button press)
    // A "Result" event has a parentBranchId (it came from a choice)
    if (type === 'root') {
        matchStage.parentBranchId = null;
    } else if (type === 'result') {
        matchStage.parentBranchId = { $ne: null };
    }

    try {
        // Pipeline: Group variations by Event ID to show a summary list
        const pipeline = [
            { $match: matchStage },
            { 
                $group: {
                    _id: "$eventId",
                    title: { $first: "$title" }, // Grab the first title found
                    variationCount: { $sum: 1 }, // How many unique hashes for this ID?
                    lastSeen: { $max: "$lastSeen" },
                    isRoot: { $max: { $cond: [{ $ifNull: ["$parentBranchId", false] }, 0, 1] } } // 1 if ANY variation is a root
                }
            },
            { $sort: { _id: 1 } }, // Sort by Event ID
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const result = await db.collection('lazarus_evidence').aggregate(pipeline).toArray();
        
        const total = result[0].metadata[0]?.total || 0;
        const events = result[0].data;

        return NextResponse.json({
            events,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (e: any) {
        console.error("Lazarus Query Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}