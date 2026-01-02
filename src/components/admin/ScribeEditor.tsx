'use client';

import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs'; 
import { useMemo, useState, useEffect } from 'react';
import { highlightScribeScript } from '@/utils/scribeHighlighter';
import { ligatureGrammar } from '@/utils/prism-ligature'; 
import { LintError } from '@/engine/audio/linter'; 

// Import Prism base styles
import 'prismjs/components/prism-clike';
import 'prismjs/themes/prism-dark.css'; 

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
    errors?: LintError[]; 
    mode?: 'text' | 'condition' | 'effect'; 
}

export default function ScribeEditor({ 
    value, 
    onChange, 
    placeholder, 
    minHeight = "100px", 
    language = 'scribescript',
    errors = [],
    mode = 'text'
}: Props) {
    
    useEffect(() => {
        if (!languages.ligature) {
            languages.ligature = ligatureGrammar;
        }
    }, []);

    const [cursorOffset, setCursorOffset] = useState<number | null>(null);
    const isLigature = language === 'ligature';

    // --- HIGHLIGHTER STRATEGY ---
    const highlightCode = (code: string) => {
        if (isLigature) {
            return highlight(code, languages.ligature || ligatureGrammar, 'ligature'); 
        } else {
            return highlightScribeScript(code, cursorOffset, mode);
        }
    };

    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);
    
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
                background: 'var(--tool-bg-input)', // UPDATED
                border: '1px solid var(--tool-border)', // UPDATED
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
                background: 'var(--tool-bg-sidebar)', // UPDATED
                borderRight: '1px solid var(--tool-border)', // UPDATED
                color: 'var(--tool-text-dim)', // UPDATED
                fontFamily: '"Fira Code", "Fira Mono", monospace',
                userSelect: 'none'
            }}>
                {lineNumbers.map(n => {
                    const status = errorMap.get(n);
                    const color = status === 'error' ? 'var(--danger-color)' : status === 'warning' ? 'var(--warning-color)' : 'inherit';
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
                             borderBottom: err.severity === 'error' ? '1px dashed var(--danger-color)' : '1px dashed var(--warning-color)'
                         }} />
                     ))}
                </div>

                <Editor
                    value={value || ""}
                    onValueChange={onChange}
                    highlight={highlightCode} 
                    padding={10}
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
                        color: 'var(--tool-text-main)', // UPDATED: Adapts to theme
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
                /* === SCRIBESCRIPT THEME (Dark Default) === */
                .ss-text-raw { color: #bec0c5; } 
                .ss-md-bold { font-weight: bold; }
                .ss-md-italic { font-style: italic; }
                .ss-brace { font-weight: bold; }
                .ss-brace-odd { color: #e5c07b; } /* Gold */
                .ss-brace-even { color: #df8749; } /* Copper */

                .ss-var-local { color: #61afef; font-weight: bold; } 
                .ss-var-alias { color: #98c379;  font-weight: bold;} 
                .ss-var-world { color: #ff3b90;  font-weight: bold;} 
                
                .ss-dynamic-marker { color: #9ba1ad; } 

                .ss-macro { color: #6361ff; font-weight: bold;} 
                .ss-bracket { color: #5646ff; } 

                .ss-number { color: #7cee7a; } 
                .ss-math { color: #bec0c5; font-weight: bold; }
                .ss-operator { color: #9ba1ad; }    
                .ss-flow-op { color: #f77e6e; font-weight: bold; } 

                .ss-metadata { color: #617382; font-style: italic; }
                .ss-js-keyword { color: #ff79c6; font-style: italic; font-weight: bold; text-shadow: 0 0 2px rgba(255, 121, 198, 0.2); }

                .ss-comment, .ss-brace-comment { color: #6A9955; font-style: italic; font-family: "Fira Code", monospace; }

                .ss-brace-match {
                    background-color: rgba(228, 222, 211, 0.15);
                    border-radius: 2px;
                    outline: 1px solid rgba(230, 225, 217, 0.4);
                    box-shadow: 0 0 4px rgba(224, 221, 215, 0.2);
                }

                /* === LIGHT MODE OVERRIDES (Atom One Light Inspired) === */
                :root[data-global-theme='light'] .ss-text-raw { color: #383a42; }
                :root[data-global-theme='light'] .ss-brace-odd { color: #c18401; } /* Dark Gold */
                :root[data-global-theme='light'] .ss-brace-even { color: #986801; } /* Dark Copper */
                
                :root[data-global-theme='light'] .ss-var-local { color: #4078f2; } /* Dark Blue */
                :root[data-global-theme='light'] .ss-var-alias { color: #50a14f; } /* Green */
                :root[data-global-theme='light'] .ss-var-world { color: #e45649; } /* Red */
                :root[data-global-theme='light'] .ss-dynamic-marker { color: #4c4d50ff;; }

                :root[data-global-theme='light'] .ss-macro { color: #a626a4; } /* Purple */
                :root[data-global-theme='light'] .ss-bracket { color: #4078f2; }
                
                :root[data-global-theme='light'] .ss-number { color: #986801; } /* Orange/Brown */
                :root[data-global-theme='light'] .ss-math { color: #383a42; }
                :root[data-global-theme='light'] .ss-operator { color: #4c4d50ff; }
                :root[data-global-theme='light'] .ss-flow-op { color: #e45649; }

                :root[data-global-theme='light'] .ss-metadata { color: #a0a1a7; }
                :root[data-global-theme='light'] .ss-brace-match {
                    background-color: rgba(0, 0, 0, 0.1);
                    outline: 1px solid rgba(0, 0, 0, 0.2);
                }

                /* === LIGATURE THEME (Dark Default) === */
                .lang-ligature .token.comment { color: #5c6370; font-style: italic; }
                .lang-ligature .token.punctuation { color: #abb2bf; } 
                .lang-ligature .token.keyword { color: #ee3fee; }  
                .lang-ligature .token.attr-name { color: #dd9b5d; }  
                .lang-ligature .token.string { color: #98c379; } 
                .lang-ligature .token.attr-value { color: #63c9d6; }
                .lang-ligature .token.function { color: #61afef; }  
                .lang-ligature .token.operator { color: #ca4e59; font-weight: bold; } 
                .lang-ligature .token.number { color: #e7a263; } 
                .lang-ligature .token.important { color: #56b6c2; font-weight: bold; } 
                .lang-ligature .token.builtin { color: #ead363; } 
                .lang-ligature .token.sustain { color: #e2e6ee; font-weight: bold;}
                .lang-ligature .token.effect-block { color: #a678dd; } 
                .lang-ligature .token.variable { color: #95df61; } 
                .lang-ligature .token.class-name { color: #e4d233; }

                /* === LIGATURE LIGHT MODE === */
                :root[data-global-theme='light'] .lang-ligature .token.comment { color: #a0a1a7; }
                :root[data-global-theme='light'] .lang-ligature .token.punctuation { color: #383a42; }
                :root[data-global-theme='light'] .lang-ligature .token.keyword { color: #a626a4; } /* Purple */
                :root[data-global-theme='light'] .lang-ligature .token.attr-name { color: #986801; } /* Orange */
                :root[data-global-theme='light'] .lang-ligature .token.string { color: #50a14f; } /* Green */
                :root[data-global-theme='light'] .lang-ligature .token.function { color: #4078f2; } /* Blue */
                :root[data-global-theme='light'] .lang-ligature .token.number { color: #986801; }

                /* SCROLLBARS */
                .scribe-editor-wrapper div::-webkit-scrollbar { height: 8px; width: 8px; }
                .scribe-editor-wrapper div::-webkit-scrollbar-track { background: var(--tool-bg-sidebar); }
                .scribe-editor-wrapper div::-webkit-scrollbar-thumb { background: var(--tool-border-highlight); border-radius: 4px; }
            `}</style>
        </div>
    );
}