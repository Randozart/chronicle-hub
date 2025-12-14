// src/utils/prism-ligature.ts

export const ligatureGrammar = {
    'comment': {
        pattern: /\/\/.*/,
        greedy: true
    },
    'header': {
        pattern: /^\[.*?\]$/m,
        alias: 'keyword'
    },
    'logic-block': {
        pattern: /\{\{(?:[^{}]|\{\{[^{}]*\}\})*\}\}/,
        alias: 'important'
    },
    'track-name': {
        pattern: /^\s*[A-Za-z0-9_]+\s*(?=\|)/m,
        alias: 'function'
    },
    'bar': {
        pattern: /\|/,
        alias: 'operator'
    },
    'tuplet': {
        pattern: /\((?:[^()]+)\)/,
        alias: 'string'
    },
    'alias': {
        pattern: /@\w+(?:\(\s*[+-]?\d+\s*\))?/,
        alias: 'variable'
    },
    'note': {
        pattern: /\b\d+['#b%,]*/,
        alias: 'number'
    },
    'sustain': {
        pattern: /-/,
        alias: 'comment'
    },
    'silence': {
        pattern: /\./, // Correctly escaped literal dot
        alias: 'comment'
    },
    'config-key': {
        pattern: /^\s*[a-zA-Z0-9_]+\s*(?=:)/m,
        alias: 'attr-name'
    }
};