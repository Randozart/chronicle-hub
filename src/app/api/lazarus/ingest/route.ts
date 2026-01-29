import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { verifyLazarusAccess } from '@/engine/lazarusAccess';
import { generateEvidenceHash, normalizeText, detectWorldFromFilename } from '@/engine/lazarus/utils';
import { generateQualityHash, generateGeoHash, normalizeImage } from '@/engine/lazarus/hashing';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export async function POST(request: NextRequest) {
    const { access, role, allowedWorlds } = await verifyLazarusAccess();
    if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
        const body = await request.json();
        const { filename, batch } = body; 
        
        let world = body.world;
        if (!world && filename) world = detectWorldFromFilename(filename);

        if (!world || !batch || !Array.isArray(batch)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        if (role !== 'full' && !allowedWorlds.includes(world)) {
            return NextResponse.json({ error: 'Forbidden', status: 403 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Collections
        const eventCol = db.collection('lazarus_evidence');
        const qualityCol = db.collection('lazarus_quality_evidence');
        const geoCol = db.collection('lazarus_geography');

        const eventOps: any[] = [];
        const qualityOps: any[] = [];
        const geoOps: any[] = [];
        
        let skipped = 0;

        for (const line of batch) {
            if (!line.trim()) continue;
            let data;
            try { data = JSON.parse(line); } catch (e) { skipped++; continue; }

            if (data.type !== 'NETWORK' && data.type !== 'NETWORK_RESPONSE') {
                skipped++; continue;
            }

            const payload = data.payload || {};
            const evt = payload.Event;
            
            // 1. SCAVENGE GEOGRAPHY
            if (evt) {
                // Area
                if (evt.Area && evt.Area.Id) {
                    const areaHash = generateGeoHash(world, 'Area', evt.Area);
                    geoOps.push({
                        updateOne: {
                            filter: { contentHash: areaHash },
                            update: {
                                $setOnInsert: {
                                    world: world.toLowerCase(),
                                    type: 'Area',
                                    id: parseInt(evt.Area.Id),
                                    name: evt.Area.Name,
                                    description: evt.Area.Description,
                                    image: normalizeImage(evt.Area.ImageName),
                                    contentHash: areaHash,
                                    firstSeen: new Date(),
                                    raw: evt.Area // Store raw for safety
                                },
                                $set: { lastSeen: new Date() }
                            },
                            upsert: true
                        }
                    });
                }
                // Setting / Region
                if (evt.Setting && evt.Setting.Id) {
                    const settingHash = generateGeoHash(world, 'Setting', evt.Setting);
                    geoOps.push({
                        updateOne: {
                            filter: { contentHash: settingHash },
                            update: {
                                $setOnInsert: {
                                    world: world.toLowerCase(),
                                    type: 'Setting',
                                    id: parseInt(evt.Setting.Id),
                                    name: evt.Setting.Name,
                                    itemsUsable: evt.Setting.ItemsUsableHere,
                                    contentHash: settingHash,
                                    firstSeen: new Date(),
                                    raw: evt.Setting
                                },
                                $set: { lastSeen: new Date() }
                            },
                            upsert: true
                        }
                    });
                }
            }

            // 2. SCAVENGE QUALITIES
            // Helper to process a list of qualities from the dump
            const processQualities = (list: any[], sourceContext: string) => {
                if (!list || !Array.isArray(list)) return;
                for (const q of list) {
                    if (!q.Id) continue;
                    const qHash = generateQualityHash(world, q);
                    
                    qualityOps.push({
                        updateOne: {
                            filter: { contentHash: qHash },
                            update: {
                                $setOnInsert: {
                                    world: world.toLowerCase(),
                                    qualityId: parseInt(q.Id),
                                    name: q.Name,
                                    description: q.Description, // Capture level-specific descriptions here
                                    image: normalizeImage(q.Image || q.ImageName),
                                    nature: q.Nature, // 1=Stat, 2=Item?
                                    category: q.Category,
                                    cap: q.Cap,
                                    tag: q.Tag,
                                    
                                    // Capture the level this description was seen at
                                    observedLevel: q.Level || q.EffectiveLevel || 0,
                                    
                                    contentHash: qHash,
                                    firstSeen: new Date(),
                                    raw: q
                                },
                                $set: { lastSeen: new Date() },
                                $addToSet: { 
                                    observedContexts: sourceContext // Track where we saw it (inventory, stats, etc)
                                }
                            },
                            upsert: true
                        }
                    });
                }
            };

            // Scan all known quality locations in JSON
            processQualities(payload.MidPanelQualities, 'main_stats');
            processQualities(payload.OtherStatuses?.Story, 'story');
            processQualities(payload.OtherStatuses?.Accomplishment, 'accomplishment');
            processQualities(payload.InventoryItems, 'inventory');
            
            // Scan Messages for Quality Changes (often contains change text/images)
            if (payload.Messages && Array.isArray(payload.Messages)) {
                // Messages are tricky, they don't have IDs usually. 
                // We rely on the implicit link or just skip them for definition gathering 
                // if they lack IDs. 
                // However, Black Crown 'ChangeDescriptionText' suggests we might want to capture these strings later.
                // For now, let's stick to the explicit definition arrays.
            }


            // 3. SCAVENGE EVENTS
            if (evt && evt.Id) {
                const charName = data.character || payload.CharacterName || (payload.Character ? payload.Character.Name : "") || "";
                const eventId = parseInt(evt.Id);
                const contentHash = generateEvidenceHash(world, eventId, payload, charName);
                const rootEventId = payload.RootEventId ? parseInt(payload.RootEventId) : null;
                const parentBranchId = evt.ParentBranch?.Id ? parseInt(evt.ParentBranch.Id) : null;

                eventOps.push({
                    updateOne: {
                        filter: { contentHash: contentHash },
                        update: {
                            $setOnInsert: {
                                world: world.toLowerCase(),
                                eventId: eventId,
                                rootEventId: rootEventId,
                                parentBranchId: parentBranchId,
                                title: evt.Name,
                                image: normalizeImage(evt.Image),
                                urgency: evt.Urgency,
                                contentHash: contentHash,
                                rawPayload: payload,
                                firstSeen: new Date(),
                                sourceFile: filename || 'upload',
                                isResult: !!parentBranchId,
                                isHub: !parentBranchId && !!payload.OpenBranches?.length
                            },
                            $set: { lastSeen: new Date() }
                        },
                        upsert: true
                    }
                });
            }
        }

        // Execute Bulk Ops
        const results = { events: 0, qualities: 0, geo: 0 };
        
        if (eventOps.length > 0) {
            const r = await eventCol.bulkWrite(eventOps, { ordered: false });
            results.events = r.upsertedCount + r.matchedCount;
        }
        if (qualityOps.length > 0) {
            const r = await qualityCol.bulkWrite(qualityOps, { ordered: false });
            results.qualities = r.upsertedCount + r.matchedCount;
        }
        if (geoOps.length > 0) {
            const r = await geoCol.bulkWrite(geoOps, { ordered: false });
            results.geo = r.upsertedCount + r.matchedCount;
        }

        return NextResponse.json({ 
            success: true, 
            ...results,
            skipped 
        });

    } catch (e: any) {
        console.error("Lazarus Ingest Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}