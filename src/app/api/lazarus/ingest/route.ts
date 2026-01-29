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

            // 1. SCAVENGE GEOGRAPHY ---
            if (evt) {
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
                                    raw: evt.Area 
                                },
                                $set: { lastSeen: new Date() }
                            },
                            upsert: true
                        }
                    });
                }
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
                                    description: q.Description, 
                                    image: normalizeImage(q.Image || q.ImageName),
                                    nature: q.Nature, 
                                    category: q.Category,
                                    cap: q.Cap,
                                    tag: q.Tag,
                                    observedLevel: q.Level || q.EffectiveLevel || 0,
                                    contentHash: qHash,
                                    firstSeen: new Date(),
                                    raw: q
                                },
                                $set: { lastSeen: new Date() },
                                $addToSet: { observedContexts: sourceContext }
                            },
                            upsert: true
                        }
                    });
                }
            };

            processQualities(payload.MidPanelQualities, 'main_stats');
            processQualities(payload.OtherStatuses?.Story, 'story');
            processQualities(payload.OtherStatuses?.Accomplishment, 'accomplishment');
            processQualities(payload.InventoryItems, 'inventory');
            
            const branches = [
                ...(payload.OpenBranches || []),
                ...(payload.LockedBranches || [])
            ];

            branches.forEach((b: any) => {
                const html = (b.BranchRequirementsDescription || "") + (b.BranchUnlockRequirementsDescription || "");
                if (!html) return;

                // Regex to capture src and data-edit ID.
                // It handles attributes in flexible order.
                const imgTagRegex = /<img\s+[^>]*>/g;
                const srcRegex = /src=["']([^"']+)["']/;
                const idRegex = /data-edit=["'](\d+)["']/;
                const altRegex = /alt=["']([^"']+)["']/; // Capture name from alt tag

                let match;
                while ((match = imgTagRegex.exec(html)) !== null) {
                    const imgTag = match[0];
                    const srcMatch = srcRegex.exec(imgTag);
                    const idMatch = idRegex.exec(imgTag);
                    const altMatch = altRegex.exec(imgTag);

                    if (srcMatch && idMatch) {
                        const image = normalizeImage(srcMatch[1]);
                        const qualityId = parseInt(idMatch[1]);
                        const name = altMatch ? altMatch[1] : undefined;

                        // Create a specific hash for this inferred connection
                        // We use a different context "html_inference" so it doesn't collide with full definitions
                        const inferenceHash = crypto.createHash('sha256').update(`${world}_inferred_${qualityId}_${image}`).digest('hex');

                        qualityOps.push({
                            updateOne: {
                                filter: { contentHash: inferenceHash },
                                update: {
                                    $setOnInsert: {
                                        world: world.toLowerCase(),
                                        qualityId: qualityId,
                                        name: name, // Might be partial or null
                                        image: image,
                                        // We don't know Nature/Category here, leave undefined
                                        contentHash: inferenceHash,
                                        firstSeen: new Date(),
                                        isInferred: true // Flag this as scraped data
                                    },
                                    $set: { lastSeen: new Date() },
                                    $addToSet: { observedContexts: 'html_inference' }
                                },
                                upsert: true
                            }
                        });
                    }
                }
            });


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

        return NextResponse.json({ success: true, ...results, skipped });

    } catch (e: any) {
        console.error("Lazarus Ingest Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

import crypto from 'crypto';