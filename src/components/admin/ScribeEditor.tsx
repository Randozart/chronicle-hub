'use client';

import Editor from 'react-simple-code-editor';
import { usePrism } from '@/hooks/usePrism';
import { useMemo } from 'react';
import { LintError } from '@/engine/audio/linter';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
    errors?: LintError[]; 
}

export default function ScribeEditor({ 
    value, 
    onChange, 
    placeholder, 
    minHeight = "100px", 
    language = 'scribescript',
    errors = []
}: Props) {
    
    const highlight = usePrism(language);
    const isLigature = language === 'ligature';

    // Generate Line Numbers
    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

    // Error Map
    const errorMap = useMemo(() => {
        const map = new Map<number, 'error' | 'warning'>();
        errors.forEach(e => map.set(e.line, e.severity));
        return map;
    }, [errors]);

    // Determine Scoping Class
    const scopeClass = isLigature ? 'lang-ligature' : 'lang-scribescript';

    return (
        <div 
            className={`scribe-editor-wrapper ${scopeClass}`}
            style={{
                background: '#181a1f',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: '1.5',
                position: 'relative',
                display: 'flex', 
                overflow: 'hidden'
            }}
        >
            {/* LINE NUMBER GUTTER */}
            <div style={{
                flexShrink: 0,
                width: '40px',
                textAlign: 'right',
                padding: '10px 8px 10px 0',
                background: '#21252b',
                borderRight: '1px solid #333',
                color: '#495162',
                fontFamily: '"Fira Code", "Fira Mono", monospace',
                userSelect: 'none'
            }}>
                {lineNumbers.map(n => {
                    const status = errorMap.get(n);
                    const color = status === 'error' ? '#e06c75' : status === 'warning' ? '#e5c07b' : 'inherit';
                    const weight = status ? 'bold' : 'normal';
                    const marker = status === 'error' ? '!' : status === 'warning' ? '?' : n;
                    
                    return (
                        <div key={n} style={{ height: '21px', lineHeight: '21px', color, fontWeight: weight }}>
                            {marker}
                        </div>
                    );
                })}
            </div>

            {/* EDITOR AREA */}
            <div style={{ 
                flex: 1, 
                overflowX: 'auto', 
                position: 'relative'
            }}>
                {/* Error Underlines */}
                <div style={{ position: 'absolute', top: '10px', left: 0, width: '100%', pointerEvents: 'none' }}>
                     {errors.map((err, i) => (
                         <div key={i} style={{
                             position: 'absolute',
                             top: `${(err.line - 1) * 21 + 19}px`,
                             left: 0,
                             width: '100%',
                             height: '1px',
                             borderBottom: err.severity === 'error' ? '2px dashed rgba(224, 108, 117, 0.5)' : '2px dashed rgba(229, 192, 123, 0.5)'
                         }} />
                     ))}
                </div>

                <Editor
                    value={value || ""}
                    onValueChange={onChange}
                    highlight={highlight} 
                    padding={10}
                    style={{
                        fontFamily: '"Fira Code", "Fira Mono", monospace',
                        minHeight: minHeight,
                        color: '#abb2bf',
                        whiteSpace: isLigature ? 'pre' : 'pre-wrap', 
                        minWidth: isLigature ? 'max-content' : '100%',
                        lineHeight: '21px' 
                    }}
                    textareaClassName="focus:outline-none"
                    placeholder={placeholder}
                />
            </div>
            
            <style jsx global>{`
                /* === SCRIBESCRIPT THEME (.lang-scribescript) === */
                
                /* 0. Defaults & Fallbacks (MUST BE FIRST to allow overrides) */
                .lang-scribescript .token.punctuation { color: #abb2bf; }
                .lang-scribescript .token.natural { color: #abb2bf; opacity: 0.9; }
                
                /* 1. Logic Braces (Rainbow Depth) */
                .lang-scribescript .token.ss-brace-0 { color: #e5c07b; font-weight: bold; } /* Yellow */
                .lang-scribescript .token.ss-brace-1 { color: #c678dd; font-weight: bold; } /* Purple */
                .lang-scribescript .token.ss-brace-2 { color: #56b6c2; font-weight: bold; } /* Cyan */

                /* 2. Dynamic Marker ($ before {) */
                .lang-scribescript .token.dynamic-marker { color: #c678dd; font-weight: bold; } /* Purple */

                /* 3. Macros */
                /* Specificity ensures this overrides .punctuation */
                .lang-scribescript .token.macro-bracket { color: #56b6c2; font-weight: bold; } 
                .lang-scribescript .token.macro-name { color: #61afef; font-style: italic; }

                /* 4. Operators */
                .lang-scribescript .token.conditional-op { color: #c678dd; font-weight: bold; } /* Magenta (: |) */
                .lang-scribescript .token.range-op { color: #e06c75; font-weight: bold; } /* Red (~) */
                .lang-scribescript .token.operator { color: #56b6c2; } /* Cyan (== >= =) */

                /* 5. Variables & Properties */
                .lang-scribescript .token.variable { color: #61afef; } /* Blue */
                .lang-scribescript .token.attr-name { color: #61afef; font-style: italic; } /* Property Access */
                
                .lang-scribescript .token.self-ref { color: #e5c07b; font-style: italic; }
                .lang-scribescript .token.alias-ref { color: #98c379; } /* Green */
                .lang-scribescript .token.world-ref { color: #d19a66; } /* Orange */

                /* 6. Values & Metadata */
                .lang-scribescript .token.number { color: #d19a66; } /* Orange */
                .lang-scribescript .token.string { color: #98c379; } /* Green (Double quotes only) */
                .lang-scribescript .token.meta-key { color: #5c6370; font-style: italic; }
                

                /* === LIGATURE THEME (.lang-ligature) === */

                /* Headers & Keywords */
                .lang-ligature .token.keyword { color: #c678dd; font-weight: bold; } /* Purple [HEADER] */
                
                /* Definitions */
                .lang-ligature .token.class-name { color: #e5c07b; } /* Yellow [Chord] */
                .lang-ligature .token.attr-name { color: #d19a66; } /* Orange (Keys) */
                .lang-ligature .token.attr-value { color: #56b6c2; } /* Cyan (Modifiers) */
                
                /* Effects & Functions */
                .lang-ligature .token.function { color: #61afef; } /* Blue (Track Names) */
                .lang-ligature .token.effect-block { color: #7949ff; } /* Blurple ^[Effect] */
                .lang-ligature .token.builtin { color: #e5c07b; } /* Yellow (Octave shifts) */

                /* Values */
                .lang-ligature .token.string { color: #98c379; } /* Green (Tuplets) */
                .lang-ligature .token.number { color: #d19a66; } /* Orange */
                .lang-ligature .token.comment { color: #5c6370; font-style: italic; }
                
                /* Fallbacks */
                .token.punctuation { color: #abb2bf; }
                
                /* Scrollbars */
                .scribe-editor-wrapper div::-webkit-scrollbar {
                    height: 8px; width: 8px;
                }
                .scribe-editor-wrapper div::-webkit-scrollbar-track {
                    background: #21252b;
                }
                .scribe-editor-wrapper div::-webkit-scrollbar-thumb {
                    background: #3e4451; border-radius: 4px;
                }
            `}</style>
        </div>
    );
}