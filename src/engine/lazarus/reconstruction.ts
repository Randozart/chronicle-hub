import clientPromise from '@/engine/database';
import { normalizeImage } from '@/engine/lazarus/hashing';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

export interface StateChange {
    qualityId: number;
    name: string;
    category: string; 
    before: number;
    after: number;
    diff: number;
    isSystem?: boolean;
}

export interface ReconstructedBranch {
    Id: number;
    Name: string;
    Description: string;
    Image?: string;
    ButtonText?: string;
    Requirements: {
        raw: string;
        parsed: { qualityId: number; op: string; value: number }[];
    };
    Outcomes: {
        eventId: number;
        title: string;
        isSuccess: boolean;
        logic: {
            diffs: StateChange[];
            messages: string[];
        };
        evidenceId: string;
    }[];
    isSystem: boolean;
}

export interface ReconstructedEvent {
    Id: number;
    Name: string;
    Description: string;
    Image: string;
    Deck?: string;
    Branches: ReconstructedBranch[];
}

/**
 * 1. LOGIC INFERENCE (DIFFING)
 * Compares two player state snapshots to find what changed.
 * ADAPTED FROM WUKONG.JS: Includes Slots and Laterals.
 */
export function calculateStateDiff(startPayload: any, endPayload: any): { 
    diffs: StateChange[], 
    messages: string[] 
} {
    const diffs: StateChange[] = [];
    const messages: string[] = [];
    if (!startPayload || !endPayload) return { diffs: [], messages: [] };

    // 1. Capture Literal Messages from the result
    if (endPayload.Messages) {
        endPayload.Messages.forEach((m: any) => {
            if (m.Message) messages.push(m.Message);
        });
    }

    // 2. Numerical Diff logic
    const flattenState = (payload: any) => {
        const state = new Map<number, { level: number, name: string, category: string }>();
        
        const process = (list: any, cat: string) => {
            if (!list) return;
            const arr = Array.isArray(list) ? list : Object.values(list).flat();
            arr.forEach((q: any) => {
                if (q && q.Id) {
                    const val = q.EffectiveLevel !== undefined ? q.EffectiveLevel : (q.Level || 0);
                    state.set(parseInt(q.Id), { 
                        level: parseInt(val), 
                        name: q.Name, 
                        category: cat 
                    });
                }
            });
        };

        process(payload.MidPanelQualities, 'Main');
        process(payload.InventoryItems, 'Inventory');
        process(payload.MajorLaterals, 'Major');
        process(payload.MinorLaterals, 'Minor');
        
        if (payload.OtherStatuses) {
            Object.entries(payload.OtherStatuses).forEach(([cat, list]) => process(list, cat));
        }

        if (payload.InventorySlots) {
            payload.InventorySlots.forEach((slot: any) => {
                if (slot.SlotContents) process(slot.SlotContents, 'Equipped');
            });
        }
        
        return state;
    };

    const startState = flattenState(startPayload);
    const endState = flattenState(endPayload);

    // If result payload is empty of state data, we rely on Messages alone
    if (endState.size === 0) return { diffs: [], messages };

    endState.forEach((endData, id) => {
        const startData = startState.get(id);
        const startLevel = startData ? startData.level : 0;
        
        if (endData.level !== startLevel) {
            diffs.push({
                qualityId: id,
                name: endData.name,
                category: endData.category,
                before: startLevel,
                after: endData.level,
                diff: endData.level - startLevel
            });
        }
    });

    return { diffs, messages };
}

// 2. REQUIREMENTS PARSING

export function parseRequirements(html: string) {
    const parsed: { qualityId: number; op: string; value: number }[] = [];
    if (!html) return parsed;

    // Regex to extract Quality ID from data-edit attribute
    const regex = /data-edit=["'](\d+)["']/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        parsed.push({
            qualityId: parseInt(match[1]),
            op: '?', 
            value: 0 
        });
    }

    return parsed;
}

// 3. EVENT RECONSTRUCTION

export async function reconstructWorldData(worldId: string): Promise<{ events: ReconstructedEvent[], qualities: any[], geography: any[] }> {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    console.log(`[Reconstruction] Starting for ${worldId}...`);

    // A. QUALITIES
    const qualities = await db.collection('lazarus_quality_evidence').aggregate([
        { $match: { world: worldId } },
        { $group: {
            _id: "$qualityId",
            name: { $first: "$name" },
            images: { $addToSet: "$image" },
            nature: { $max: "$nature" },
            category: { $max: "$category" },
            cap: { $max: "$cap" },
            // Collect all variations to reconstruct LevelDescriptionText
            variations: { $addToSet: { level: "$observedLevel", desc: "$description" } }
        }},
        { $sort: { _id: 1 } }
    ]).toArray();

    // B. GEOGRAPHY
    const geography = await db.collection('lazarus_geography').aggregate([
        { $match: { world: worldId } },
        { $group: {
            _id: { id: "$id", type: "$type" },
            name: { $first: "$name" },
            description: { $first: "$description" },
            image: { $first: "$image" },
            raw: { $first: "$raw" }
        }}
    ]).toArray();

    // C. EVENTS
    const hubEvidence = await db.collection('lazarus_evidence')
        .find({ world: worldId, isHub: true })
        .toArray();

    // Deduplicate Hubs
    const hubMap = new Map<number, any>();
    hubEvidence.forEach((ev: any) => {
        const id = ev.eventId;
        if (!hubMap.has(id) || new Date(ev.lastSeen) > new Date(hubMap.get(id).lastSeen)) {
            hubMap.set(id, ev);
        }
    });

    const reconstructedEvents: ReconstructedEvent[] = [];

    for (const [eventId, hubRecord] of Array.from(hubMap.entries())) {
        const evtData = hubRecord.rawPayload.Event || {};
        const branchesRaw = [
            ...(hubRecord.rawPayload.OpenBranches || []),
            ...(hubRecord.rawPayload.LockedBranches || [])
        ];

        const reconstructedBranches: ReconstructedBranch[] = [];

        for (const b of branchesRaw) {
            const branchId = b.Id;
            
            // Find Outcomes in the database
            const outcomesRaw = await db.collection('lazarus_evidence')
                .find({ world: worldId, parentBranchId: branchId })
                .toArray();

            const outcomesProcessed = outcomesRaw.map((out: any) => {
                // Calculate and store state changes (diffs + messages)
                const logic = calculateStateDiff(hubRecord.rawPayload, out.rawPayload);
                const outEvt = out.rawPayload.Event || {};
                
                return {
                    eventId: outEvt.Id,
                    title: outEvt.Name,
                    isSuccess: true, 
                    logic: logic, 
                    evidenceId: out._id.toString()
                };
            });

            const reqHtml = (b.BranchRequirementsDescription || "") + (b.BranchUnlockRequirementsDescription || "");
            
            reconstructedBranches.push({
                Id: branchId,
                Name: b.Name,
                Description: b.Description,
                Image: normalizeImage(b.Image),
                ButtonText: b.ButtonText,
                isSystem: branchId >= 900000,
                Requirements: {
                    raw: reqHtml,
                    parsed: parseRequirements(reqHtml)
                },
                Outcomes: outcomesProcessed
            });
        }

        reconstructedEvents.push({
            Id: eventId,
            Name: evtData.Name,
            Description: evtData.Description,
            Image: normalizeImage(evtData.Image),
            Deck: evtData.Deck?.Name,
            Branches: reconstructedBranches
        });
    }

    return {
        events: reconstructedEvents,
        qualities,
        geography
    };
}