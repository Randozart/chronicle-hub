import crypto from 'crypto';


// Normalizes text by replacing the specific character name with a generic token.
// This ensures that "Hello, Wukong" and "Hello, Drifter" are recognized as the same text.
export function normalizeText(text: string | undefined | null, characterName: string): string {
    if (!text) return "";
    if (!characterName) return text;
    
    // Escape regex characters in the name (e.g. if name is "Mr. 2.0")
    const escapedName = characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedName, 'gi'); // Global, Case-insensitive
    
    return text.replace(regex, '[q:player_name]');
}


// Generates a deterministic hash for a specific narrative state.
// If this hash matches an existing record, we have already archived this exact variation.
export function generateEvidenceHash(world: string, eventId: number, payload: any, characterName: string): string {
    const evt = payload.Event || {};
    
    // This tells us the specific choice that triggered this result
    const parentBranchId = evt.ParentBranch?.Id || null;
    const rootEventId = payload.RootEventId || null;

    // We normalize all narrative text fields
    const normTitle = normalizeText(evt.Name, characterName);
    const normDesc = normalizeText(evt.Description, characterName);
    
    // Normalize options (Branches)
    const normBranches = (payload.OpenBranches || []).map((b: any) => ({
        id: b.Id,
        name: normalizeText(b.Name, characterName),
        desc: normalizeText(b.Description, characterName),
        // We include requirements in the hash because they define *why* this option appeared
        reqs: b.BranchRequirementsDescription || "" 
    }));

    // We allow "Locked" branches to influence the hash, as seeing a branch locked 
    // vs unlocked is a different narrative state.
    const normLocked = (payload.LockedBranches || []).map((b: any) => ({
        id: b.Id,
        name: normalizeText(b.Name, characterName)
    }));

    const signatureObj = {
        world: world.toLowerCase(),
        id: eventId,
        rootId: payload.RootEventId || null,
        parentBranchId: parentBranchId, 
        title: normTitle,
        desc: normDesc,
        branches: normBranches,
        locked: normLocked,
        img: evt.Image || ""
    };

    const stableString = JSON.stringify(signatureObj, Object.keys(signatureObj).sort());
    return crypto.createHash('sha256').update(stableString).digest('hex');
}


// Heuristic to detect World ID from filename
export function detectWorldFromFilename(filename: string): string | null {
    const lower = filename.toLowerCase();
    // Grab first word before separator
    const match = lower.match(/^([a-z0-9]+)/);
    return match ? match[1] : null;
}