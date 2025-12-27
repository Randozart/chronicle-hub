import { Grammar } from 'prismjs';

// Regex for nested braces up to 2 levels deep
const NESTED_BRACE_PATTERN = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/;

// 1. Define the atomic tokens (Base level)
const standardTokens = {
    // Variables & Refs
    'variable': { pattern: /\$[a-zA-Z0-9_]+/, alias: 'variable' },
    'property-access': { pattern: /\.[a-zA-Z0-9_]+/, alias: 'attr-name' },
    'self-ref': { pattern: /\$\./, alias: 'keyword' },
    'alias-ref': { pattern: /@[a-zA-Z0-9_]+/, alias: 'builtin' },
    'world-ref': { pattern: /#[a-zA-Z0-9_]+/, alias: 'constant' },

    // Dynamic Marker (The $ in ${...})
    'dynamic-marker': { pattern: /\$(?=\{)/, alias: 'important' },

    // Flow Control
    'conditional-op': { pattern: /[:|]/, alias: 'important' },
    'range-op': { pattern: /~/, alias: 'important' },

    // Operators
    'operator': {
        pattern: /==|!=|>=|<=|\+=|-=|\+\+|--|[><=+\-*\/%^&]/,
        alias: 'operator'
    },

    // Values
    'number': { pattern: /\b\d+\b/, alias: 'number' },
    'keyword': /\b(true|false)\b/,
    
    // Punctuation (Fallback)
    'punctuation': /[(),]/
};

// 2. Define Complex tokens (Macros, Metadata)
const macroToken = {
    // FIX: Simplified pattern (Match whole macro string)
    pattern: /%[a-zA-Z0-9_]+\[[\s\S]*?\]/,
    inside: {
        'macro-name': { pattern: /^%[a-zA-Z0-9_]+/, alias: 'function' },
        'macro-bracket': { pattern: /[\[\]]/, alias: 'punctuation' },
        'separator': { pattern: /;/, alias: 'keyword' }, // ; is special in macros
        ...standardTokens // Inject standard tokens directly (Flattened)
    }
};

const metadataToken = {
    pattern: /\[\s*(?:desc|source|hidden)\s*:[\s\S]*?\]/,
    inside: {
        'meta-key': { 
            pattern: /\b(?:desc|source|hidden)(?=\s*:)/, 
            alias: 'keyword' 
        },
        'punctuation': /[:\[\]]/,
        'logic-block': null as any 
    }
};

// 3. Define the Logic Block
const logicBlockToken = {
    pattern: NESTED_BRACE_PATTERN,
    inside: {
        'logic-brace': { pattern: /[{}]/ },
        'macro-block': macroToken,
        'metadata': metadataToken,
        'logic-block': null as any, 
        ...standardTokens
    }
};

// 4. Wire up Recursion
logicBlockToken.inside['logic-block'] = logicBlockToken;
metadataToken.inside['logic-block'] = logicBlockToken;

// 5. Export Top-Level Grammar
export const scribescriptGrammar = {
    'logic-block': logicBlockToken, 
    'macro-block': macroToken,      
    'metadata': metadataToken,      
    ...standardTokens               
};