'use client';

import React from 'react';

// Main component: Splits text into paragraphs and processes each line.
export default function FormattedText({ text }: { text: string | undefined | null; }) {
    if (!text) return null;

    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, i) => {
                // Check for the special Black Crown block-level format FIRST.
                // The regex looks for the literal start and end tags on their own line.
                const specialMatch = line.match(/^\[\\\\\|\\\](.*?)\[\/\|\/\/\]$/);
                
                if (specialMatch) {
                    const content = specialMatch[1].trim();
                    return (
                        <div key={i} className="special-block-text">
                            {`/// ${content} ///`}
                        </div>
                    );
                }

                // If it's not a special block, treat it as a standard paragraph
                // and parse for inline formatting.
                return (
                    <p key={i} style={{ marginBottom: '0.75rem', minHeight: '1rem' }}>
                        {parseInlineFormatting(line)}
                    </p>
                );
            })}
        </>
    );
}

// Unified parser for all inline styles: **bold**, *italic*, _italic_, and [emphasis]
function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    // 1. Unified Regex for **Bold**, _Italic_, and [Emphasis]
    // Note: We use [^\]]+ to match everything inside brackets
    const formattingRegex = /(\*\*(?:.+?)\*\*|_(?:.+?)_| \*(?:.+?)\*|\[(?:[^\]]+)\])/g;
    
    const parts = line.split(formattingRegex);

    return parts.map((segment, i) => {
        if (!segment) return null;

        // BOLD
        if (segment.startsWith('**') && segment.endsWith('**')) {
            return <strong key={i}>{parseInlineFormatting(segment.slice(2, -2))}</strong>;
        }
        
        // ITALIC
        if ((segment.startsWith('_') && segment.endsWith('_')) || (segment.startsWith(' *') && segment.endsWith('*'))) {
            const content = segment.startsWith('_') ? segment.slice(1, -1) : segment.slice(2, -1);
            return <em key={i}>{parseInlineFormatting(content)}</em>;
        }
        
        // UNIVERSAL EMPHASIS [ ]
        if (segment.startsWith('[') && segment.endsWith(']')) {
            return (
                <span key={i} className="text-emphasis">
                    {parseInlineFormatting(segment.slice(1, -1))}
                </span>
            );
        }

        return segment;
    });
}