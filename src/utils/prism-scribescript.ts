import Prism from 'prismjs';

Prism.languages.scribescript = {
    // 1. Logic Blocks { ... }
    // Handles one level of nesting: { ... { ... } ... }
    'logic-block': {
        pattern: /\{(?:[^{}]|\{[^{}]*\})*\}/,
        inside: {
            'variable': {
                pattern: /\$[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?/,
                alias: 'variable'
            },
            'operator': />=|<=|!=|==|>>|<<|[=+\-><|:]/,
            'punctuation': /[{}|]/,
            // 'string': {
            //     pattern: /(['"])(?:(?!\1)[^\\\r\n]|\\.)*\1/,
            //     alias: 'string'
            // },
            'number': /\b\d+\b/,
            'keyword': /\b(true|false)\b/
        }
    },

    // 2. Variables (Global - e.g. in requirements)
    'variable': /\$[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?/,

    // 3. Tags [source:...]
    'tag': {
        pattern: /\[[^\]]+\]/,
        inside: {
            'punctuation': /[\[\]:]/,
            'attr-name': /^[a-zA-Z0-9_]+(?=:)/,
            'attr-value': /.+/
        }
    },
    
    // 4. Formatting (Markdown) - Optional, keeps text nice
    'bold': {
        pattern: /\*\*(?:(?!\*\*).)+\*\*/,
        inside: { 'punctuation': /\*\*/ }
    },
    'italic': {
        pattern: /([*_])(?:(?!\1).)+\1/,
        inside: { 'punctuation': /^.|.$/ }
    }
};

export default Prism;