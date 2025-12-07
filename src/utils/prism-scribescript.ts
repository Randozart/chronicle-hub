// src/utils/prism-scribescript.ts
import Prism from 'prismjs';

Prism.languages.scribescript = {
    // 1. Logic Blocks { ... }
    'logic-block': {
        pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/,
        inside: {
            // Engine Macros: %command
            'macro': {
                pattern: /%[a-zA-Z0-9_]+/,
                alias: 'function' // Colors it like a function
            },
            // Variables: $quality
            'variable': {
                pattern: /\$[a-zA-Z0-9_]+/,
                alias: 'variable'
            },
            // Local Aliases: @alias
            'alias': {
                pattern: /@[a-zA-Z0-9_]+/,
                alias: 'string' // Colors it distinct from globals
            },
            // Self Reference: $.
            'self-ref': {
                pattern: /\$\./,
                alias: 'keyword'
            },
            // Keys in key:value pairs (desc:, pivot:)
            'key': {
                pattern: /\b[a-zA-Z0-9_]+(?=:)/,
                alias: 'attr-name'
            },
            // Operators
            'operator': />=|<=|!=|==|>>|<<|[=+\-><|:]/,
            'punctuation': /[{}|;[\],.]/,
            'number': /\b\d+\b/,
            'keyword': /\b(true|false|recur|unique|invert|first|last|all)\b/
        }
    },
    
    // 2. Effect Metadata [key: value]
    'metadata': {
        pattern: /\[.*?\]/,
        inside: {
            'key': {
                pattern: /\b[a-zA-Z0-9_]+(?=:)/,
                alias: 'attr-name'
            },
            'punctuation': /[:\[\]]/,
            'string': /[^:\[\]]+/
        }
    }
};

export default Prism;