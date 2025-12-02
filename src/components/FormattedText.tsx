'use client';

import React from 'react';

export default function FormattedText({ text }: { text: string }) {
    if (!text) return null;

    // Split by newlines first to handle paragraphs
    const paragraphs = text.split('\n');

    return (
        <>
            {paragraphs.map((line, i) => (
                <p key={i} style={{ marginBottom: '0.75rem', minHeight: '1rem' }}>
                    {parseMarkdown(line)}
                </p>
            ))}
        </>
    );
}

// Simple parser for *italic*, **bold**, and _italic_
function parseMarkdown(line: string): React.ReactNode[] {
    if (!line) return [];

    // We use a regex that captures the delimiters and the content
    // (\*\*|__)(.*?)\1  -> Bold
    // (\*|_)(.*?)\1     -> Italic
    
    // Strategy: Split by bold, then map those chunks to split by italic
    
    const parts: React.ReactNode[] = [];
    
    // Split by BOLD (**text**)
    const boldSplit = line.split(/(\*\*(?:.*?)\*\*)/g);

    boldSplit.forEach((segment, bIdx) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
            // This is bold content. Strip markers and render.
            const content = segment.slice(2, -2);
            // Allow italics INSIDE bold? (Recursive would be better, but simple is safer for now)
            parts.push(<strong key={`b-${bIdx}`}>{parseItalics(content)}</strong>);
        } else {
            // Normal text (or maybe italic)
            parts.push(<React.Fragment key={`n-${bIdx}`}>{parseItalics(segment)}</React.Fragment>);
        }
    });

    return parts;
}

function parseItalics(text: string): React.ReactNode[] {
    // Split by ITALIC (*text* or _text_)
    // Note: strict check to avoid matching "part_of_variable" if we weren't careful, 
    // but ScribeScript variables should already be resolved by now.
    const italicSplit = text.split(/(\*(?:[^*]+)\*|_(?:[^_]+)_)/g);
    
    return italicSplit.map((segment, i) => {
        if ((segment.startsWith('*') && segment.endsWith('*')) || 
            (segment.startsWith('_') && segment.endsWith('_'))) {
            return <em key={i}>{segment.slice(1, -1)}</em>;
        }
        return segment;
    });
}