/**
 * Normalized category matching for quality visibility filters.
 * Category strings on qualities are comma-separated; display lists come
 * from world settings. Both sides are trimmed and lowercased before
 * comparison so "Story", "story " and "STORY" all match.
 */

/// Split a comma-separated category string into normalized tokens.
export function normalizeCategoryList(raw: string | string[] | undefined | null): string[] {
    if (!raw) return [];
    const parts = Array.isArray(raw) ? raw : raw.split(",");
    return parts.map(p => p.trim().toLowerCase()).filter(Boolean);
}

/// True when the quality's categories include at least one of the wanted
/// categories. An empty wanted list means "no filter" (show everything),
/// matching the pre-648f9972 sidebar behaviour.
export function matchesAnyCategory(
    qualityCategories: string | string[] | undefined | null,
    wantedCategories: string | string[] | undefined | null
): boolean {
    const wanted = normalizeCategoryList(wantedCategories);
    if (wanted.length === 0) return true;
    const owned = normalizeCategoryList(qualityCategories);
    return owned.some(c => wanted.includes(c));
}
