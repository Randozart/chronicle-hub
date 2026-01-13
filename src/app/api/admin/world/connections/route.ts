// src/app/api/admin/world/connections/route.ts
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

// Helper: robustly check if 'container' text refers to 'id'
function checkReference(container: string, id: string, type: 'quality' | 'storylet' | 'any'): string | null {
    if (!container) return null;
    
    const text = container.toLowerCase();
    const target = id.toLowerCase();

    // 1. Check for ScribeScript Sigils ($target, #target, @target)
    // Matches: $target, $target+, $target=, but not $targetIdentifier
    const sigilRegex = new RegExp(`[\\$#@]\\.?${escapeRegExp(target)}\\b`);
    if (sigilRegex.test(text)) return "Logic Reference";

    // 2. Check for Redirect/ID usage (Quotes or Word Boundaries)
    // Matches: "target", 'target', : target, :target
    // Useful for redirects: pass_redirect: "target"
    const idRegex = new RegExp(`['":\\s]${escapeRegExp(target)}['"\\s,}]`);
    if (idRegex.test(text)) return "Direct Reference";

    // 3. Strict Whole Word Match (fallback)
    const wordRegex = new RegExp(`\\b${escapeRegExp(target)}\\b`);
    if (wordRegex.test(text)) return "Text Reference";

    return null;
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const targetId = searchParams.get('id');

    if (!storyId || !targetId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const canView = await verifyWorldAccess(storyId, 'writer');
    if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const client = await clientPromise;
    const db = client.db(DB_NAME);

    // 1. Fetch World Data
    const [storylets, opportunities, qualities, markets, worldDoc] = await Promise.all([
        db.collection<Storylet>('storylets').find({ worldId: storyId }).toArray(),
        db.collection<Opportunity>('opportunities').find({ worldId: storyId }).toArray(),
        db.collection<QualityDefinition>('qualities').find({ worldId: storyId }).toArray(),
        db.collection<MarketDefinition>('markets').find({ worldId: storyId }).toArray(),
        db.collection('worlds').findOne({ worldId: storyId })
    ]);

    const inbound: ConnectionItem[] = [];
    const outbound: ConnectionItem[] = [];

    // Helper to push results
    const add = (list: ConnectionItem[], id: string, name: string, type: ConnectionItem['type'], reason: string) => {
        if (id === targetId) return;
        // Avoid duplicates
        if (!list.some(i => i.id === id)) {
            list.push({ id, name, type, reason });
        }
    };

    // 2. Identify Target
    const targetS = storylets.find(s => s.id === targetId) || opportunities.find(o => o.id === targetId);
    const targetQ = qualities.find(q => q.id === targetId);
    const targetM = markets.find(m => m.id === targetId);

    // =========================================================================
    // ANALYSIS: OUTBOUND (What does Target use?)
    // =========================================================================
    
    // Convert target to a searchable string
    const targetDump = JSON.stringify(targetS || targetQ || targetM || {}).toLowerCase();

    // A. Check against all Qualities
    for (const q of qualities) {
        if (q.id === targetId) continue;
        
        // Scan targetDump for this quality ID
        const ref = checkReference(targetDump, q.id, 'quality');
        if (ref) {
            add(outbound, q.id, q.name || q.id, 'quality', ref);
        }
    }

    // B. Check against all Storylets (Redirects)
    for (const s of storylets) {
        if (s.id === targetId) continue;
        
        // Scan targetDump for this storylet ID (mostly redirects)
        const ref = checkReference(targetDump, s.id, 'storylet');
        if (ref) {
            add(outbound, s.id, s.name || s.id, 'storylet', ref);
        }
    }

    // =========================================================================
    // ANALYSIS: INBOUND (Who uses Target?)
    // =========================================================================

    const cleanTargetId = targetId; // checkReference handles lowercase

    // A. Scan All Storylets/Opportunities
    const allEvents = [...storylets, ...opportunities];
    for (const node of allEvents) {
        if (node.id === targetId) continue;

        const sourceDump = JSON.stringify(node); // Keep case for specific field checks, lower inside helper
        const ref = checkReference(sourceDump, cleanTargetId, targetQ ? 'quality' : 'storylet');
        
        if (ref) {
            // Refine reason for better UI
            let detailedReason = ref;
            if (node.options?.some(o => o.pass_redirect === targetId || o.fail_redirect === targetId)) {
                detailedReason = "Redirects Here";
            }
            if (targetQ && node.options?.some(o => 
                (o.pass_quality_change && o.pass_quality_change.toLowerCase().includes(targetId.toLowerCase())) ||
                (o.fail_quality_change && o.fail_quality_change.toLowerCase().includes(targetId.toLowerCase()))
            )) {
                detailedReason = "Modifies Quality";
            }
            if (targetQ && (
                (node as any).visible_if?.toLowerCase().includes(targetId.toLowerCase()) || 
                (node as any).unlock_if?.toLowerCase().includes(targetId.toLowerCase())
            )) {
                detailedReason = "Logic Requirement";
            }

            add(inbound, node.id, node.name || node.id, 'storylet', detailedReason);
        }
    }

    // B. Scan All Qualities (e.g. Bonuses, Text Variants)
    for (const q of qualities) {
        if (q.id === targetId) continue;

        const sourceDump = JSON.stringify(q);
        const ref = checkReference(sourceDump, cleanTargetId, 'quality');
        
        if (ref) {
            let detailedReason = ref;
            if (q.bonus && checkReference(q.bonus, cleanTargetId, 'quality')) detailedReason = "Bonus Logic";
            add(inbound, q.id, q.name || q.id, 'quality', detailedReason);
        }
    }

    // C. Scan Markets
    for (const m of markets) {
        const sourceDump = JSON.stringify(m);
        if (checkReference(sourceDump, cleanTargetId, 'any')) {
            add(inbound, m.id, m.name || m.id, 'market', "Market Listing/Currency");
        }
    }

    // // D. Scan System (Char Create)
    // const charCreateDump = JSON.stringify(charCreate);
    // if (checkReference(charCreateDump, cleanTargetId, 'any')) {
    //     add(inbound, 'char_create', 'Character Creation', 'system', "Creation Rule");
    // }

    return NextResponse.json({ inbound, outbound });
}