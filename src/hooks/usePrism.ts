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
                    // 1. Get Base Highlight
                    let html = Prism.highlight(code, grammar, language);

                    // 2. Post-Process for ScribeScript Rainbow Braces
                    if (language === 'scribescript') {
                        let depth = 0;
                        
                        // FIX: Updated Regex to be class-agnostic.
                        // It looks for 'logic-brace' anywhere inside the class attribute.
                        html = html.replace(
                            /(<span class="[^"]*logic-brace[^"]*">)([{}]|_)(<\/span>)/g, 
                            (match, prefix, char, suffix) => {
                                if (char === '{') {
                                    const cls = `ss-brace-${depth % 3}`;
                                    depth++;
                                    // We append our depth class to the existing prefix tag
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