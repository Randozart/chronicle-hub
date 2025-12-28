'use client';

import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs'; 
import { useMemo, useState, useEffect } from 'react';
import { highlightScribeScript } from '@/utils/scribeHighlighter';
import { ligatureGrammar } from '@/utils/prism-ligature'; // Import the grammar
import { LintError } from '@/engine/audio/linter'; 

// Import Prism base styles (we override them, but this prevents crashes)
import 'prismjs/components/prism-clike';
import 'prismjs/themes/prism-dark.css'; 

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
    
    // Register Ligature Grammar on mount (idempotent)
    useEffect(() => {
        if (!languages.ligature) {
            languages.ligature = ligatureGrammar;
        }
    }, []);

    const [cursorOffset, setCursorOffset] = useState<number | null>(null);
    const isLigature = language === 'ligature';

    // --- HYBRID HIGHLIGHTER ---
    const highlightCode = (code: string) => {
        if (isLigature) {
            // Use Prism for Ligature
            return highlight(code, languages.ligature || ligatureGrammar, 'ligature'); 
        } else {
            // Use Custom Stateful Tokenizer for ScribeScript
            return highlightScribeScript(code, cursorOffset);
        }
    };

    // Generate Line Numbers
    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

    // Error Map
    const errorMap = useMemo(() => {
        const map = new Map<number, 'error' | 'warning'>();
        errors.forEach(e => map.set(e.line, e.severity));
        return map;
    }, [errors]);

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
                // Ligature needs X-Scroll for long tracks. ScribeScript wraps.
                overflowX: isLigature ? 'auto' : 'hidden', 
                position: 'relative'
            }}>
                {/* Error Underlines */}
                <div style={{ position: 'absolute', top: '10px', left: 0, width: '100%', pointerEvents: 'none', zIndex: 0 }}>
                     {errors.map((err, i) => (
                         <div key={i} style={{
                             position: 'absolute',
                             top: `${(err.line - 1) * 21}px`,
                             left: 0,
                             width: '100%',
                             height: '21px',
                             background: err.severity === 'error' 
                                ? 'linear-gradient(90deg, rgba(224, 108, 117, 0.1) 0%, transparent 100%)' 
                                : 'linear-gradient(90deg, rgba(229, 192, 123, 0.1) 0%, transparent 100%)',
                             borderBottom: err.severity === 'error' ? '1px dashed rgba(224, 108, 117, 0.5)' : '1px dashed rgba(229, 192, 123, 0.5)'
                         }} />
                     ))}
                </div>

                <Editor
                    value={value || ""}
                    onValueChange={onChange}
                    highlight={highlightCode} 
                    padding={10}
                    
                    // Only track cursor for ScribeScript (performance)
                    onSelect={!isLigature ? (e) => {
                        const target = e.target as HTMLTextAreaElement;
                        if (target.selectionStart === target.selectionEnd) {
                            setCursorOffset(target.selectionStart);
                        } else {
                            setCursorOffset(null);
                        }
                    } : undefined}

                    style={{
                        fontFamily: '"Fira Code", "Fira Mono", monospace',
                        minHeight: minHeight,
                        color: '#abb2bf',
                        // Ligature = No Wrap (Music notation needs alignment)
                        // ScribeScript = Wrap (Text/Logic)
                        whiteSpace: isLigature ? 'pre' : 'pre-wrap', 
                        minWidth: isLigature ? 'max-content' : '100%',
                        lineHeight: '21px',
                        zIndex: 1
                    }}
                    textareaClassName="focus:outline-none"
                    placeholder={placeholder}
                />
            </div>
            
            <style jsx global>{`
                /* === SCRIBESCRIPT THEME === */
                
                /* 1. Base Text: Keep your current grey, it's perfect for reading */
                .ss-text-raw { color: #d9dce1ff; } 

                .ss-brace { font-weight: bold; }
                .ss-brace-odd { color: #e5c07b; } /* Gold */
                .ss-brace-even { color: #df8749ff; }

                .ss-var-local { color: #68a5ffff; }
                .ss-var-alias { color: #98c379; } 
                .ss-var-world { color: #ff3b90ff; } 
                
                .ss-dynamic-marker { color: #abb2bf; } 

                .ss-macro { color: #6361ffff;  } 
                .ss-bracket { color: #5646ffff; } 

                .ss-number { color: #7cee7aff; } 
                .ss-operator { color: #abb2bf; }     
                
                .ss-flow-op { color: #f76e6eff; font-weight: bold; } /* : | ~ */

                .ss-metadata { color: #7f848e; font-size: 0.85em; font-style: italic; }

                .ss-brace-match {
                    background-color: rgba(229, 192, 123, 0.15); /* Gold Tint */
                    border-radius: 2px;
                    outline: 1px solid rgba(229, 192, 123, 0.4);
                    box-shadow: 0 0 4px rgba(229, 192, 123, 0.2);
                }
                /* === LIGATURE THEME (Prism .token.*) === */
                
                /* Comments & Punctuation */
                .lang-ligature .token.comment { color: #5c6370; font-style: italic; }
                .lang-ligature .token.punctuation { color: #abb2bf; }
                
                /* Structure */
                .lang-ligature .token.keyword { color: #de53d9ff; }  /* [HEADER] */
                .lang-ligature .token.important { color: #c67d8d; font-weight: bold; } /* {Logic} */
                .lang-ligature .token.operator { color: #e06c75; } /* | Bar lines */

                /* Variables & Values */
                .lang-ligature .token.variable { color: #00ff6aff; } /* @Alias */
                .lang-ligature .token.class-name { color: #e5c07b; } /* [Chord] */
                .lang-ligature .token.function { color: #61afef; }  /* TrackName */
                .lang-ligature .token.string { color: #98c379; }  /* (Tuplet) */
                .lang-ligature .token.number { color: #d19a66; } 

                /* Effects & Modifiers */
                .lang-ligature .token.effect-block { color: #c678dd; } /* ^[Effect] */
                .lang-ligature .token.attr-name { color: #d19a66; }  /* key: */
                .lang-ligature .token.attr-value { color: #4dcec8ff; } /* (value) */
                .lang-ligature .token.builtin { color: #e5c07b; font-weight: bold; } /* Octave ' */

                .lang-ligature .token.sustain { color: #eaeaeb; font-weight: bold; }
                .lang-ligature .token.effect-block { color: #7949ffff; }

                /* SCROLLBARS */
                .scribe-editor-wrapper div::-webkit-scrollbar { height: 8px; width: 8px; }
                .scribe-editor-wrapper div::-webkit-scrollbar-track { background: #21252b; }
                .scribe-editor-wrapper div::-webkit-scrollbar-thumb { background: #3e4451; border-radius: 4px; }
            `}</style>
        </div>
    );
}

                
                
                
                

                
                
                

                
                
                 

                
                
                
                

