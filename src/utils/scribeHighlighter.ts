/**
 * Helper to find if a bracket needs highlighting based on cursor position.
 * Returns a Set of indices to highlight.
 */
function getActiveBrackets(code: string, cursorIndex: number | null): Set<number> {
    const activeIndices = new Set<number>();
    if (cursorIndex === null) return activeIndices;

    const stack: { char: string; index: number }[] = [];
    const pairs: [number, number][] = [];

    // 1. Map all pairs
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        if (char === '{' || char === '[') {
            stack.push({ char, index: i });
        } else if (char === '}' || char === ']') {
            if (stack.length > 0) {
                const last = stack[stack.length - 1];
                if ((last.char === '{' && char === '}') || (last.char === '[' && char === ']')) {
                    stack.pop();
                    pairs.push([last.index, i]);
                }
            }
        }
    }

    // 2. Check if cursor triggers a pair
    // Logic: Cursor matches if it is "touching" the bracket (immediately before or after)
    for (const [open, close] of pairs) {
        const isTouchingOpen = cursorIndex === open || cursorIndex === open + 1;
        const isTouchingClose = cursorIndex === close || cursorIndex === close + 1;

        if (isTouchingOpen || isTouchingClose) {
            activeIndices.add(open);
            activeIndices.add(close);
            // We highlight the specific pair found. 
            // If you want to highlight only the innermost, you could break here, 
            // but this approach handles nested touches gracefully.
        }
    }

    return activeIndices;
}

/**
 * Stateful tokenizer for ScribeScript.
 * Detects nesting depth and assigns specific classes for theming.
 */
export function highlightScribeScript(code: string, cursorOffset: number | null = null): string {
    let html = '';
    let depth = 0;        // Tracks Curly Braces { ... }
    let bracketDepth = 0; // Tracks Square Brackets [ ... ]
    let buffer = '';

    // Calculate matched brackets based on cursor
    const matchedIndices = getActiveBrackets(code, cursorOffset);

    // Helper to escape HTML characters
    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Helper to flush plain text buffer
    const flush = () => {
        if (!buffer) return;
        
        // Depth 0 = Raw Text. Depth > 0 = Logic Mode.
        const className = depth === 0 ? 'ss-text-raw' : 'ss-operator';
        
        html += `<span class="${className}">${escapeHtml(buffer)}</span>`;
        buffer = '';
    };

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        
        // Check match status for this character
        const isMatch = matchedIndices.has(i);
        const matchClass = isMatch ? ' ss-brace-match' : '';

        // --- 1. BRACES (Depth Logic) ---
        if (char === '{') {
            flush();
            depth++;
            const depthClass = depth % 2 !== 0 ? 'ss-brace-odd' : 'ss-brace-even';
            html += `<span class="ss-brace ${depthClass}${matchClass}">{</span>`;
        } 
        else if (char === '}') {
            flush();
            const depthClass = depth % 2 !== 0 ? 'ss-brace-odd' : 'ss-brace-even';
            html += `<span class="ss-brace ${depthClass}${matchClass}">}</span>`;
            depth = Math.max(0, depth - 1);
        }

        // --- 2. VARIABLES ($, @, #) ---
        else if (depth > 0 && (char === '$' || char === '@' || char === '#')) {
            flush();
            
            // Special Case: ${...} Dynamic ID Marker
            if (char === '$' && code[i+1] === '{') {
                html += `<span class="ss-dynamic-marker">$</span>`;
                continue;
            }

            let varName = char;
            while(i+1 < code.length && /[a-zA-Z0-9_.]/.test(code[i+1])) {
                varName += code[++i];
            }
            
            let typeClass = 'ss-var-local';
            if (char === '@') typeClass = 'ss-var-alias';
            if (char === '#') typeClass = 'ss-var-world';
            
            html += `<span class="${typeClass}">${varName}</span>`;
        }

        // --- 3. MACROS (%) ---
        else if (depth > 0 && char === '%') {
            flush();
            let macroName = char;
            while(i+1 < code.length && /[a-zA-Z0-9_]/.test(code[i+1])) {
                macroName += code[++i];
            }
            html += `<span class="ss-macro">${macroName}</span>`;
        }

        // --- 4. METADATA & BRACKETS ([...]) ---
        else if (depth > 0 && char === '[') {
            flush();
            
            const ahead = code.substring(i, i + 10); 
            if (/\[\s*(desc|source|hidden)\s*:/.test(ahead)) {
                // Metadata: Consume completely
                let metaContent = '[';
                while(i+1 < code.length && code[i] !== ']') {
                    metaContent += code[++i];
                }
                html += `<span class="ss-metadata">${escapeHtml(metaContent)}</span>`;
            } else {
                // Standard Brackets
                html += `<span class="ss-bracket${matchClass}">[</span>`;
                bracketDepth++; 
            }
        }
        else if (depth > 0 && char === ']') {
            flush();
            html += `<span class="ss-bracket${matchClass}">]</span>`;
            bracketDepth = Math.max(0, bracketDepth - 1);
        }

        // --- 5. MACRO DELIMITERS (; and ,) ---
        // If we are inside [ ... ], style comma/semicolon as brackets
        else if (depth > 0 && bracketDepth > 0 && (char === ';' || char === ',')) {
            flush();
            html += `<span class="ss-bracket">${escapeHtml(char)}</span>`;
        }

        // --- 6. OPERATORS & NUMBERS ---
        else if (depth > 0) {
            // Numbers
            if (/[0-9]/.test(char) && !/[a-zA-Z]/.test(buffer)) {
                flush();
                let num = char;
                while(i+1 < code.length && /[0-9.]/.test(code[i+1])) {
                    num += code[++i];
                }
                html += `<span class="ss-number">${num}</span>`;
            } 
            // Operators
            else if (['=', ':', '|', '~', '>', '<', '!', '+', '-', '*', '/'].includes(char)) {
                flush();
                const isFlow = (char === '~' || char === ':' || char === '|');
                const opClass = isFlow ? 'ss-flow-op' : 'ss-operator';
                html += `<span class="${opClass}">${escapeHtml(char)}</span>`;
            }
            // Standard Comma (Effect separator)
            else if (char === ',') {
                flush();
                html += `<span class="ss-operator">,</span>`;
            }
            else {
                buffer += char;
            }
        }
        
        // --- 7. DEFAULT BUFFER ---
        else {
            buffer += char;
        }
    }
    
    flush();
    return html;
}