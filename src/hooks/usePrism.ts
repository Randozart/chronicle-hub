// src/hooks/usePrism.ts
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

        // --- START DEBUGGING BLOCK ---
        console.log(`[usePrism] Initializing highlighter for: ${language}`);
        console.log(`[usePrism] Grammar object received:`, JSON.parse(JSON.stringify(grammar || {}))); // Use a deep copy for safe logging

        // Deep check for invalid patterns
        if (grammar) {
            // We cast the grammar to 'any' to bypass strict TypeScript indexing rules for this debug-only block.
            const grammarAsAny = grammar as any; 
            
            for (const token in grammarAsAny) {
                // Ensure the property is directly on the object
                if (Object.prototype.hasOwnProperty.call(grammarAsAny, token)) {
                    const patternDefinition = grammarAsAny[token];
                    // A token can be a RegExp directly or an object with a 'pattern' property.
                    let pattern: unknown = null;

                    if (patternDefinition instanceof RegExp) {
                        pattern = patternDefinition;
                    } else if (
                        typeof patternDefinition === 'object' &&
                        patternDefinition !== null &&
                        'pattern' in patternDefinition
                    ) {
                        pattern = patternDefinition.pattern;
                    } else {
                        // This is likely an `inside` object — ignore it
                        continue;
                    }

                    if (!(pattern instanceof RegExp)) {
                        console.error(`[usePrism] INVALID PATTERN DETECTED!`);
                        console.error(`Language: ${language}, Token: "${token}"`);
                        console.error(`Value is NOT a RegExp:`, pattern);
                    }
                }
            }
        } else {
            console.warn(`[usePrism] Grammar for "${language}" is undefined!`);
        }
        // --- END DEBUGGING BLOCK ---

        const highlighter = (code: string): string => {
            if (grammar && typeof code === 'string') {
                try {
                    return Prism.highlight(code, grammar, language);
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