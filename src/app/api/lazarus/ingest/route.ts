import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import { generateEvidenceHash, normalizeText, detectWorldFromFilename } from '@/engine/lazarus/utils';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    // Security Check
    const { access, role, allowedWorlds } = await verifyLazarusAccess();
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const { filename, batch } = body; 
        
        let world = body.world;

        // Auto-detect world if not explicitly provided, or validate it
        if (!world && filename) {
            world = detectWorldFromFilename(filename);
        }

        if (!world || !batch || !Array.isArray(batch)) {
            return NextResponse.json({ error: 'Invalid payload: missing world or batch data' }, { status: 400 });
        }

        // Access Control: Ensure user is allowed to touch this world
        if (role !== 'full' && !allowedWorlds.includes(world)) {
            return NextResponse.json({ error: `Forbidden: No access to world '${world}'` }, { status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const evidenceCollection = db.collection('lazarus_evidence');

        const bulkOps = [];
        let skipped = 0;
        
        // We track quality updates separately if we want to build a dictionary later, 
        // but for now, we focus on the Events.

        for (const line of batch) {
            if (!line.trim()) continue;
            
            let data;
            try { data = JSON.parse(line); } catch (e) { skipped++; continue; }

            // StoryNexus format check
            if (data.type !== 'NETWORK' && data.type !== 'NETWORK_RESPONSE') {
                skipped++; continue;
            }

            const payload = data.payload || {};
            const evt = payload.Event;
            
            // We need a valid Event ID to anchor the evidence
            if (!evt || !evt.Id) {
                skipped++; continue;
            }

            // Extract Character Name for normalization
            // It appears in top-level 'character', or payload.Character.Name, or payload.CharacterName
            const charName = data.character || payload.CharacterName || (payload.Character ? payload.Character.Name : "") || "";

            const eventId = parseInt(evt.Id);
            const contentHash = generateEvidenceHash(world, eventId, payload, charName);
            const rootEventId = payload.RootEventId ? parseInt(payload.RootEventId) : null;
            
            // Determine if this is a "Result" of a previous branch
            // In StoryNexus, results often have a ParentBranch object
            const parentBranchId = payload.ParentBranch ? parseInt(payload.ParentBranch.Id) : null;

            // Normalize the raw payload description so we don't store PII (names) 
            // inside the "clean" copy, but we KEEP the structure intact.
            // Note: We are NOT recursively cleaning the whole object here for performance,
            // just the main text fields we identified in hashing.
            
            // To be truly lossless but safe, we just store the raw payload 

            bulkOps.push({
                updateOne: {
                    filter: { contentHash: contentHash },
                    update: {
                        $setOnInsert: {
                            world: world.toLowerCase(),
                            eventId: eventId,
                            rootEventId: rootEventId,
                            parentBranchId: parentBranchId, // Link to previous choice
                            
                            // Searchable Metadata
                            title: evt.Name,
                            image: evt.Image,
                            urgency: evt.Urgency,
                            
                            // The Content
                            contentHash: contentHash,
                            rawPayload: payload, // Lossless storage
                            
                            // Meta
                            firstSeen: new Date(),
                            sourceFile: filename || 'upload',
                            
                            // Flags
                            isChoice: !!payload.OpenBranches?.length,
                            isResult: !!parentBranchId
                        },
                        // We update 'lastSeen' so we know this data is still relevant/active in dumps
                        $set: {
                            lastSeen: new Date()
                        }
                    },
                    upsert: true
                }
            });
        }

        let inserted = 0;
        let matched = 0;

        if (bulkOps.length > 0) {
            const result = await evidenceCollection.bulkWrite(bulkOps, { ordered: false });
            inserted = result.upsertedCount;
            matched = result.matchedCount;
        }

        return NextResponse.json({ 
            success: true, 
            inserted, 
            matched, 
            skipped 
        });

    } catch (e: any) {
        console.error("Lazarus Ingest Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}