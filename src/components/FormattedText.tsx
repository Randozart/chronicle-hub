'use client';

import React from 'react';

// Main component: Correctly groups lines into paragraphs.
export default function FormattedText({ text }: { text: string | undefined | null; }) {
    if (!text) return null;

    // 1. Split the entire text block by one or more empty lines.
    // This correctly identifies paragraphs separated by double (or more) newlines.
    const paragraphs = text.split(/\n\s*\n/);

    return (
        <>
            {paragraphs.map((paragraph, i) => {
                // Ignore empty paragraphs that might result from splitting.
                if (!paragraph.trim()) return null;

                // 2. For each valid paragraph, split it into individual lines.
                const lines = paragraph.split('\n');
                
                return (
                    // 3. Render a single <p> tag for the entire paragraph.
                    <p key={i} style={{ margin: '0 0 1em 0' }}> 
                        {lines.map((line, j) => (
                            <React.Fragment key={j}>
                                {parseInlineFormatting(line)}
                                {/* 4. Use <br /> for intentional line breaks WITHIN a paragraph. */}
                                {j < lines.length - 1 && <br />} 
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </>
    );
}

// Unified parser for all inline styles: **bold**, *italic*, _italic_, and [emphasis]
function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    // This regex looks for **bold**, _italic_, *italic*, and [emphasis] blocks.
    const formattingRegex = /(\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;
    
    const parts = line.split(formattingRegex);

    return parts.map((segment, i) => {
        if (!segment) return null;

        // BOLD
        if (segment.startsWith('**') && segment.endsWith('**')) {
            // Recursively parse content inside for nested formatting.
            return <strong key={i}>{parseInlineFormatting(segment.slice(2, -2))}</strong>;
        }
        
        // ITALIC (handles both _ and *)
        if ((segment.startsWith('_') && segment.endsWith('_')) || (segment.startsWith('*') && segment.endsWith('*'))) {
            return <em key={i}>{parseInlineFormatting(segment.slice(1, -1))}</em>;
        }
        
        // UNIVERSAL EMPHASIS [ ]
        if (segment.startsWith('[') && segment.endsWith(']')) {
            return (
                <span key={i} className="text-emphasis">
                    {parseInlineFormatting(segment.slice(1, -1))}
                </span>
            );
        }

        // If no formatting matches, return the plain text segment.
        return segment;
    });
}