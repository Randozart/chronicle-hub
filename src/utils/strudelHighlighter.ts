/**
 * strudelHighlighter.ts
 *
 * Syntax highlighter for Strudel source code as used in Chronicle Hub's
 * track editor. Strudel code is standard JavaScript, so we use PrismJS's
 * JavaScript grammar as the base and layer on a custom overlay for
 * {{expression}} ScribeScript template blocks.
 *
 * {{...}} blocks are split out before JS highlighting so PrismJS never
 * sees them — they get their own lightweight token highlighter that
 * recognises $var, $$var, numbers, operators, and the ScribeScript
 * conditional shorthand (condition : true | false).
 */

import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';

// ---------------------------------------------------------------------------
// HTML utilities
// ---------------------------------------------------------------------------

function esc(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Template expression highlighter
// Handles the content of {{...}} blocks.
// ---------------------------------------------------------------------------

/**
 * Tokenise and highlight a single template expression string.
 * Supports:
 *   $varName   — numeric quality level (blue)
 *   $$varName  — string quality value  (purple)
 *   numbers    — yellow
 *   :  |       — flow operators for conditional syntax (red, bold)
 *   ? and other operators — standard operator (dim)
 *   string literals — green
 *   identifiers — plain text
 */
function highlightTemplateExpr(expr: string): string {
    // Token regex — order matters (longer/more-specific first)
    const TOKEN_RE =
        /(\$\$[a-zA-Z_][a-zA-Z0-9_]*)|(\$[a-zA-Z_][a-zA-Z0-9_]*)|(\b\d+(?:\.\d+)?\b)|(&&|\|\|(?!=)|[=!<>]=|>>|<<)|([:?|])|(["'])(?:[^"'\\]|\\.)*?\6|([+\-*\/%^!&~<>(),. \t\n]+)|([a-zA-Z_][a-zA-Z0-9_]*)/g;

    return expr.replace(TOKEN_RE, (full, dvar, svar, num, op2, flowOp, _strDelim, misc, ident) => {
        if (dvar)    return `<span class="strudel-tmpl-dvar">${esc(dvar)}</span>`;
        if (svar)    return `<span class="strudel-tmpl-var">${esc(svar)}</span>`;
        if (num)     return `<span class="strudel-tmpl-num">${esc(num)}</span>`;
        if (op2)     return `<span class="strudel-tmpl-op">${esc(op2)}</span>`;
        if (flowOp)  return `<span class="strudel-tmpl-flow">${esc(flowOp)}</span>`;
        // string literals captured by the strDelim group — re-match full string
        if (_strDelim) {
            // The full match is the whole string literal
            return `<span class="strudel-tmpl-str">${esc(full)}</span>`;
        }
        if (ident)   return `<span class="strudel-tmpl-ident">${esc(ident)}</span>`;
        // misc punctuation / whitespace
        return esc(full);
    });
}

// ---------------------------------------------------------------------------
// Main highlighter
// ---------------------------------------------------------------------------

/**
 * Highlight a Strudel source string.
 *
 * Algorithm:
 *  1. Walk the code, splitting on {{...}} template blocks.
 *  2. For JS segments between templates: run PrismJS JavaScript grammar.
 *  3. For each {{...}} block: run our lightweight template token highlighter.
 *  4. Concatenate and return.
 *
 * This ensures PrismJS never sees partially-valid JS caused by the templates,
 * and the templates themselves get proper ScribeScript-aware colouring.
 */
export function highlightStrudel(code: string): string {
    if (!code) return '';

    // Ensure PrismJS JavaScript grammar is loaded
    if (!languages.javascript) {
        return esc(code); // fallback: plain escaped text
    }

    const parts: string[] = [];
    let lastIndex = 0;

    // Match {{...}} template blocks (non-greedy, allows newlines)
    const TMPL_RE = /\{\{([\s\S]*?)\}\}/g;
    let m: RegExpExecArray | null;

    while ((m = TMPL_RE.exec(code)) !== null) {
        // JS fragment before this template
        if (m.index > lastIndex) {
            const jsSlice = code.slice(lastIndex, m.index);
            parts.push(highlight(jsSlice, languages.javascript, 'javascript'));
        }

        // {{...}} block
        const innerExpr = m[1];
        parts.push(
            `<span class="strudel-tmpl-delim">{{</span>` +
            `<span class="strudel-tmpl-body">${highlightTemplateExpr(innerExpr)}</span>` +
            `<span class="strudel-tmpl-delim">}}</span>`,
        );

        lastIndex = m.index + m[0].length;
    }

    // Remaining JS after the last template (or whole string if no templates)
    if (lastIndex < code.length) {
        parts.push(highlight(code.slice(lastIndex), languages.javascript, 'javascript'));
    }

    return parts.join('');
}
