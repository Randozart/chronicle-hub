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

    // Regex includes backticks as the first priority.
    const formattingRegex = /(`(?:.+?)`|\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;
    
    const results: React.ReactNode[] = [];
    let lastIndex = 0;

    const matches = Array.from(line.matchAll(formattingRegex));

    for (const match of matches) {
        const segment = match[0];
        // The index will always be defined for `matchAll` results
        const index = match.index!; 

        // 1. Add the plain text that comes before this match.
        if (index > lastIndex) {
            results.push(line.slice(lastIndex, index));
        }

        // 2. Process the matched formatting segment.
        
        // ESCAPE with backticks: Renders inner content as a plain string, preventing recursion.
        if (segment.startsWith('`') && segment.endsWith('`')) {
            results.push(segment.slice(1, -1));
        }
        // BOLD
        else if (segment.startsWith('**') && segment.endsWith('**')) {
            results.push(<strong key={index}>{parseInlineFormatting(segment.slice(2, -2))}</strong>);
        }
        // ITALIC (handles both _ and *)
        else if ((segment.startsWith('_') && segment.endsWith('_')) || (segment.startsWith('*') && segment.endsWith('*'))) {
            results.push(<em key={index}>{parseInlineFormatting(segment.slice(1, -1))}</em>);
        }
        // UNIVERSAL EMPHASIS [ ]
        else if (segment.startsWith('[') && segment.endsWith(']')) {
            results.push(
                <span key={index} className="text-emphasis">
                    {parseInlineFormatting(segment.slice(1, -1))}
                </span>
            );
        }

        // 3. Update our position in the string to the end of the current match.
        lastIndex = index + segment.length;
    }

    // 4. Add any remaining plain text after the last match.
    if (lastIndex < line.length) {
        results.push(line.slice(lastIndex));
    }

    return results;
}