// src/utils/prism-scribescript.ts
import Prism from 'prismjs';

Prism.languages.scribescript = {
    // 1. Logic Blocks { ... }
    'logic-block': {
        // Matches the outer block. 
        // Logic inside 'inside' will tokenize the contents.
        pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/,
        inside: {
            // --- A. BLOCK WRAPPERS (The Engine Sigils) ---
            // We color { and } distinctly to show where logic starts/ends
            'logic-delimiter': {
                pattern: /[{}]/,
                alias: 'important' 
            },

            // --- B. DATA SIGILS & IDENTIFIERS ---
            'macro': {
                pattern: /%[a-zA-Z0-9_]+/,
                alias: 'function' 
            },
            'variable': {
                pattern: /\$[a-zA-Z0-9_]+/,
                alias: 'variable'
            },
            'alias': {
                pattern: /@[a-zA-Z0-9_]+/,
                alias: 'builtin' // Distinct color (often teal/green) for local aliases
            },
            'self-ref': {
                pattern: /\$\./,
                alias: 'keyword'
            },

            // --- C. KEYS (before colon) ---
            'key': {
                pattern: /\b[a-zA-Z0-9_]+(?=:)/,
                alias: 'attr-name'
            },

            // --- D. FLOW CONTROL ---
            // Pipe, Colon, Semicolon are functional operators, not just punctuation
            'flow-operator': {
                pattern: /[|:;]/,
                alias: 'operator'
            },

            // --- E. STANDARD OPERATORS ---
            'operator': />=|<=|!=|==|>>|<<|[=+\-><]/,
            
            // --- F. PUNCTUATION ---
            // Commas, brackets, parens, dots
            'punctuation': /[\[\](),.]/,

            // --- G. LITERALS ---
            'number': /\b\d+\b/,
            'keyword': /\b(true|false|recur|unique|invert|first|last|all)\b/,

            // --- H. CATCH-ALL TEXT (Grey) ---
            // Matches any sequence of characters that are NOT syntax control characters.
            // This renders plain text inside the block as comments (grey).
            'text': {
                pattern: /[^@$%{}|:;,[\]().<>=+\-]+/,
                alias: 'comment' 
            }
        }
    },
    
    // 2. Effect Metadata [key: value]
    'metadata': {
        pattern: /\[.*?\]/,
        inside: {
            'metadata-delimiter': {
                pattern: /[\[\]]/,
                alias: 'punctuation'
            },
            'key': {
                pattern: /\b[a-zA-Z0-9_]+(?=:)/,
                alias: 'attr-name'
            },
            'separator': {
                pattern: /:/,
                alias: 'operator'
            },
            // Metadata values are text by default
            'string': {
                pattern: /[^:\[\]]+/,
                alias: 'comment'
            }
        }
    }
};

export default Prism;