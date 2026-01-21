// src/utils/themeUtils.ts

const colorCache = new Map<string, string>();

/**
 * Resolves a CSS variable string (e.g., "var(--accent-primary)") to its computed hex/rgb value.
 * Uses a cache to avoid excessive DOM lookups.
 * @param varString The CSS variable string.
 * @returns The resolved color string (e.g., "#61afef") or the original string if resolution fails.
 */
export function resolveCssVariable(varString: string): string {
    if (!varString || !varString.startsWith('var(')) {
        return varString;
    }

    if (colorCache.has(varString)) {
        return colorCache.get(varString)!;
    }
    const varName = varString.match(/--[\w-]+/)?.[0];
    if (!varName) {
        return varString;
    }
    if (typeof window === 'undefined') {
        return '#FFFFFF';
    }
    const resolvedColor = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    
    if (resolvedColor) {
        colorCache.set(varString, resolvedColor);
        return resolvedColor;
    }

    return varString;
}