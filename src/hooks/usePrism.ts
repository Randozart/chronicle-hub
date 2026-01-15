'use client';

import { useMemo } from 'react';
import Prism from '@/lib/prism';

const highlighterCache = new Map<string, (code: string) => string>();

export function usePrism(language: 'scribescript' | 'ligature') {
    const highlight = useMemo(() => {
        if (highlighterCache.has(language)) {
            return highlighterCache.get(language)!;
        }

        const grammar = Prism.languages[language];

        const highlighter = (code: string): string => {
            if (grammar && typeof code === 'string') {
                try {
                    let html = Prism.highlight(code, grammar, language);
                    if (language === 'scribescript') {
                        let depth = 0;
                        html = html.replace(
                            /(<span class="[^"]*logic-brace[^"]*">)([{}]|_)(<\/span>)/g, 
                            (match, prefix, char, suffix) => {
                                if (char === '{') {
                                    const cls = `ss-brace-${depth % 3}`;
                                    depth++;
                                    const newPrefix = prefix.replace('class="', `class="${cls} `);
                                    return `${newPrefix}{${suffix}`;
                                } else if (char === '}') {
                                    depth = Math.max(0, depth - 1);
                                    const cls = `ss-brace-${depth % 3}`;
                                    const newPrefix = prefix.replace('class="', `class="${cls} `);
                                    return `${newPrefix}}${suffix}`;
                                }
                                return match;
                            }
                        );
                    }

                    return html;
                } catch (e) {
                    console.error("Prism highlighting error:", e);
                    return code;
                }
            }
            return code;
        };

        highlighterCache.set(language, highlighter);
        return highlighter;
    }, [language]);

    return highlight;
}