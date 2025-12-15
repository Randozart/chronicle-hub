// src/utils/prism-ligature.ts

export const ligatureGrammar = {
    'comment': { pattern: /\/\/.*/ },
    'header': { pattern: /\[.*?\]/, alias: 'keyword' },
    'logic-block': { 
        pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/, 
        alias: 'important' 
    },
    'track-name': { pattern: /^\s*[a-zA-Z0-9_]+\s*(?=\|)/m, alias: 'function' },
    'definition': {
        pattern: /@\w+\s*=\s*\[.*?\]/,
        inside: {
            'alias': { pattern: /@\w+/, alias: 'variable' },
            'operator': { pattern: /=/ },
            'punctuation': { pattern: /[\[\],]/ },
            'note': { pattern: /\d+['#b%,]*/, alias: 'number' }
        }
    },
    'bar': { pattern: /\|/, alias: 'operator' },
    'tuplet': { pattern: /\((?:[^()]+)\)/, alias: 'string' },
    'alias': { pattern: /@\w+(?:\(\s*[+-]?\d+\s*\))?/, alias: 'variable' },
    'note': { pattern: /\b\d+['#b%,]*/, alias: 'number' },
    'sustain': { pattern: /-/, alias: 'comment' },
    'silence': { pattern: /\./, alias: 'comment' },
    'config-key': { pattern: /^\s*[a-zA-Z0-9_]+\s*(?=:)/m, alias: 'attr-name' },
};
