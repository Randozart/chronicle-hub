import { Grammar } from 'prismjs';
const NESTED_BRACE_PATTERN = /\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/;
const standardTokens = {
    'variable': { pattern: /\$[a-zA-Z0-9_]+/, alias: 'variable' },
    'property-access': { pattern: /\.[a-zA-Z0-9_]+/, alias: 'attr-name' },
    'self-ref': { pattern: /\$\./, alias: 'keyword' },
    'alias-ref': { pattern: /@[a-zA-Z0-9_]+/, alias: 'builtin' },
    'world-ref': { pattern: /#[a-zA-Z0-9_]+/, alias: 'constant' },
    'dynamic-marker': { pattern: /\$(?=\{)/, alias: 'important' },
    'conditional-op': { pattern: /[:|]/, alias: 'important' },
    'range-op': { pattern: /~/, alias: 'important' },
    'operator': {
        pattern: /==|!=|>=|<=|\+=|-=|\+\+|--|[><=+\-*\/%^&]/,
        alias: 'operator'
    },
    'number': { pattern: /\b\d+\b/, alias: 'number' },
    'keyword': /\b(true|false)\b/,
    'punctuation': /[(),]/
};
const macroToken = {
    pattern: /%[a-zA-Z0-9_]+\[[\s\S]*?\]/,
    inside: {
        'macro-name': { pattern: /^%[a-zA-Z0-9_]+/, alias: 'function' },
        'macro-bracket': { pattern: /[\[\]]/, alias: 'punctuation' },
        'separator': { pattern: /;/, alias: 'keyword' },
        ...standardTokens
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
logicBlockToken.inside['logic-block'] = logicBlockToken;
metadataToken.inside['logic-block'] = logicBlockToken;
export const scribescriptGrammar = {
    'logic-block': logicBlockToken, 
    'macro-block': macroToken,      
    'metadata': metadataToken,      
    ...standardTokens               
};