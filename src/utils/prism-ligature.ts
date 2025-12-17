// src/utils/prism-ligature.ts

export const ligatureGrammar = {
    // 1. Comments
    'comment': { pattern: /\/\/.*|\/\*[\s\S]*?\*\// },
    
    // 2. Headers [CONFIG], [PATTERN: Name], etc.
    'header': { pattern: /^\[.*?\]/m, alias: 'keyword' },

    // 3. Logic Blocks { ... }
    'logic-block': { pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/, alias: 'important' },

    // 4. Definitions: @Root = [ 1 3 5 ]
    'definition': {
        pattern: /(@\w+)\s*=\s*\[.*?\]/,
        inside: {
            'alias': { pattern: /^@\w+/, alias: 'variable' },
            'chord-block': {
                pattern: /\[.*?\]/,
                alias: 'class-name', // Yellow
                inside: {
                    'note-complex': { // Note: Must be defined below
                        pattern: /\b\d+['#b%,]*/,
                        // inside: {
                        //     'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' },
                        //     'number': /\d+/
                        // }
                    }
                }
            }
            // Note: No 'operator' for '=' makes it default (white)
        }
    },

    'tuplet': { 
        pattern: /\([0-9.'#b%,\s-]+\)/, 
        alias: 'string', // Green
        inside: {
            'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' },
        }
    },
    

    'key-value-pair': {
        // FIX: The pattern now matches everything up to a `//` or the end of the line.
        // `.*?` is a non-greedy "match anything".
        // `(?=\/\/|$)` is a "positive lookahead" that stops the match when it sees `//` or the end `$`
        // without consuming it, allowing the 'comment' rule to match it later.
        pattern: /^\s*[a-zA-Z0-9_]+\s*:.*?(?=\/\/|$)/m,
        greedy: true,
        inside: {
            'modifier-block': {
                pattern: /\(.*\)/,
                alias: 'attr-value', // Cyan
            },
            'key': { 
                pattern: /^\s*[a-zA-Z0-9_]+/, 
                alias: 'attr-name' // Orange
            },
            'punctuation': /:/,
        }
    },
    
    // 6. Track Declaration on a grid line
    'track-declaration': {
        pattern: /^\s*[a-zA-Z0-9_]+(?:\s*\(.*?\))?(?:\s*\^\[.*?\])?\s*(?=\|)/m,
        greedy: true,
        inside: {
            'track-name': { pattern: /^[a-zA-Z0-9_]+/, alias: 'function' }, // Blue
            'effect-block': { pattern: /\^\[.*?\]/, alias: 'effect-block' }, // Purplish-blue
            'modifier-block': { pattern: /\(.*\)/, alias: 'attr-value' }, // Cyan
        }
    },
    
    'bar': { pattern: /\|/, alias: 'operator' },

    // 7. Full Note Token (Highest Priority Atom)
    // Matches: 1'(v:10)^[F20]
    'note-complex': {
        pattern: /\b\d+['#b%,]*(?:\([^)]*\))?(?:\^\[.*?\])?/,
        greedy: true,
        inside: {
            'effect-block': { pattern: /\^\[.*?\]/, alias: 'effect-block' }, // Purplish-blue
            'modifier-block': { pattern: /\([^)]*\)/, alias: 'attr-value' }, // Cyan
            'octave-shift': { pattern: /['#,b%]+/, alias: 'builtin' }, // Yellow
            'number': /\d+/ // Orange
        }
    },
    


    // 9. Atoms
    'alias-ref': { pattern: /@\w+/, alias: 'variable' },
    'sustain': { pattern: /-/, alias: 'comment' }, // Sustain is grey like silence
    'silence': { pattern: /\./, alias: 'comment' }, 
};