// src/engine/scribescript/utils.ts
export function sanitizeScribeScript(text: string): string {
    if (!text) return "";
    let buffer = "";
    let i = 0;
    let commentDepth = 0;

    while (i < text.length) {
        if (commentDepth === 0 && text[i] === '{' && i + 2 < text.length && text[i+1] === '/' && text[i+2] === '/') {
            commentDepth = 1;
            i += 3; 
            continue;
        }
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
export function isLiteral(text: string): boolean {
    const t = text.trim();
    if (!isNaN(Number(t))) return true; 
    if (t === 'true' || t === 'false' || t === 'null') return true;
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
        return !t.includes('{');
    }
    return false;
}