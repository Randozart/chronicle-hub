/**
 * Shared autofire eligibility selection used by both the server render
 * pipeline and the client-side guest flow.
 */
import { Storylet } from "@/engine/models";
import { GameEngine } from "@/engine/gameEngine";

const URGENCY_PRIORITY: Record<string, number> = { 'Must': 3, 'High': 2, 'Normal': 1 };

/// Storylet fields that live on the storage document but not every view type.
interface AutofireFields {
    autofire_if?: string;
    location?: string;
    urgency?: string;
}

/// Return the highest-urgency storylet with a non-empty autofire_if whose
/// location matches and whose condition currently evaluates true, or null.
export function findEligibleAutofire(
    engine: GameEngine,
    storyletDefs: Record<string, Storylet>,
    currentLocationId: string
): Storylet | null {
    const candidates = Object.values(storyletDefs).filter(s => {
        if ('deck' in s) return false;

        const fields = s as unknown as AutofireFields;
        const condition = fields.autofire_if;
        if (!condition || condition.trim() === "") return false;

        if (fields.location) {
            const locs = fields.location.split(',').map(l => l.trim()).filter(Boolean);
            if (!locs.includes(currentLocationId)) return false;
        }

        return engine.evaluateCondition(condition);
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        const aUrgency = (a as unknown as AutofireFields).urgency || 'Normal';
        const bUrgency = (b as unknown as AutofireFields).urgency || 'Normal';
        return (URGENCY_PRIORITY[bUrgency] || 1) - (URGENCY_PRIORITY[aUrgency] || 1);
    });
    return candidates[0];
}
