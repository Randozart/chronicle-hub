import Prism from '@/lib/prism-core';

Prism.languages.ligature = {
    comment: {
        pattern: /\/\/.*/,
        greedy: true
    },

    header: {
        pattern: /^\[.*?\]$/m,
        alias: 'keyword'
    },

    'track-name': {
        pattern: /^\s*[A-Za-z0-9_]+\s*(?=\|)/m,
        alias: 'function'
    },

    bar: {
        pattern: /\|/,
        alias: 'operator'
    },

    tuplet: {
        pattern: /\((?:[^()]+)\)/,
        alias: 'string'
    },

    alias: {
        pattern: /@\w+(?:\(\s*[+-]?\d+\s*\))?/,
        alias: 'variable'
    },

    note: {
        pattern: /\b\d+['#b%,]*/,
        alias: 'number'
    },

    sustain: {
        pattern: /-/,
        alias: 'comment'
    },

    silence: {
        pattern: /\./,
        alias: 'comment'
    }
};
