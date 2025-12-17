// src/components/admin/ScribeEditor.tsx
'use client';

import Editor from 'react-simple-code-editor';
import { usePrism } from '@/hooks/usePrism';
import { useMemo } from 'react';

// Define minimal error interface to avoid circular dependency
interface EditorError {
    line: number;
    severity: 'error' | 'warning';
}

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
    errors?: EditorError[]; // New Prop
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

    // Error Map for fast lookup
    const errorMap = useMemo(() => {
        const map = new Map<number, 'error' | 'warning'>();
        errors.forEach(e => map.set(e.line, e.severity));
        return map;
    }, [errors]);

    return (
        <div 
            className="scribe-editor-wrapper"
            style={{
                background: '#181a1f',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '14px',
                lineHeight: '1.5',
                position: 'relative',
                display: 'flex', // Flex layout for Gutter + Editor
                overflow: 'hidden' // Container clips content
            }}
        >
            {/* LINE NUMBER GUTTER (Only for Ligature) */}
            {isLigature && (
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
                        
                        return (
                            <div key={n} style={{ height: '21px', lineHeight: '21px', color, fontWeight: weight }}>
                                {n}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EDITOR AREA */}
            <div style={{ 
                flex: 1, 
                // Scroll Logic moves here
                overflowX: isLigature ? 'auto' : 'hidden', 
                overflowY: 'hidden',
                position: 'relative'
            }}>
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
                        // Sync line height with gutter
                        lineHeight: '21px' 
                    }}
                    textareaClassName="focus:outline-none"
                    placeholder={placeholder}
                />
            </div>
            
            <style jsx global>{`
                /* ... (Keep existing token styles) ... */
                .token.comment { color: #5c6370; }
                .token.punctuation { color: #abb2bf; }
                .token.operator { color: #e06c75; }
                .token.keyword { color: #c678dd; } 
                .token.important { color: #c67d8d; font-weight: bold; }

                .token.variable { color: #61afef; }
                .token.attr-name { color: #d19a66; } 
                .token.natural { color: #CBBDA9; }

                .token.function { color: #61afef; } 
                .token.string { color: #98c379; } 
                .token.number { color: #d19a66; } 

                .token.builtin { color: #e5c07b !important; } 
                .token.class-name { color: #e5c07b; }
                .token.attr-value { color: #4dcec8ff; }
                .token.sustain { color: #eaeaeb; font-weight: bold; }

                .token.effect-block { color: #7949ffff; }

                             
                .scribe-editor-wrapper:focus-within {
                    border-color: #61afef;
                    box-shadow: 0 0 0 1px #61afef;
                }

                .scribe-editor-wrapper::-webkit-scrollbar {
                    height: 8px;
                    width: 8px;
                }
                .scribe-editor-wrapper::-webkit-scrollbar-track {
                    background: #111;
                    border-radius: 4px;
                }
                .scribe-editor-wrapper::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                .scribe-editor-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #61afef;
            }


            `}</style>
        </div>
    );
}