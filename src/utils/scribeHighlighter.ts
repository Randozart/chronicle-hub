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
    let depth = 0;        
    let bracketDepth = 0; 
    let buffer = '';
    
    const braceStyleStack: boolean[] = []; 

    const matchedIndices = getActiveBrackets(code, cursorOffset);

    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const flush = () => {
        if (!buffer) return;
        
        // 1. Escape the raw text first (Security)
        let content = escapeHtml(buffer);
        let className = 'ss-operator'; // Default for Logic Mode

        // --- MARKDOWN LOGIC (Only in Depth 0 / Text Mode) ---
        if (depth === 0) {
            className = 'ss-text-raw';
            
            // Regex Breakdown:
            // 1. (**...**)  : Bold
            // 2. (*...*)    : Italic (Star) - Standard rules
            // 3. (_..._)    : Italic (Underscore) - STRICTER RULE
            //    (?:^|[^a-zA-Z0-9])  -> Must start at line start OR after non-alphanumeric (space, punctuation)
            //    _[^_]+_             -> The italic content
            //    (?![a-zA-Z0-9])     -> Must not be followed by alphanumeric
            
            content = content.replace(/(\*\*[^*]+\*\*)|(\*[^*]+\*)|((?:^|[^a-zA-Z0-9])_[^_]+_(?![a-zA-Z0-9]))/g, (match, p1, p2, p3) => {
                // Bold (**bold**)
                if (p1) return `<span class="ss-md-bold">${p1}</span>`;
                
                // Italic (*italic*)
                if (p2) return `<span class="ss-md-italic">${p2}</span>`;
                
                // Italic (_italic_) with Guard Handling
                if (p3) {
                    // p3 captures the boundary character (like a space) + the underscore text
                    // Example: " _word_"
                    // We must find the first underscore to separate the prefix from the content
                    const firstUnderscore = p3.indexOf('_');
                    const prefix = p3.substring(0, firstUnderscore); // The space or punctuation
                    const core = p3.substring(firstUnderscore);      // The "_word_" part
                    
                    // Return prefix unstyled, core styled
                    // Note: 'prefix' and 'core' are already escaped via escapeHtml above
                    return `${prefix}<span class="ss-md-italic">${core}</span>`;
                }
                return match;
            });
        }
        
        html += `<span class="${className}">${content}</span>`;
        buffer = '';
    };

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const isMatch = matchedIndices.has(i);
        const matchClass = isMatch ? ' ss-brace-match' : '';

        if (char === '{') {
            flush();
            depth++;
            
            // PEEK AHEAD: Is this a comment block? (Starts with //)
            // Look at next 20 chars to skip whitespace
            const lookahead = code.substring(i + 1, i + 20);
            const isCommentBlock = /^\s*\/\//.test(lookahead);
            
            braceStyleStack.push(isCommentBlock);

            if (isCommentBlock) {
                html += `<span class="ss-brace-comment${matchClass}">{</span>`;
            } else {
                const depthClass = depth % 2 !== 0 ? 'ss-brace-odd' : 'ss-brace-even';
                html += `<span class="ss-brace ${depthClass}${matchClass}">{</span>`;
            }
        } 
        else if (char === '}') {
            flush();
            const isCommentBlock = braceStyleStack.pop();
            
            if (isCommentBlock) {
                html += `<span class="ss-brace-comment${matchClass}">}</span>`;
            } else {
                const depthClass = depth % 2 !== 0 ? 'ss-brace-odd' : 'ss-brace-even';
                html += `<span class="ss-brace ${depthClass}${matchClass}">}</span>`;
            }
            
            depth = Math.max(0, depth - 1);
        }
        else if (depth > 0 && char === '[') {
            flush();
            const ahead = code.substring(i, i + 10); 
            if (/\[\s*(desc|source|hidden)\s*:/.test(ahead)) {
                let metaContent = '[';
                while(i+1 < code.length && code[i] !== ']') {
                    metaContent += code[++i];
                }
                html += `<span class="ss-metadata">${escapeHtml(metaContent)}</span>`;
            } else {
                html += `<span class="ss-bracket${matchClass}">[</span>`;
                bracketDepth++; 
            }
        }
        else if (depth > 0 && char === ']') {
            flush();
            html += `<span class="ss-bracket${matchClass}">]</span>`;
            bracketDepth = Math.max(0, bracketDepth - 1);
        }
        else if (depth > 0 && (char === '$' || char === '@' || char === '#')) {
            flush();
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
        else if (depth > 0 && char === '%') {
            flush();
            let macroName = char;
            while(i+1 < code.length && /[a-zA-Z0-9_]/.test(code[i+1])) {
                macroName += code[++i];
            }
            html += `<span class="ss-macro">${macroName}</span>`;
        }

        // else if (depth > 0 && /[a-zA-Z]/.test(char)) {
        //     flush();
        //     let word = char;
        //     while(i+1 < code.length && /[a-zA-Z0-9_.]/.test(code[i+1])) {
        //         word += code[++i];
        //     }

        //     if (word.startsWith('Math.') || ['true', 'false', 'null', 'undefined', 'NaN', 'Infinity'].includes(word)) {
        //         html += `<span class="ss-js-keyword">${word}</span>`;
        //     } else {
        //         html += `<span class="ss-js-keyword">${word}</span>`;
        //     }
        // }

        else if (depth > 0 && char === '/' && code[i+1] === '/') {
            flush(); // Flush any previous operators/vars
            
            let comment = '//';
            i++; // Skip the second /
            
            // Consume until Newline OR Closing Brace
            // We STOP at '}' so the main loop can handle the logic closure correctly
            while (i + 1 < code.length && code[i+1] !== '\n' && code[i+1] !== '}') {
                comment += code[++i];
            }
            
            html += `<span class="ss-comment">${escapeHtml(comment)}</span>`;
        }

        else if (depth > 0 && bracketDepth > 0 && (char === ';' || char === ',')) {
            flush();
            html += `<span class="ss-bracket">${escapeHtml(char)}</span>`;
        }
        else if (depth > 0) {
            if (/[0-9]/.test(char) && !/[a-zA-Z]/.test(buffer)) {
                flush();
                let num = char;
                while(i+1 < code.length && /[0-9.]/.test(code[i+1])) {
                    num += code[++i];
                }
                html += `<span class="ss-number">${num}</span>`;
            }
            else if (i + 1 < code.length && 
                ['||', '&&', '==', '!=', '>=', '<=', '>>', '<<', '><', '<>', '++', '--'].includes(code.substring(i, i + 2))) {
                flush();
                const op = code.substring(i, i + 2);
                html += `<span class="ss-math">${escapeHtml(op)}</span>`;
                i++; 
            }
            else if (['+', '-', '*', '/', '%', '(', ')', '<', '>', '!', '&', '^'].includes(char)) {
                flush();
                html += `<span class="ss-math">${escapeHtml(char)}</span>`;
            }            
            else if ([':', '|', '~'].includes(char)) {
                flush();
                html += `<span class="ss-flow-op">${escapeHtml(char)}</span>`;
            }
            else if (['=', ','].includes(char)) {
                flush();
                html += `<span class="ss-operator">${escapeHtml(char)}</span>`;
            }
            else {
                buffer += char;
            }
        }
        else {
            buffer += char;
        }
    }
    
    flush();
    return html;
}