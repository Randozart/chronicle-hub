import crypto from 'crypto';


// Generates a deterministic hash for a Lazarus event instance.
// This determines if this exact variation has been seen before.

export function generateInstanceHash(world: string, eventId: number, payload: any): string {
    // We strictly select fields that define the "Narrative State"
    // We exclude timestamps, user IDs, or UI-state flags (like 'isExpanded')
    const signatureObj = {
        world,
        id: eventId,
        rootId: payload.RootEventId || null,
        title: payload.Event?.Name || "",
        desc: payload.Event?.Description || "",
        // We hash the options to ensure we capture branch variations
        options: (payload.OpenBranches || []).map((b: any) => ({
            id: b.Id,
            name: b.Name,
            desc: b.Description
        }))
    };

    // Sort keys to ensure deterministic JSON string
    const stableString = JSON.stringify(signatureObj, Object.keys(signatureObj).sort());
    
    return crypto.createHash('sha256').update(stableString).digest('hex');
}