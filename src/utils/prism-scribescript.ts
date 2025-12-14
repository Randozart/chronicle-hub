// src/utils/prism-scribescript.ts

export const scribescriptGrammar = {
    'logic-block': {
        pattern: /\{(?:[^{}]|\{\{[^{}]*\}\})*\}/,
        inside: {
            'logic-delimiter': {
                pattern: /[{}]/,
                alias: 'important' 
            },
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
                alias: 'builtin'
            },
            'self-ref': {
                pattern: /\$\./,
                alias: 'keyword'
            },
            'key': {
                pattern: /\b[a-zA-Z0-9_]+(?=:)/,
                alias: 'attr-name'
            },
            'flow-operator': {
                pattern: /[|:;]/,
                alias: 'operator'
            },
            'operator': { pattern: />=|<=|!=|==|>>|<<|[=+\-><]/ },
            'punctuation': { pattern: /[\[\](),.]/ },
            'number': { pattern: /\b\d+\b/ },
            'keyword': { pattern: /\b(true|false|recur|unique|invert|first|last|all)\b/ },
            'text': {
                pattern: /[^@$%{}|:;,[\]().<>=+\-]+/,
                alias: 'natural' 
            }
        }
    },
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
            'string': {
                pattern: /[^:\[\]]+/,
                alias: 'comment'
            }
        }
    }
};