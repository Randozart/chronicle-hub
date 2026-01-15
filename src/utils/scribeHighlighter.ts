function getActiveBrackets(code: string, cursorIndex: number | null): Set<number> {
    const activeIndices = new Set<number>();
    if (cursorIndex === null) return activeIndices;

    const stack: { char: string; index: number }[] = [];
    const pairs: [number, number][] = [];
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
    for (const [open, close] of pairs) {
        const isTouchingOpen = cursorIndex === open || cursorIndex === open + 1;
        const isTouchingClose = cursorIndex === close || cursorIndex === close + 1;

        if (isTouchingOpen || isTouchingClose) {
            activeIndices.add(open);
            activeIndices.add(close);
        }
    }

    return activeIndices;
}
export function highlightScribeScript(
    code: string, 
    cursorOffset: number | null = null, 
    mode: 'text' | 'effect' | 'condition' = 'text'
): string {
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
        
        let content = escapeHtml(buffer);
        let className = 'ss-operator';
        if (depth === 0 && mode === 'text') {
            className = 'ss-text-raw';
            
            content = content.replace(/(\*\*[^*]+\*\*)|(\*[^*]+\*)|((?:^|[^a-zA-Z0-9])_[^_]+_(?![a-zA-Z0-9]))/g, (match, p1, p2, p3) => {
                if (p1) return `<span class="ss-md-bold">${p1}</span>`;
                if (p2) return `<span class="ss-md-italic">${p2}</span>`;
                if (p3) {
                    const firstUnderscore = p3.indexOf('_');
                    const prefix = p3.substring(0, firstUnderscore);
                    const core = p3.substring(firstUnderscore);
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
        const isLogicContext = depth > 0 || mode === 'effect' || mode === 'condition';
        if (char === '{') {
            flush();
            depth++;
            
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
        else if (isLogicContext && char === '/' && code[i+1] === '/') {
            flush(); 
            let comment = '//';
            i++; 
            while (i + 1 < code.length && code[i+1] !== '\n' && code[i+1] !== '}') {
                comment += code[++i];
            }
            html += `<span class="ss-comment">${escapeHtml(comment)}</span>`;
        }
        else if (isLogicContext && char === '[') {
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
        else if (isLogicContext && char === ']') {
            flush();
            html += `<span class="ss-bracket${matchClass}">]</span>`;
            bracketDepth = Math.max(0, bracketDepth - 1);
        }
        else if (isLogicContext && (char === '$' || char === '@' || char === '#')) {
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
        else if (isLogicContext && char === '%') {
            flush();
            let macroName = char;
            while(i+1 < code.length && /[a-zA-Z0-9_]/.test(code[i+1])) {
                macroName += code[++i];
            }
            html += `<span class="ss-macro">${macroName}</span>`;
        }
        else if (isLogicContext && bracketDepth > 0 && (char === ';' || char === ',')) {
            flush();
            html += `<span class="ss-bracket">${escapeHtml(char)}</span>`;
        }
        else if (isLogicContext) {
            if (/[0-9]/.test(char) && !/[a-zA-Z]/.test(buffer)) {
                flush();
                let num = char;
                while(i+1 < code.length && /[0-9.]/.test(code[i+1])) {
                    num += code[++i];
                }
                html += `<span class="ss-number">${num}</span>`;
            }
            else if (i + 1 < code.length && ['||', '&&', '==', '!=', '>=', '<=', '>>', '<<', '><', '<>', '++', '--'].includes(code.substring(i, i + 2))) {
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