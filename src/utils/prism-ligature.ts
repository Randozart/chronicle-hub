// src/utils/prism-ligature.ts

export const ligatureGrammar = {
    'comment': { pattern: /\/\/.*|\/\*[\s\S]*?\*\// },
    'header': { pattern: /^\[.*?\]/m, alias: 'keyword' },
    'logic-block': { pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/, alias: 'important' },
    'definition': {
        pattern: /(@\w+)\s*=\s*\[.*?\]/,
        inside: {
            'alias': { pattern: /^@\w+/, alias: 'variable' },
            'chord-block': {
                pattern: /\[.*?\]/,
                alias: 'class-name',
                inside: {
                    'note-complex': {
                        pattern: /\b\d+['#b%,]*/,
                    }
                }
            }
        }
    },

    'tuplet': { 
        pattern: /\([0-9.'#b%,\s-]+\)/, 
        alias: 'string',
        inside: {
            'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' },
        }
    },
    

    'key-value-pair': {
        pattern: /^\s*[a-zA-Z0-9_]+\s*:.*?(?=\/\/|$)/m,
        greedy: true,
        inside: {
            'modifier-block': {
                pattern: /\(.*\)/,
                alias: 'attr-value',
            },
            'key': { 
                pattern: /^\s*[a-zA-Z0-9_]+/, 
                alias: 'attr-name'
            },
            'punctuation': /:/,
        }
    },
    'track-declaration': {
        pattern: /^\s*[a-zA-Z0-9_]+(?:\s*\(.*?\))?(?:\s*\^\[.*?\])?\s*(?=\|)/m,
        greedy: true,
        inside: {
            'track-name': { pattern: /^[a-zA-Z0-9_]+/, alias: 'function' },
            'effect-block': { pattern: /\^\[.*?\]/, alias: 'effect-block' },
            'modifier-block': { pattern: /\(.*\)/, alias: 'attr-value' },
        }
    },
    
    'bar': { pattern: /\|/, alias: 'operator' },
    'note-complex': {
        pattern: /\b\d+['#b%,]*(?:\([^)]*\))?(?:\^\[.*?\])?/,
        greedy: true,
        inside: {
            'effect-block': { pattern: /\^\[.*?\]/, alias: 'effect-block' },
            'modifier-block': { pattern: /\([^)]*\)/, alias: 'attr-value' },
            'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' },
            'number': /\d+/
        }
    },
    'alias-ref': { pattern: /@\w+/, alias: 'variable' },
    'sustain': { pattern: /-/, alias: 'comment' },
    'silence': { pattern: /\./, alias: 'comment' }, 
};