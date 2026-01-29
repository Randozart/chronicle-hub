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

// Normalizes S3 URLs to just the asset name.
// e.g. "//images.storynexus.../icons/mask.png" -> "mask"

export function normalizeImage(url: string | null | undefined): string {
    if (!url) return "";
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0]; // remove extension
}


// Fingerprint for a specific state of a Quality.
// Includes Level, because Name/Description often change based on Level.

export function generateQualityHash(world: string, q: any): string {
    const sig = {
        world: world.toLowerCase(),
        id: q.Id,
        name: q.Name || "",
        desc: q.Description || "", // Description often changes by level
        image: normalizeImage(q.Image || q.ImageName),
        // We include the "Change Message" if present (from Messages array)
        changeMsg: q.ChangeMessage || "", 
        // We capture the Level/Cap to help correlation later, but 
        // purely visual definitions might share hashes across levels.
        // For now, let's include Level in the hash so we map specific levels to specific descriptions.
        level: q.Level || q.EffectiveLevel || 0
    };
    
    // Deterministic string
    const s = JSON.stringify(sig, Object.keys(sig).sort());
    return crypto.createHash('sha256').update(s).digest('hex');
}


// Fingerprint for Geography (Areas/Settings)
export function generateGeoHash(world: string, type: 'Area' | 'Setting', data: any): string {
    const sig = {
        world: world.toLowerCase(),
        type,
        id: data.Id,
        name: data.Name || "",
        desc: data.Description || "",
        image: normalizeImage(data.ImageName || data.Image)
    };
    
    const s = JSON.stringify(sig, Object.keys(sig).sort());
    return crypto.createHash('sha256').update(s).digest('hex');
}