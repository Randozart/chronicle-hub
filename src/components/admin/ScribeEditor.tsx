'use client';

import React from 'react';
import Editor from 'react-simple-code-editor';
import Prism from '@/utils/prism-scribescript'; 
import 'prismjs/themes/prism-tomorrow.css'; 

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function ScribeEditor({ value, onChange, placeholder, minHeight = "100px" }: Props) {
    
    const highlight = (code: string) => {
        return Prism.highlight(code, Prism.languages.scribescript, 'scribescript');
    };

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
                // We move minHeight to the editor container to ensure it grows
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
                }}
                textareaClassName="focus:outline-none"
                placeholder={placeholder}
            />
            
            <style jsx global>{`
                .token.variable { color: #61afef; font-weight: bold; } 
                .token.logic-block { color: #c678dd; } 
                .token.tag { color: #98c379; } 
                .token.operator { color: #e06c75; } 
                .token.punctuation { color: #abb2bf; }
                .token.attr-name { color: #d19a66; }
                
                .scribe-editor-wrapper:focus-within {
                    border-color: #61afef;
                    box-shadow: 0 0 0 1px #61afef;
                }
            `}</style>
        </div>
    );
}