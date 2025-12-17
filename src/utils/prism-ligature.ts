export const ligatureGrammar = {
    'comment': { pattern: /\/\/.*|\/\*[\s\S]*?\*\// },
    
    // Definitions: @Root = [ 1 3 5 ]
    'definition': {
        pattern: /(@\w+)\s*=\s*\[.*?\]/,
        inside: {
            'alias': { pattern: /^@\w+/, alias: 'variable' }, 
            'chord-block': {
                pattern: /\[.*?\]/,
                alias: 'class-name', // Yellow
                inside: {
                    // Notes inherit Yellow. Only Octaves get specific token.
                    'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' }
                }
            }
        }
    },

    'header': { pattern: /\[.*?\]/, alias: 'keyword' },

    'logic-block': { 
        pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/, 
        alias: 'important' 
    },

    'config-line': {
        pattern: /^\s*[a-zA-Z0-9_]+\s*:.*$/m,
        inside: {
            'config-key': { 
                pattern: /^\s*[a-zA-Z0-9_]+/, 
                alias: 'attr-name' 
            },
            'punctuation': /:/ 
        }
    },

    'track-declaration': {
        pattern: /^\s*[a-zA-Z0-9_]+(?:\s*\(.*\))?\s*(?=\|)/m,
        inside: {
            'track-name': { 
                pattern: /^\s*[a-zA-Z0-9_]+/, 
                alias: 'function' 
            },
            'modifier-block': {
                pattern: /\(.*\)/,
                alias: 'attr-value', 
                // Content inherits Cyan
            }
        }
    },

    'bar': { pattern: /\|/, alias: 'operator' },

    // Tuplets: (1 2 3) -> Green
    'tuplet': { 
        pattern: /\([0-9.'#b%,\s]+\)/, 
        alias: 'string'
        // inside: {
        //     // Notes inherit Green. Octaves get Yellow.
        //     'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' },
        //     'sustain-mark': { pattern: /-/, alias: 'sustain' }, 
        //     'silence': { pattern: /\./, alias: 'comment' } 
        // }
    },

    // General Modifiers: (+12) -> Cyan
    'modifier': {
        pattern: /\([^)]+\)/,
        alias: 'attr-value'
        // Content inherits Cyan
    },

    'alias-ref': { pattern: /@\w+/, alias: 'variable' },
    
    // Standalone Notes (Outside blocks) -> Orange
    'note-complex': {
        pattern: /\b\d+['#b%,]*/,
        inside: {
            'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' }, // Yellow
            'number': /\d+/ // Orange
        }
    },
    
    'sustain-mark': { pattern: /-/, alias: 'sustain' }, 
    'silence': { pattern: /\./, alias: 'comment' }, 
};