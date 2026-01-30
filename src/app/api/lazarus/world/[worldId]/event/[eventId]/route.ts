import { NextRequest, NextResponse } from 'next/server';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import clientPromise from '@/engine/database';
import { calculateStateDiff } from '@/engine/lazarus/reconstruction';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ worldId: string, eventId: string }> }
) {
    const { worldId, eventId } = await params;
    const { access } = await verifyLazarusAccess(worldId);
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const id = parseInt(eventId);

    try {
        const variations = await db.collection('lazarus_evidence')
            .find({ world: worldId, eventId: id })
            .sort({ lastSeen: -1 })
            .toArray();

        const variationsWithLogic = await Promise.all(variations.map(async (v: any) => {
            if (!v.isHub) return v;

            const branches = [
                ...(v.rawPayload.OpenBranches || []),
                ...(v.rawPayload.LockedBranches || [])
            ];

            const branchesWithOutcomes = await Promise.all(branches.map(async (b: any) => {
                const outcomesRaw = await db.collection('lazarus_evidence')
                    .find({ world: worldId, parentBranchId: b.Id })
                    .toArray();

                const outcomes = outcomesRaw.map(out => ({
                    eventId: out.rawPayload.Event?.Id,
                    title: out.rawPayload.Event?.Name,
                    logic: calculateStateDiff(v.rawPayload, out.rawPayload),
                    evidenceId: out._id
                }));

                return { ...b, inferredOutcomes: outcomes, isSystem: b.Id >= 900000 };
            }));

            return { ...v, enrichedBranches: branchesWithOutcomes };
        }));

        return NextResponse.json({ variations: variationsWithLogic });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}