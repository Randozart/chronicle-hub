'use client';

import React from 'react';

// Main component: Correctly groups lines into paragraphs.
export default function FormattedText({ text }: { text: string | undefined | null; }) {
    if (!text) return null;

    // 1. Split the entire text block by one or more empty lines.
    const paragraphs = text.split(/\n\s*\n/);

    return (
        <>
            {paragraphs.map((paragraph, i) => {
                if (!paragraph.trim()) return null;

                const lines = paragraph.split('\n');
                
                return (
                    <p key={i} style={{ margin: '0 0 1em 0' }}> 
                        {lines.map((line, j) => (
                            <React.Fragment key={j}>
                                {parseInlineFormatting(line)}
                                {j < lines.length - 1 && <br />} 
                            </React.Fragment>
                        ))}
                    </p>
                );
            })}
        </>
    );
}

function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    // Regex now includes backticks as the first priority.
    const formattingRegex = /(`(?:.+?)`|\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;
    
    const parts = line.split(formattingRegex);

    return parts.map((segment, i) => {
        if (!segment) return null;

        // If a segment is wrapped in backticks, we return ONLY the inner content
        // as a plain string. This effectively "escapes" it from further parsing
        // and removes the backticks from the final output.
        if (segment.startsWith('`') && segment.endsWith('`')) {
            return segment.slice(1, -1);
        }

        // BOLD
        if (segment.startsWith('**') && segment.endsWith('**')) {
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
