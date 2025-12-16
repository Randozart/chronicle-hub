// src/components/admin/ScribeEditor.tsx
'use client';

import Editor from 'react-simple-code-editor';
import { usePrism } from '@/hooks/usePrism';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
}

export default function ScribeEditor({ value, onChange, placeholder, minHeight = "100px", language = 'scribescript' }: Props) {
    
    // Get the stable highlighting function
    const highlight = usePrism(language);

    const isLigature = language === 'ligature';

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
                // --- SCROLL LOGIC ---
                // For Ligature: Auto-scroll horizontally, hide vertical (let it expand)
                // For Scribe: Hide horizontal (wrap), hide vertical (expand)
                overflowX: isLigature ? 'auto' : 'hidden', 
                overflowY: 'hidden' 
            }}
        >
            <Editor
                value={value || ""}
                onValueChange={onChange}
                highlight={highlight} 
                padding={10}
                style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    minHeight: minHeight,
                    color: '#abb2bf',
                    // --- WRAP LOGIC ---
                    // Ligature must NOT wrap to preserve grid alignment.
                    // ScribeScript text should wrap for readability.
                    whiteSpace: isLigature ? 'pre' : 'pre-wrap', 
                    // Ensure the editor expands as wide as the longest line in Ligature mode
                    minWidth: isLigature ? 'max-content' : '100%'
                }}
                textareaClassName="focus:outline-none"
                placeholder={placeholder}
            />
            
            <style jsx global>{`
                /* General Tokens */
                .token.comment { color: #5c6370; }
                .token.punctuation { color: #abb2bf; }
                .token.operator { color: #e06c75; }
                .token.keyword { color: #c678dd; } 
                .token.important { color: #c678dd; font-weight: bold; }

                /* ScribeScript Specific */
                .token.variable { color: #61afef; }
                .token.attr-name { color: #d19a66; }
                
                /* Ligature Specific */
                .token.function { color: #61afef; } 
                .token.string { color: #98c379; } 
                .token.number { color: #d19a66; } 
                
                .scribe-editor-wrapper:focus-within {
                    border-color: #61afef;
                    box-shadow: 0 0 0 1px #61afef;
                }

                /* Custom Scrollbar for the Horizontal Scroll */
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