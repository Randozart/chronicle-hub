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

// A unique, unlikely-to-be-typed string for placeholders.
const ESCAPE_PLACEHOLDER = '___PLACEHOLDER___';

function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    const escapes: string[] = [];

    // 1. Pre-processing Step: Handle Escapes
    // Find all backticked segments, store their raw inner content,
    // and replace them with a unique placeholder.
    const placeholderLine = line.replace(/`(.+?)`/g, (match, content) => {
        escapes.push(content);
        return `${ESCAPE_PLACEHOLDER}${escapes.length - 1}`;
    });

    // 2. Main Parsing Step (without backticks in the regex)
    // This parser is now "blind" to the escaped content.
    const formattingRegex = /(\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;

    function recursiveParse(subLine: string): React.ReactNode[] {
        const results: React.ReactNode[] = [];
        let lastIndex = 0;
        const matches = Array.from(subLine.matchAll(formattingRegex));

        for (const match of matches) {
            const segment = match[0];
            const index = match.index!;

            // Add plain text before this match
            if (index > lastIndex) {
                results.push(...substituteEscapes(subLine.slice(lastIndex, index), escapes));
            }

            // Process the formatted segment
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

        // Add any remaining plain text after the last match
        if (lastIndex < subLine.length) {
            results.push(...substituteEscapes(subLine.slice(lastIndex), escapes));
        }

        return results;
    }

    return recursiveParse(placeholderLine);
}

/**
 * Takes a string containing placeholders and substitutes the original
 * escaped content back in.
 */
function substituteEscapes(text: string, escapes: string[]): React.ReactNode[] {
    if (!text.includes(ESCAPE_PLACEHOLDER)) {
        return [text];
    }
    
    const parts = text.split(new RegExp(`(${ESCAPE_PLACEHOLDER}\\d+)`, 'g'));

    return parts.map((part, i) => {
        if (part.startsWith(ESCAPE_PLACEHOLDER)) {
            const index = parseInt(part.replace(ESCAPE_PLACEHOLDER, ''), 10);
            return escapes[index];
        }
        return part;
    }).filter(part => part !== ''); // Filter out empty strings from splitting
}