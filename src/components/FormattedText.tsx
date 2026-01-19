'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

// SECURITY CONFIG
// Whitelist of trusted domains for externally hosted images.
// No external websites are whitelisted by default to prevent Tabnabbing or Phishing.
// For now, I'm just including imgur and ChronicleHub.
const IMAGE_HOSTNAME_WHITELIST = [
    'i.imgur.com',
    'assets.chroniclehub.com', 

];

interface FormattedTextProps {
    text: string | undefined | null;
    inline?: boolean; 
}

export default function FormattedText({ text, inline = false }: FormattedTextProps) {
    if (!text) return null;

    const processedText = useMemo(() => {
        let processed = text;
        
        // Convert [Emphasis] to Markdown Link syntax, BUT ignore escaped brackets \[...\]
        // Brackets are still included, because they were part of the StoryNexus syntax for colored text.
        
        // Regex Explanation:
        // 1. (^|[^\\])         -> Start of line OR any character that isn't a backslash (Group 1)
        // 2. \[                -> Opening bracket
        // 3. ((?:[^\]\\]|\\.)+) -> Content Group (Group 2):
        //                         Matches any char that isn't ] or \, OR a backslash followed by any char.
        //                         This allows \[ and \] to exist inside the block without breaking it.
        // 4. \]                -> Closing bracket
        // 5. (?!\()            -> Negative lookahead (ensure it's not a standard Markdown link)
        processed = processed.replace(/(^|[^\\])\[((?:[^\]\\]|\\.)+)\](?!\()/g, '$1[$2](#emphasis)');
        
        // Preserve newlines
        processed = processed.replace(/\n/g, '  \n');

        return processed;
    }, [text]);

    const Wrapper = inline ? 'span' : 'div';

    return (
        <Wrapper className={inline ? "formatted-text-inline" : "formatted-text-block"}>
            <ReactMarkdown
                components={{
                    a: ({ href, children, ...props }) => {
                        if (href === '#emphasis') {
                            return <span className="text-emphasis">{children}</span>;
                        }
                        
                        return (
                            <a 
                                href={href} 
                                target="_blank"          
                                rel="noopener noreferrer"
                                {...props} 
                                style={{ color: 'var(--accent-highlight)', textDecoration: 'underline' }}
                                title="Opens in a new tab"
                            >
                                {children}
                                <span style={{fontSize: '0.8em', verticalAlign: 'super', marginLeft: '2px'}}>↗</span>
                            </a>
                        );
                    },
                    
                    img: ({ src, alt, ...props }) => {
                        if (typeof src !== 'string' || !src) return null;

                        try {
                            const url = new URL(src);
                            if (IMAGE_HOSTNAME_WHITELIST.includes(url.hostname)) {
                                return (
                                    <img 
                                        src={src} 
                                        alt={alt} 
                                        referrerPolicy="no-referrer" 
                                        style={{ maxWidth: '100%', height: 'auto', borderRadius: 'var(--border-radius)' }} 
                                        {...props} 
                                    />
                                );
                            }
                        } catch (e) {
                            console.warn("Invalid image URL detected:", src);
                            return <em style={{color: 'var(--danger-color)'}}>[Invalid Image URL]</em>;
                        }

                        return <em style={{color: 'var(--danger-color)'}}>[Untrusted Image Host]</em>;
                    },

                    p: ({ children }) => {
                        if (inline) {
                            return <span style={{ display: 'inline' }}>{children}</span>;
                        }
                        return <p style={{ margin: '0 0 1em 0' }}>{children}</p>;
                    },

                    code: ({ children }) => (
                        <code style={{ 
                            background: 'rgba(127, 127, 127, 0.2)', 
                            padding: '2px 4px', 
                            borderRadius: '3px', 
                            fontSize: '0.9em',
                            fontFamily: 'monospace',
                            color: 'var(--text-primary)'
                        }}>
                            {children}
                        </code>
                    )
                }}
            >
                {processedText}
            </ReactMarkdown>
        </Wrapper>
    );
}

/*
 * MARKDOWN SYNTAX REFERENCE
 * ----------------------------------------------------------------------
 * This component supports standard CommonMark syntax with custom extensions.
 *
 * CUSTOM SYNTAX:
 * [Text]             -> Highlighted/Emphasis text (Theme color)
 * \[Text\]           -> Literal bracketed text (No highlight)
 * [\[Tag\] Text]     -> Highlighted text containing brackets
 *
 * STANDARD MARKDOWN:
 * **Bold**           -> Bold text
 * *Italic*           -> Italic text
 * # Header 1-6       -> Headings (# H1, ## H2, etc.)
 * > Quote            -> Blockquote
 * - List Item        -> Unordered List
 * 1. List Item       -> Ordered List
 * `Code`             -> Inline Monospace/Code
 * ```                -> Code Block
 * ---                -> Horizontal Rule (Divider)
 * [Link](url)        -> External Hyperlink
 * ![Alt](url)        -> Image
 *
 * Note: Newlines are automatically preserved as line breaks.
 */