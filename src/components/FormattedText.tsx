'use client';

import React from 'react';

interface FormattedTextProps {
    text: string | undefined | null;
    inline?: boolean; 
}

export default function FormattedText({ text, inline = false }: FormattedTextProps) {
    if (!text) return null;
    const renderLines = (blockText: string) => {
        const lines = blockText.split('\n');
        return lines.map((line, j) => (
            <React.Fragment key={j}>
                {parseInlineFormatting(line)}
                {j < lines.length - 1 && <br />} 
            </React.Fragment>
        ));
    };

    if (inline) {
        return <span className="formatted-text-inline">{renderLines(text)}</span>;
    }

    const paragraphs = text.split(/\n\s*\n/);

    return (
        <>
            {paragraphs.map((paragraph, i) => {
                if (!paragraph.trim()) return null;
                
                return (
                    <p key={i} style={{ margin: '0 0 1em 0' }}> 
                        {renderLines(paragraph)}
                    </p>
                );
            })}
        </>
    );
}
const PLACEHOLDER_SENTINEL = '\uE000';
function parseInlineFormatting(line: string): React.ReactNode[] {
    if (!line) return [];

    const escapes: string[] = [];
    const placeholderLine = line.replace(/`(.+?)`/g, (match, content) => {
        escapes.push(content);
        return `${PLACEHOLDER_SENTINEL}${escapes.length - 1}${PLACEHOLDER_SENTINEL}`;
    });

    function substituteEscapes(text: string): React.ReactNode[] {
        if (!text.includes(PLACEHOLDER_SENTINEL)) {
            return [text];
        }
        const placeholderRegex = new RegExp(`(${PLACEHOLDER_SENTINEL}\\d+${PLACEHOLDER_SENTINEL})`, 'g');
        const parts = text.split(placeholderRegex);

        return parts.map((part) => {
            if (part.startsWith(PLACEHOLDER_SENTINEL) && part.endsWith(PLACEHOLDER_SENTINEL)) {
                const index = parseInt(part.slice(1, -1), 10);
                return escapes[index];
            }
            return part;
        }).filter(part => part !== '');
    }
    const formattingRegex = /(\*\*(?:.+?)\*\*|_(?:.+?)_|\*(?:.+?)\*|\[(?:[^\]]+)\])/g;

    function recursiveParse(subLine: string): React.ReactNode[] {
        const results: React.ReactNode[] = [];
        let lastIndex = 0;
        const matches = Array.from(subLine.matchAll(formattingRegex));

        for (const match of matches) {
            const segment = match[0];
            const index = match.index!;

            if (index > lastIndex) {
                results.push(...substituteEscapes(subLine.slice(lastIndex, index)));
            }

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

        if (lastIndex < subLine.length) {
            results.push(...substituteEscapes(subLine.slice(lastIndex)));
        }

        return results;
    }

    return recursiveParse(placeholderLine);
}