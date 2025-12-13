// src/components/admin/ScribeEditor.tsx
'use client';

import Editor from 'react-simple-code-editor';

// Import the new hook
import { usePrism } from '@/hooks/usePrism';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
}

export default function ScribeEditor({ value, onChange, placeholder, minHeight = "100px", language = 'scribescript' }: Props) {
    
    // --- THE FIX ---
    // Get the stable highlighting function from our custom hook.
    // This is now completely decoupled from the component's render cycle.
    const highlight = usePrism(language);

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
            }}
        >
            <Editor
                value={value || ""}
                onValueChange={onChange}
                highlight={highlight} // Use the function from the hook
                padding={10}
                style={{
                    fontFamily: '"Fira Code", "Fira Mono", monospace',
                    minHeight: minHeight,
                    color: '#abb2bf', 
                }}
                textareaClassName="focus:outline-none"
                placeholder={placeholder}
            />
            
            <style jsx global>{`
                /* General Tokens */
                .token.comment { color: #5c6370; }
                .token.punctuation { color: #abb2bf; }
                .token.operator { color: #e06c75; }
                .token.keyword { color: #c678dd; } /* Headers */
                .token.important { color: #c678dd; font-weight: bold; } /* Scribe braces */

                /* ScribeScript Specific */
                .token.variable { color: #61afef; }
                .token.attr-name { color: #d19a66; } /* Config Keys */
                
                /* Ligature Specific */
                .token.function { color: #61afef; } /* Track Names */
                .token.string { color: #98c379; } /* Tuplets */
                .token.number { color: #d19a66; } /* Notes */
                
                .scribe-editor-wrapper:focus-within {
                    border-color: #61afef;
                    box-shadow: 0 0 0 1px #61afef;
                }
            `}</style>
        </div>
    );
}