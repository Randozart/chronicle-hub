// src/app/create/[storyId]/audio/components/StrudelEditor.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LigatureTrack } from '@/engine/audio/models';
import { PlayerQualities, QualityDefinition } from '@/engine/models';
import { preprocessStrudelSource } from '@/engine/audio/strudelPreprocessor';
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import { useDebounce } from '@/hooks/useDebounce';
import dynamic from 'next/dynamic';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

const DEFAULT_STRUDEL_SOURCE = `note("c3 e3 g3 c4").s("piano").slow(2)`;

interface Props {
    data: LigatureTrack;
    onChange?: (source: string) => void;
}

function buildStrudelUrl(code: string): string {
    // Strudel decodes its URL hash with atob() directly (no decodeURIComponent).
    // Strudel code is ASCII JavaScript, so btoa(code) is correct.
    try {
        return `https://strudel.cc/?embed#${btoa(code)}`;
    } catch {
        // Non-latin1 characters in code — open an empty REPL
        return `https://strudel.cc/?embed#`;
    }
}

export default function StrudelEditor({ data, onChange }: Props) {
    const initialSource = data.source || DEFAULT_STRUDEL_SOURCE;

    const [rawSource, setRawSource] = useState(initialSource);
    const [iframeSrc, setIframeSrc] = useState(() => buildStrudelUrl(initialSource));
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    const [sourceOpen, setSourceOpen] = useState(true);
    const [debuggerOpen, setDebuggerOpen] = useState(false);

    const debouncedSource = useDebounce(rawSource, 600);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Sync incoming data.source changes (e.g. on initial load / track switch)
    useEffect(() => {
        const s = data.source || DEFAULT_STRUDEL_SOURCE;
        setRawSource(s);
        setIframeSrc(buildStrudelUrl(s));
    }, [data.id]); // Re-sync when switching tracks

    // Notify parent of source changes (debounced)
    useEffect(() => {
        if (onChange) onChange(debouncedSource);
    }, [debouncedSource]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDebuggerUpdate = useCallback((
        qualities: PlayerQualities,
        _defs: Record<string, QualityDefinition>
    ) => {
        setMockQualities(q =>
            JSON.stringify(q) === JSON.stringify(qualities) ? q : qualities
        );
    }, []);

    const handleSendToStrudel = () => {
        const processed = preprocessStrudelSource(rawSource, mockQualities);
        setIframeSrc(buildStrudelUrl(processed));
    };

    const hasTemplates = /\{\{[\s\S]*?\}\}/.test(rawSource);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            background: 'var(--tool-bg)',
            overflow: 'hidden',
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderBottom: '1px solid var(--tool-border)',
                flexShrink: 0,
                flexWrap: 'wrap',
            }}>
                <button
                    onClick={handleSendToStrudel}
                    title="Pre-process ScribeScript expressions and load into the Strudel REPL"
                    style={{
                        background: 'rgba(97, 175, 239, 0.15)',
                        border: '1px solid #61afef',
                        color: '#61afef',
                        borderRadius: '4px',
                        padding: '0.3rem 0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                    }}
                >
                    ▶ Send to Strudel
                </button>

                {hasTemplates && (
                    <span style={{ fontSize: '0.75rem', color: '#e5c07b', opacity: 0.8 }}>
                        ⚡ ScribeScript templates detected
                    </span>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setDebuggerOpen(o => !o)}
                        title="Toggle ScribeScript mock variable debugger"
                        style={{
                            background: debuggerOpen ? 'rgba(229, 192, 123, 0.15)' : 'transparent',
                            border: `1px solid ${debuggerOpen ? '#e5c07b' : 'var(--tool-border)'}`,
                            color: debuggerOpen ? '#e5c07b' : 'var(--tool-text-dim)',
                            borderRadius: '4px',
                            padding: '0.3rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontFamily: 'inherit',
                        }}
                    >
                        $ Variables
                    </button>

                    <button
                        onClick={() => setSourceOpen(o => !o)}
                        title="Toggle source code panel"
                        style={{
                            background: sourceOpen ? 'rgba(97, 175, 239, 0.1)' : 'transparent',
                            border: `1px solid ${sourceOpen ? '#61afef55' : 'var(--tool-border)'}`,
                            color: sourceOpen ? '#61afef' : 'var(--tool-text-dim)',
                            borderRadius: '4px',
                            padding: '0.3rem 0.6rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontFamily: 'inherit',
                        }}
                    >
                        {sourceOpen ? 'Source ▲' : 'Source ▼'}
                    </button>
                </div>
            </div>

            {/* Main content area */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

                {/* Left: ScribeDebugger sidebar */}
                {debuggerOpen && (
                    <div style={{
                        width: '220px',
                        flexShrink: 0,
                        borderRight: '1px solid var(--tool-border)',
                        overflowY: 'auto',
                    }}>
                        <ScribeDebugger onUpdate={handleDebuggerUpdate} />
                    </div>
                )}

                {/* Centre: Strudel iframe + source editor */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

                    {/* Strudel REPL iframe */}
                    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                        <iframe
                            ref={iframeRef}
                            key={iframeSrc}
                            src={iframeSrc}
                            title="Strudel REPL"
                            allow="autoplay; microphone"
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                display: 'block',
                                background: '#1a1a2e',
                            }}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                        />
                    </div>

                    {/* Collapsible source code editor */}
                    {sourceOpen && (
                        <div style={{
                            height: '260px',
                            flexShrink: 0,
                            borderTop: '1px solid var(--tool-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '0.3rem 0.75rem',
                                borderBottom: '1px solid var(--tool-border)',
                                fontSize: '0.7rem',
                                color: 'var(--tool-text-dim)',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}>
                                <span>Source</span>
                                <span style={{ opacity: 0.5 }}>—</span>
                                <span style={{ opacity: 0.6, textTransform: 'none', letterSpacing: 'normal' }}>
                                    Strudel code{hasTemplates ? ' + ScribeScript templates ({{ }})' : ''}
                                </span>
                            </div>
                            <div style={{ flex: 1, overflow: 'auto' }}>
                                <ScribeEditor
                                    value={rawSource}
                                    onChange={(val) => setRawSource(val)}
                                    language="scribescript"
                                    minHeight="220px"
                                    showLineNumbers
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
