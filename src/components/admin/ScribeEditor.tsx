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
    mode?: 'text' | 'condition' | 'effect'; 
}

export default function ScribeEditor({ 
    value, 
    onChange, 
    placeholder, 
    minHeight = "100px", 
    language = 'scribescript',
    errors = [],
    mode = 'text' // NEW PROP with Default
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
            // Pass the mode prop to the tokenizer
            return highlightScribeScript(code, cursorOffset, mode);
        }
    };

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
                /* 1. Base Text */
                .ss-text-raw { color: #bec0c5ff; } 
                .ss-md-bold { 
                    font-weight: bold; 
                }
                .ss-md-italic { 
                    font-style: italic; 
                }
                /* 2. Braces */
                .ss-brace { font-weight: bold; }
                .ss-brace-odd { color: #e5c07b; } /* Gold */
                .ss-brace-even { color: #df8749ff; } /* Copper */

                /* 3. Variables */
                .ss-var-local { color: #61afef; font-weight: bold; } 
                .ss-var-alias { color: #98c379;  font-weight: bold;} 
                .ss-var-world { color: #ff3b90ff;  font-weight: bold;} 
                
                .ss-dynamic-marker { color: #9ba1adff; } 

                /* 4. Macros */
                .ss-macro { color: #6361ffff;  font-weight: bold;} /* Royal Blue */
                .ss-bracket { color: #5646ffff; } /* Deep Blue */

                /* 5. Values & Math (The New Group) */
                .ss-number { color: #7cee7aff; } /* Light Lime (Values) */
                .ss-math { color: #bec0c5ff; font-weight: bold; }

                /* 6. Standard Operators (Comparison/Assignment) */
                .ss-operator { color: #9ba1adff; } /* Grey */    
                
                /* 7. Flow Control */
                .ss-flow-op { color: #f77e6eff; font-weight: bold; } /* Soft Pink */

                /* 8. Metadata */
                .ss-metadata { color: #617382ff; font-style: italic; }
                
                .ss-js-keyword { 
                    color: #ff79c6; /* Vibrant Pink/Magenta (Dracula Theme inspired) */
                    font-style: italic; 
                    font-weight: bold;
                    text-shadow: 0 0 2px rgba(255, 121, 198, 0.2); /* Subtle glow */
                }

                .ss-comment { 
                    color: #6A9955; 
                    font-style: italic;
                    font-family: "Fira Code", monospace; /* Enforce mono to look "code-like" */
                }
                 .ss-brace-comment { 
                    color: #6A9955; 
                    font-style: italic;
                }

                /* Matched Brace */
                .ss-brace-match {
                    background-color: rgba(228, 222, 211, 0.15);
                    border-radius: 2px;
                    outline: 1px solid rgba(230, 225, 217, 0.4);
                    box-shadow: 0 0 4px rgba(224, 221, 215, 0.2);
                }
                /* === LIGATURE THEME (Restored One Dark) === */
                
                /* 1. Comments & Punctuation */
                .lang-ligature .token.comment { color: #5c6370; font-style: italic; }
                .lang-ligature .token.punctuation { color: #abb2bf; } /* Grey brackets/commas */
                
                /* 2. Headers: [CONFIG] -> Purple */
                .lang-ligature .token.keyword { color: #ee3feeff; }  

                /* 3. Keys: BPM:, Trumpet: -> Orange */
                .lang-ligature .token.attr-name { color: #dd9b5dff; }  

                /* 4. Values/Instruments: noir_trumpet -> Cyan */
                .lang-ligature .token.string { color: #98c379; }  /* (Tuplet) */
                .lang-ligature .token.attr-value { color: #63c9d6ff; }

                /* 5. Track Names (Functions): Trumpet -> Blue */
                .lang-ligature .token.function { color: #61afef; }  

                /* 6. Bar Lines: | -> Red */
                .lang-ligature .token.operator { color: #ca4e59ff; font-weight: bold; } 

                /* 7. Numbers/Notes: 64, 5, 7 -> Orange */
                .lang-ligature .token.number { color: #e7a263ff; } 

                /* 8. Logic/Important: { } -> Cyan/Teal */
                .lang-ligature .token.important { color: #56b6c2; font-weight: bold; } 

                /* 9. Builtins: Octave modifiers -> Yellow/Gold */
                .lang-ligature .token.builtin { color: #ead363ff; } 

                /* 10. Sustain/Silence: - . -> Muted Grey */
                .lang-ligature .token.sustain { color: #e2e6eeff; font-weight: bold;}
                
                /* 11. Effect Blocks: ^[...] -> Purple */
                .lang-ligature .token.effect-block { color: #a678ddff; } 

                /* 12. Variables: @Alias -> Red/Coral */
                .lang-ligature .token.variable { color: #95df61ff; } /* @Alias */
                .lang-ligature .token.class-name { color: #e4d233ff; } /* [Chord] */

                /* SCROLLBARS */
                .scribe-editor-wrapper div::-webkit-scrollbar { height: 8px; width: 8px; }
                .scribe-editor-wrapper div::-webkit-scrollbar-track { background: #21252b; }
                .scribe-editor-wrapper div::-webkit-scrollbar-thumb { background: #3e4451; border-radius: 4px; }
            `}</style>
        </div>
    );
}

                
       
            // /* === SCRIBESCRIPT THEME (Final Mix) === */
                
            //     /* 1. Base Text */
            //     .ss-text-raw { color: #d9dce1ff; } 

            //     /* 2. Braces: Mauve & Red (Distinct Structure) */
            //     .ss-brace { font-weight: bold; }
            //     .ss-brace-odd { color: #c67d8d; } /* Mauve */
            //     .ss-brace-even { color: #e06c75; } /* Red */

            //     /* 3. Variables: Electric Blue (Data) */
            //     .ss-var-local { color: #61afef; font-weight: bold; } 
            //     .ss-var-alias { color: #98c379; } 
            //     .ss-var-world { color: #ff3b90ff; } 
                
            //     /* Dynamic Marker matches logic punctuation */
            //     .ss-dynamic-marker { color: #abb2bf; } 

            //     /* 4. Macros: Royal Blue (Action) */
            //     .ss-macro { color: #6361ffff; } 
            //     /* Brackets: Deep Blue (Separates args) */
            //     .ss-bracket { color: #5646ffff; } 

            //     /* 5. Values: Light Lime */
            //     .ss-number { color: #7cee7aff; } 
                
            //     /* 6. Math: Pale Yellow (Distinct from Operators) */
            //     .ss-math { color:  #abb2bf; font-weight: bold;}

            //     /* 7. Standard Operators: Grey (Assignments, Separators) */
            //     .ss-operator { color: #abb2bf; }    
                
            //     /* 8. Flow Control: Purple (Logic Gates) */
            //     .ss-flow-op { color: #c67d8d; font-weight: bold; } 

            //     /* 9. Metadata */
            //     .ss-metadata { color: #7f848e; font-size: 0.85em; font-style: italic; }

            //     /* Matched Brace Highlight: Gold Tint */
            //     .ss-brace-match {
            //         background-color: rgba(229, 192, 123, 0.15);
            //         border-radius: 2px;
            //         outline: 1px solid rgba(229, 192, 123, 0.4);
            //         box-shadow: 0 0 4px rgba(229, 192, 123, 0.2);
            //     }
