import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/engine/database';
import { Storylet, QualityDefinition, Opportunity, MarketDefinition, CharCreateRule } from '@/engine/models';
import { verifyWorldAccess } from '@/engine/accessControl';

const DB_NAME = process.env.MONGODB_DB_NAME || 'chronicle-hub-db';

type ConnectionItem = {
    id: string;
    name: string;
    type: 'storylet' | 'opportunity' | 'quality' | 'market' | 'system';
    reason: string;
};

// Helper: Escape ID for Regex safety
function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Robust Reference Checker
 * returns a "Reason" string if found, null otherwise.
 */
function checkReference(containerJSON: string, targetId: string): string | null {
    if (!containerJSON || !targetId) return null;
    
    const text = containerJSON.toLowerCase();
    const cleanId = targetId.toLowerCase();

    // 1. Fast Fail: If the string isn't there at all, exit.
    if (!text.includes(cleanId)) return null;

    // 2. Precise Checks to determine "Reason"
    
    // A. Logic Variable ($target, #target)
    // Matches $target followed by non-word char, or at end of string
    if (new RegExp(`[\\$#]${escapeRegExp(cleanId)}\\b`).test(text)) {
        return "Logic Reference ($)";
    }

    // B. Explicit Redirects or Keys ("target", 'target')
    // Matches quotes around the ID
    if (new RegExp(`["']${escapeRegExp(cleanId)}["']`).test(text)) {
        return "Direct Link / Redirect";
    }

    // C. Loose Text Mention
    // If it's in the description or name but not code
    return "Referenced in Text";
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const targetId = searchParams.get('id');

    if (!storyId || !targetId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // 1. Auth
    const canView = await verifyWorldAccess(storyId, 'writer');
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 2. Fetch World Data
    const [storylets, opportunities, qualities, markets, worldDoc] = await Promise.all([
        db.collection<Storylet>('storylets').find({ worldId: storyId }).toArray(),
        db.collection<Opportunity>('opportunities').find({ worldId: storyId }).toArray(),
        db.collection<QualityDefinition>('qualities').find({ worldId: storyId }).toArray(),
        db.collection<MarketDefinition>('markets').find({ worldId: storyId }).toArray(),
        db.collection('worlds').findOne({ worldId: storyId })
    ]);

    // 3. Prepare System Objects (Fixes Scope Issue)
    const charCreate = (worldDoc?.content?.char_create || {}) as Record<string, CharCreateRule>;

    const inbound: ConnectionItem[] = [];
    const outbound: ConnectionItem[] = [];

    // Helper to safely add unique items
    const add = (list: ConnectionItem[], id: string, name: string, type: ConnectionItem['type'], reason: string) => {
        if (id === targetId) return; // Don't link self
        if (!list.some(i => i.id === id)) {
            list.push({ id, name, type, reason });
        }
    };

    // 4. Find the Target Object (to scan for Outbound)
    const targetS = storylets.find(s => s.id === targetId) || opportunities.find(o => o.id === targetId);
    const targetQ = qualities.find(q => q.id === targetId);
    const targetM = markets.find(m => m.id === targetId);

    // Prepare the JSON dump of the target for Outbound scanning
    const targetDump = JSON.stringify(targetS || targetQ || targetM || {}).toLowerCase();

    // =========================================================================
    // LOOP: Check Every Entity in the World
    // =========================================================================
    
    // 1. Qualities (e.g. Items, Stats)
    for (const q of qualities) {
        if (q.id === targetId) continue;
        const qDump = JSON.stringify(q).toLowerCase();

        // INBOUND: Does Q reference Target?
        // (e.g. Cloak referencing Darkness in bonus)
        const inRef = checkReference(qDump, targetId);
        if (inRef) {
            let reason = inRef;
            if (q.bonus && q.bonus.toLowerCase().includes(targetId.toLowerCase())) reason = "Bonus Modifier";
            if (q.storylet === targetId) reason = "Use Event Trigger";
            add(inbound, q.id, q.name || q.id, 'quality', reason);
        }

        // OUTBOUND: Does Target reference Q?
        // (e.g. Storylet checking logic against Q)
        const outRef = checkReference(targetDump, q.id);
        if (outRef) {
            add(outbound, q.id, q.name || q.id, 'quality', outRef);
        }
    }

    // 2. Storylets & Opportunities
    const allEvents = [...storylets, ...opportunities];
    for (const s of allEvents) {
        if (s.id === targetId) continue;
        const sDump = JSON.stringify(s).toLowerCase();

        // INBOUND: Does Storylet reference Target?
        const inRef = checkReference(sDump, targetId);
        if (inRef) {
            let reason = inRef;
            // Refine reason for Storylets
            if (s.options?.some(o => o.pass_redirect === targetId || o.fail_redirect === targetId)) {
                reason = "Redirects Here";
            } else if (s.return === targetId) {
                reason = "Returns Here";
            } else if (targetQ && (
                (s as any).visible_if?.toLowerCase().includes(targetId.toLowerCase()) || 
                s.unlock_if?.toLowerCase().includes(targetId.toLowerCase())
            )) {
                reason = "Logic Requirement";
            }
            
            add(inbound, s.id, s.name || s.id, 'storylet', reason);
        }

        // OUTBOUND: Does Target reference Storylet?
        const outRef = checkReference(targetDump, s.id);
        if (outRef) {
            let reason = outRef;
            if (targetS) {
                if (targetS.options?.some(o => o.pass_redirect === s.id || o.fail_redirect === s.id)) {
                    reason = "Redirects To";
                }
            }
            add(outbound, s.id, s.name || s.id, 'storylet', reason);
        }
    }

    // 3. Markets
    for (const m of markets) {
        const mDump = JSON.stringify(m).toLowerCase();
        
        // INBOUND
        if (checkReference(mDump, targetId)) {
            add(inbound, m.id, m.name || m.id, 'market', "Market Listing/Currency");
        }

        // OUTBOUND (Target refers to Market ID)
        if (checkReference(targetDump, m.id)) {
            add(outbound, m.id, m.name || m.id, 'market', "Linked Market");
        }
    }

    // 4. System (Char Create)
    // Only Inbound usually (Char Create uses Stats)
    const charDump = JSON.stringify(charCreate).toLowerCase();
    if (checkReference(charDump, targetId)) {
        add(inbound, 'char_create', 'Character Creation', 'system', "Creation Rule");
    }

    return NextResponse.json({ inbound, outbound });
}