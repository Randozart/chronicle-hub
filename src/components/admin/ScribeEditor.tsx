'use client';

import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs'; 
import { useMemo, useState, useEffect } from 'react';
import { highlightScribeScript } from '@/utils/scribeHighlighter';
import { ligatureGrammar } from '@/utils/prism-ligature'; 
import { LintError } from '@/engine/audio/linter'; 

import 'prismjs/components/prism-clike';
import 'prismjs/themes/prism-dark.css'; 

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    minHeight?: string;
    language?: 'scribescript' | 'ligature';
    errors?: LintError[]; 
    mode?: 'text' | 'condition' | 'effect'; 
    showLineNumbers?: boolean; 
}

export default function ScribeEditor({ 
    value, 
    onChange, 
    placeholder, 
    minHeight = "100px", 
    language = 'scribescript',
    errors = [],
    mode = 'text',
    showLineNumbers = false 
}: Props) {
    
    useEffect(() => {
        if (!languages.ligature) {
            languages.ligature = ligatureGrammar;
        }
    }, []);

    const [cursorOffset, setCursorOffset] = useState<number | null>(null);
    const isLigature = language === 'ligature';

    const highlightCode = (code: string) => {
        if (isLigature) {
            return highlight(code, languages.ligature || ligatureGrammar, 'ligature'); 
        } else {
            return highlightScribeScript(code, cursorOffset, mode);
        }
    };

    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);
    const visualErrors = useMemo(() => errors.filter(e => e.severity !== 'info'), [errors]);
    const infoMessages = useMemo(() => errors.filter(e => e.severity === 'info'), [errors]);

    const errorMap = useMemo(() => {
        const map = new Map<number, 'error' | 'warning'>();
        visualErrors.forEach(e => map.set(e.line, e.severity as 'error' | 'warning'));
        return map;
    }, [visualErrors]);

    const scopeClass = isLigature ? 'lang-ligature' : 'lang-scribescript';
    const displayGutter = showLineNumbers || visualErrors.length > 0;
    const hasGutter = displayGutter; 
    const effectiveWhiteSpace = isLigature || hasGutter ? 'pre' : 'pre-wrap';
    const effectiveOverflowX = isLigature || hasGutter ? 'auto' : 'hidden';
    const effectiveWordBreak = isLigature || hasGutter ? 'normal' : 'break-word';

    return (
        <div 
            className={`scribe-editor-wrapper ${scopeClass}`}
            style={{
                background: 'var(--tool-bg-code-editor)', 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                position: 'relative',
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden', 
                minHeight: minHeight,
                width: '100%', 
            }}
        >
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                {displayGutter && (
                    <div style={{
                        flexShrink: 0,
                        width: '40px',
                        textAlign: 'right',
                        padding: '10px 8px 10px 0',
                        background: 'var(--tool-bg-sidebar)',
                        borderRight: '1px solid var(--tool-border)',
                        color: 'var(--tool-text-dim)',
                        fontFamily: '"Fira Code", "Fira Mono", monospace',
                        userSelect: 'none'
                    }}>
                        {lineNumbers.map(n => {
                            const status = errorMap.get(n);
                            const color = status === 'error' ? 'var(--danger-color)' : status === 'warning' ? 'var(--warning-color)' : 'inherit';
                            const weight = status ? 'bold' : 'normal';
                            const marker = status === 'error' ? '!' : status === 'warning' ? '?' : n;
                            
                            return (
                                <div key={n} style={{ height: '21px', lineHeight: '21px', color, fontWeight: weight }}>
                                    {marker}
                                </div>
                            );
                        })}
                    </div>
                )}
                 <div style={{ 
                    flex: 1, 
                    overflowX: isLigature ? 'auto' : 'hidden', 
                    position: 'relative',
                    
                    width: '100%', 
                    maxWidth: '100%', 
                    
                    minWidth: isLigature ? 0 : '100%' 
                }}>
                    {visualErrors.length > 0 && (
                        <div style={{ position: 'absolute', top: '10px', left: 0, width: '100%', pointerEvents: 'none', zIndex: 0 }}>
                             {visualErrors.map((err, i) => (
                                 <div key={i} style={{
                                     position: 'absolute',
                                     top: `${(err.line - 1) * 21}px`, 
                                     left: 0,
                                     width: '100%',
                                     height: '21px',
                                     background: err.severity === 'error' 
                                        ? 'linear-gradient(90deg, var(--danger-bg) 0%, transparent 100%)' 
                                        : 'linear-gradient(90deg, var(--warning-bg) 0%, transparent 100%)',
                                     borderBottom: err.severity === 'error' ? '1px dashed var(--danger-color)' : '1px dashed var(--warning-color)'
                                 }} />
                             ))}
                        </div>
                    )}

                    <Editor
                        value={value || ""}
                        onValueChange={onChange}
                        highlight={highlightCode} 
                        padding={10}
                        onSelect={!isLigature ? (e) => {
                            const target = e.target as HTMLTextAreaElement;
                            if (target.selectionStart === target.selectionEnd) {
                                setCursorOffset(target.selectionStart);
                            } else {
                                setCursorOffset(null);
                            }
                        } : undefined}
                        style={{
                            fontFamily: '"Fira Code", "Fira Mono", monospace',
                            minHeight: minHeight,
                            color: 'var(--tool-text-main)',
                            background: 'transparent',
                            whiteSpace: effectiveWhiteSpace,
                            wordBreak: effectiveWordBreak,
                            overflowWrap: isLigature ? 'normal' : 'anywhere',
                            minWidth: (isLigature || displayGutter) ? 'max-content' : '100%',
                            lineHeight: '21px',
                            zIndex: 1
                        }}
                        textareaClassName="focus:outline-none"
                        placeholder={placeholder}
                    />
                </div>
            </div>
            {infoMessages.length > 0 && (
                <div style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    color: 'var(--info-color)',
                    background: 'var(--tool-bg-sidebar)',
                    borderTop: '1px solid var(--tool-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ opacity: 0.7 }}>Dynamic Qualities Used:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {Array.from(new Set(infoMessages.map(m => m.message.replace('Dynamic Quality found: ', '').replace(/'/g, '')))).join(', ')}
                    </span>
                </div>
            )}
            
            <style jsx global>{`
                .ss-text-raw { color: var(--text-primary); } 
                .ss-brace { font-weight: bold; color: var(--warning-color); }
                .ss-brace-odd { color: var(--warning-color); } 
                .ss-brace-even { color: var(--warning-color); opacity: 0.8; } 
                .ss-var-local { color: var(--tool-accent); font-weight: normal; } 
                .ss-macro { color: var(--tool-accent); font-weight: bold; } 
                .ss-bracket { color: var(--tool-accent); font-weight: normal; opacity: 0.7; } 
                .ss-var-alias { color: var(--success-color); font-weight: bold; } 
                .ss-var-world { color: var(--danger-color);  font-weight: bold; } 
                
                .ss-number { color: var(--tool-accent-mauve); } 
                .ss-math { color: var(--tool-text-main); font-weight: bold; }
                .ss-operator { color: var(--text-secondary); }    
                .ss-flow-op { color: var(--danger-color); font-weight: bold; } 

                .ss-comment, .ss-brace-comment { color: var(--success-color); font-style: italic; opacity: 0.8; font-family: "Fira Code", monospace; }
                .ss-metadata { color: var(--text-muted); font-style: italic; }

                .ss-brace-match {
                    background-color: var(--tool-accent-fade);
                    border-radius: 2px;
                    outline: 1px solid var(--tool-accent);
                    box-shadow: 0 0 4px var(--tool-accent-fade);
                }
                .lang-ligature .token.comment { color: var(--text-muted); font-style: italic; }
                .lang-ligature .token.punctuation { color: var(--tool-text-dim); } 
                .lang-ligature .token.keyword { color: var(--tool-accent-mauve); }  
                .lang-ligature .token.attr-name { color: var(--warning-color); }  
                .lang-ligature .token.string { color: var(--success-color); } 
                .lang-ligature .token.attr-value { color: var(--tool-accent); }
                .lang-ligature .token.function { color: var(--tool-accent); }  
                .lang-ligature .token.operator { color: var(--danger-color); font-weight: bold; } 
                .lang-ligature .token.number { color: var(--warning-color); } 
                .lang-ligature .token.important { color: var(--info-color); font-weight: bold; } 
                .lang-ligature .token.builtin { color: var(--warning-color); } 
                .lang-ligature .token.sustain { color: var(--tool-text-header); font-weight: bold;}
                .lang-ligature .token.effect-block { color: var(--tool-accent-mauve); } 
                .lang-ligature .token.variable { color: var(--success-color); } 
                .lang-ligature .token.class-name { color: var(--warning-color); }

                .scribe-editor-wrapper div::-webkit-scrollbar { height: 8px; width: 8px; }
                .scribe-editor-wrapper div::-webkit-scrollbar-track { background: var(--tool-bg-sidebar); }
                .scribe-editor-wrapper div::-webkit-scrollbar-thumb { background: var(--tool-border-highlight); border-radius: 4px; }
            `}</style>
        </div>
    );
}