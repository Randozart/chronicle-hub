'use client';

type ThemePalette = Record<string, string>;
type AllThemes = Record<string, ThemePalette>;

/**
 * Resolves a CSS variable string to its hex/rgb value using a pre-fetched theme object.
 * @param varString The CSS variable string (e.g., "var(--accent-primary)").
 * @param themeName The name of the target theme (e.g., "noir").
 * @param allThemes The complete object of all themes and their variables.
 * @returns The resolved color string (e.g., "#d9a404") or the original string if resolution fails.
 */
export function resolveCssVariable(
    varString: string,
    themeName: string,
    allThemes: AllThemes
): string {
    if (!varString || !varString.startsWith('var(')) {
        return varString;
    }

    const varName = varString.match(/--[\w-]+/)?.[0];
    if (!varName) {
        return varString;
    }

    const defaultPalette = allThemes[':root'] || {};
    const themePalette = allThemes[themeName] || {};

    const resolvedColor = themePalette[varName] || defaultPalette[varName];

    return resolvedColor || varString; 
}