// src/engine/scribescript/utils.ts

/**
 * Removes blocks formatted as {// ... } before processing.
 * Respects nested braces inside comments to prevent early exit.
 */
export function sanitizeScribeScript(text: string): string {
    if (!text) return "";
    let buffer = "";
    let i = 0;
    let commentDepth = 0;

    while (i < text.length) {
        // Detect start of a Comment Block: "{" followed by "//"
        if (commentDepth === 0 && text[i] === '{' && i + 2 < text.length && text[i+1] === '/' && text[i+2] === '/') {
            commentDepth = 1;
            i += 3; 
            continue;
        }
        // While inside a comment, track depth
        if (commentDepth > 0) {
            if (text[i] === '{') commentDepth++;
            else if (text[i] === '}') commentDepth--;
            i++;
            continue;
        }
        buffer += text[i];
        i++;
    }
    return buffer;
}

/**
 * Helper to reduce trace noise.
 * Returns true if text is a simple number, boolean, or string literal without logic.
 */
export function isLiteral(text: string): boolean {
    const t = text.trim();
    if (!isNaN(Number(t))) return true; 
    if (t === 'true' || t === 'false' || t === 'null') return true;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return !t.includes('{');
    }
    return false;
}