'use client';

import React from 'react';

// Main component: Correctly groups lines into paragraphs.
export default function FormattedText({ text }: { text: string | undefined | null; }) {
    if (!text) return null;

    // Split the entire text block by one or more empty lines.
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

// A character from the Unicode Private Use Area.
// This is guaranteed not to be part of the formatting syntax or user input.
const PLACEHOLDER_SENTINEL = '\uE000';

function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    const escapes: string[] = [];

    // 1. Pre-processing Step: Handle Escapes
    // Replace backticked content with a unique, non-parsable placeholder.
    const placeholderLine = line.replace(/`(.+?)`/g, (match, content) => {
        escapes.push(content);
        // The placeholder is now wrapped in sentinels, e.g., "\uE0000\uE000"
        return `${PLACEHOLDER_SENTINEL}${escapes.length - 1}${PLACEHOLDER_SENTINEL}`;
    });

    // Helper to substitute placeholders back to their original content.
    function substituteEscapes(text: string): React.ReactNode[] {
        if (!text.includes(PLACEHOLDER_SENTINEL)) {
            return [text];
        }
        
        // Split the string by the placeholder pattern, keeping the delimiters.
        const placeholderRegex = new RegExp(`(${PLACEHOLDER_SENTINEL}\\d+${PLACEHOLDER_SENTINEL})`, 'g');
        const parts = text.split(placeholderRegex);

        return parts.map((part) => {
            if (part.startsWith(PLACEHOLDER_SENTINEL) && part.endsWith(PLACEHOLDER_SENTINEL)) {
                // Extract the index from between the sentinels.
                const index = parseInt(part.slice(1, -1), 10);
                return escapes[index];
            }
            return part;
        }).filter(part => part !== ''); // Filter out empty strings from splitting.
    }

    // 2. Main Parsing Step
    // The regex no longer contains the backtick rule.
    const formattingRegex = /(\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;

    function recursiveParse(subLine: string): React.ReactNode[] {
        const results: React.ReactNode[] = [];
        let lastIndex = 0;
        const matches = Array.from(subLine.matchAll(formattingRegex));

        for (const match of matches) {
            const segment = match[0];
            const index = match.index!;

            // Add plain text before this match (substituting any placeholders).
            if (index > lastIndex) {
                results.push(...substituteEscapes(subLine.slice(lastIndex, index)));
            }

            // Process the formatted segment.
            if (segment.startsWith('**') && segment.endsWith('**')) {
                results.push(<strong key={index}>{recursiveParse(segment.slice(2, -2))}</strong>);
            } else if ((segment.startsWith('_') && segment.endsWith('_')) || (segment.startsWith('*') && segment.endsWith('*'))) {
                results.push(<em key={index}>{recursiveParse(segment.slice(1, -1))}</em>);
            } else if (segment.startsWith('[') && segment.endsWith(']')) {
                results.push(
                    <span key={index} className="text-emphasis">
                        {recursiveParse(segment.slice(1, -1))}
                    </span>
                );
            }
            lastIndex = index + segment.length;
        }

        // Add any remaining plain text after the last match.
        if (lastIndex < subLine.length) {
            results.push(...substituteEscapes(subLine.slice(lastIndex)));
        }

        return results;
    }

    // 3. Kick off the process.
    return recursiveParse(placeholderLine);
}