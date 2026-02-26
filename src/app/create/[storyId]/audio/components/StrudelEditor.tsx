// src/app/create/[storyId]/audio/components/StrudelEditor.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LigatureTrack } from '@/engine/audio/models';
import { PlayerQualities, QualityDefinition } from '@/engine/models';
import { preprocessStrudelSource } from '@/engine/audio/strudelPreprocessor';
import { useDebounce } from '@/hooks/useDebounce';
import dynamic from 'next/dynamic';
import ScribeDebugger from '@/components/admin/ScribeDebugger';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StrudelSample {
    id: string;
    url: string;
    size: number;
    uploadedAt: string;
}

interface Props {
    data: LigatureTrack;
    onChange?: (source: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_STRUDEL_SOURCE = `note("c3 e3 g3 c4").s("piano").slow(2)`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStrudelUrl(code: string): string {
    // Strudel decodes its URL hash with atob() directly (no decodeURIComponent).
    try {
        return `https://strudel.cc/?embed#${btoa(code)}`;
    } catch {
        return `https://strudel.cc/?embed#`;
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Syntax hint panel
// ---------------------------------------------------------------------------

function SyntaxHintPanel() {
    const row = (
        example: React.ReactNode,
        desc: React.ReactNode,
    ): React.ReactNode => (
        <>
            <div style={{ paddingTop: '0.15rem' }}>{example}</div>
            <div style={{ color: 'var(--tool-text-dim)', paddingTop: '0.15rem' }}>{desc}</div>
        </>
    );

    const kw = (s: string, color = '#e5c07b') => (
        <code style={{ fontFamily: 'monospace', color, whiteSpace: 'nowrap' }}>{s}</code>
    );
    const dim = (s: string) => (
        <code style={{ fontFamily: 'monospace', color: '#abb2bf', fontSize: '0.9em' }}>{s}</code>
    );

    return (
        <div style={{
            background: 'rgba(97, 175, 239, 0.05)',
            borderBottom: '1px solid #61afef33',
            padding: '0.6rem 0.75rem',
            flexShrink: 0,
            fontSize: '0.7rem',
        }}>
            <div style={{
                color: '#61afef',
                fontWeight: 700,
                marginBottom: '0.45rem',
                fontSize: '0.63rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
            }}>
                ScribeScript — {'{{'}…{'}}'}  Template Syntax
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0.05rem 0.85rem',
                lineHeight: 1.7,
            }}>
                {row(kw('{{$varName}}'), <>numeric quality level — {dim('{{$bpm}} → 120')}</>)}
                {row(kw('{{$$varName}}', '#c678dd'), <>string quality value — {dim('{{$$weapon}} → "sword"')}</>)}
                {row(
                    <>{kw('{{')}{kw('$x > 5', '#abb2bf')}{kw(' : ', '#e06c75')}{kw('200', '#abb2bf')}{kw(' | ', '#e06c75')}{kw('100', '#abb2bf')}{kw('}}')} </>,
                    <>
                        <span style={{ fontWeight: 600, color: 'var(--tool-text-header)' }}>conditional</span>
                        {' — if $x &gt; 5 then 200, else 100. '}
                        {dim(': true | false')} syntax, same as audio ref fields
                    </>,
                )}
                {row(kw('{{$hp < 10 ? 0.3 : 1}}', '#abb2bf'), <>JS ternary also works — any JavaScript expression is valid</>)}
            </div>
            <div style={{
                marginTop: '0.45rem',
                fontSize: '0.63rem',
                color: 'var(--tool-text-dim)',
                opacity: 0.75,
                fontStyle: 'italic',
            }}>
                Templates are substituted when ▶ Send to REPL is clicked.
                Use the ScribeScript Tester tab below to preview output with mock quality values.
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ScribeScript tester tab
// ---------------------------------------------------------------------------

interface ScribeScriptTabProps {
    preprocessedPreview: string;
    onSendWithTestValues: () => void;
    onUpdate: (qualities: PlayerQualities, defs: Record<string, QualityDefinition>) => void;
}

function ScribeScriptTab({ preprocessedPreview, onSendWithTestValues, onUpdate }: ScribeScriptTabProps) {
    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

            {/* Left: quality variable editor */}
            <div style={{
                flex: '0 0 210px',
                overflow: 'hidden',
                borderRight: '1px solid var(--tool-border)',
            }}>
                <ScribeDebugger onUpdate={onUpdate} />
            </div>

            {/* Right: preprocessed preview */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.3rem 0.65rem',
                    borderBottom: '1px solid var(--tool-border)',
                    flexShrink: 0,
                    background: 'var(--tool-bg)',
                }}>
                    <span style={{
                        flex: 1,
                        fontSize: '0.63rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--tool-text-dim)',
                    }}>
                        Preprocessed Output
                    </span>
                    <button
                        onClick={onSendWithTestValues}
                        title="Send preprocessed code to the Strudel REPL using these test quality values"
                        style={{
                            background: 'rgba(152,195,121,0.15)',
                            border: '1px solid #98c379',
                            color: '#98c379',
                            borderRadius: '4px',
                            padding: '0.2rem 0.55rem',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ▶ Send with Test Values
                    </button>
                </div>
                <pre style={{
                    flex: 1,
                    margin: 0,
                    padding: '0.55rem 0.75rem',
                    overflowY: 'auto',
                    fontSize: '0.78rem',
                    fontFamily: 'monospace',
                    color: '#abb2bf',
                    background: 'rgba(0,0,0,0.25)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                }}>
                    {preprocessedPreview}
                </pre>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StrudelEditor({ data, onChange }: Props) {
    const initialSource = data.source || DEFAULT_STRUDEL_SOURCE;

    // Editor state
    const [rawSource, setRawSource] = useState(initialSource);
    const [iframeSrc, setIframeSrc] = useState(() => buildStrudelUrl(initialSource));
    const [bottomTab, setBottomTab] = useState<'scribe' | 'samples'>('scribe');
    const [showSyntaxHint, setShowSyntaxHint] = useState(false);

    // Mock qualities for ScribeScript tester
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});

    // Resizable pane splits — leftPct = source width %, bottomPct = bottom panel height %
    const [leftPct, setLeftPct] = useState(42);
    const [bottomPct, setBottomPct] = useState(30);

    const containerRef = useRef<HTMLDivElement>(null);
    const isHDragging = useRef(false);
    const isVDragging = useRef(false);

    // Samples state
    const [samples, setSamples] = useState<StrudelSample[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [uploadingName, setUploadingName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const debouncedSource = useDebounce(rawSource, 500);

    // Live preview: source with mock qualities substituted — updates on each keystroke
    const preprocessedPreview = useMemo(() => {
        try {
            return preprocessStrudelSource(rawSource, mockQualities);
        } catch {
            return rawSource;
        }
    }, [rawSource, mockQualities]);

    // ── Sync when a different track is selected ────────────────────────────────
    useEffect(() => {
        const s = data.source || DEFAULT_STRUDEL_SOURCE;
        setRawSource(s);
        setIframeSrc(buildStrudelUrl(s));
    }, [data.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Notify parent of source changes ───────────────────────────────────────
    useEffect(() => {
        if (onChange) onChange(debouncedSource);
    }, [debouncedSource]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Load samples on mount ─────────────────────────────────────────────────
    useEffect(() => {
        loadSamples();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadSamples = async () => {
        setIsLoadingSamples(true);
        try {
            const res = await fetch('/api/admin/samples');
            const json = await res.json();
            setSamples(json.samples || []);
        } catch {
            // silently ignore
        } finally {
            setIsLoadingSamples(false);
        }
    };

    // ── Build final code for the REPL ─────────────────────────────────────────
    const buildFinalCode = useCallback((source: string, qualities: PlayerQualities): string => {
        const processed = preprocessStrudelSource(source, qualities);
        if (samples.length === 0) return processed;
        const entries = samples.map(s => `  "${s.id}": "${s.url}"`).join(',\n');
        return `samples({\n${entries}\n})\n\n${processed}`;
    }, [samples]);

    // ── Send to REPL (no test values) ─────────────────────────────────────────
    const handleSendToStrudel = useCallback(() => {
        setIframeSrc(buildStrudelUrl(buildFinalCode(rawSource, {})));
    }, [rawSource, buildFinalCode]);

    // ── Send to REPL with mock test quality values ────────────────────────────
    const handleSendWithTestValues = useCallback(() => {
        setIframeSrc(buildStrudelUrl(buildFinalCode(rawSource, mockQualities)));
    }, [rawSource, mockQualities, buildFinalCode]);

    // ── ScribeDebugger update handler ─────────────────────────────────────────
    const handleDebuggerUpdate = useCallback((qualities: PlayerQualities, _defs: Record<string, QualityDefinition>) => {
        setMockQualities(qualities);
    }, []);

    // ── Horizontal drag (source ↔ REPL) ───────────────────────────────────────
    const handleHDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isHDragging.current = true;

        const onMove = (ev: MouseEvent) => {
            if (!isHDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const pct = ((ev.clientX - rect.left) / rect.width) * 100;
            setLeftPct(Math.min(75, Math.max(20, pct)));
        };
        const onUp = () => {
            isHDragging.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    // ── Vertical drag (main ↕ bottom panel) ───────────────────────────────────
    const handleVDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isVDragging.current = true;

        const onMove = (ev: MouseEvent) => {
            if (!isVDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const fromBottom = rect.bottom - ev.clientY;
            const pct = (fromBottom / rect.height) * 100;
            setBottomPct(Math.min(55, Math.max(12, pct)));
        };
        const onUp = () => {
            isVDragging.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    // ── Sample upload/delete ──────────────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { setSelectedFileName(''); return; }
        setSelectedFileName(file.name);
        const baseName = file.name.split('.').slice(0, -1).join('_') || file.name;
        setUploadingName(baseName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase());
        setUploadError('');
    };

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append('file', file);
        if (uploadingName.trim()) formData.append('name', uploadingName.trim());
        try {
            const res = await fetch('/api/admin/samples', { method: 'POST', body: formData });
            const json = await res.json();
            if (!res.ok) {
                setUploadError(json.error || 'Upload failed');
            } else {
                setSamples(prev => [...prev, json.sample]);
                setUploadingName('');
                setSelectedFileName('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch {
            setUploadError('Network error during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteSample = async (id: string) => {
        if (!confirm(`Delete sample "${id}"? This cannot be undone.`)) return;
        try {
            const res = await fetch('/api/admin/samples', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) setSamples(prev => prev.filter(s => s.id !== id));
        } catch {
            // ignore
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                width: '100%',
                background: 'var(--tool-bg)',
                overflow: 'hidden',
            }}
        >
            {/* ── Main area: source (left) + REPL (right) ─────────────────── */}
            <div style={{
                flex: 100 - bottomPct,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'row',
                overflow: 'hidden',
            }}>
                {/* ── Left: Source editor ──────────────────────────────── */}
                <div style={{
                    flex: leftPct,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    borderRight: '1px solid var(--tool-border)',
                }}>
                    {/* Source header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.6rem',
                        borderBottom: '1px solid var(--tool-border)',
                        flexShrink: 0,
                        background: 'var(--tool-bg)',
                    }}>
                        <span style={{
                            fontSize: '0.63rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            color: 'var(--tool-text-dim)',
                            whiteSpace: 'nowrap',
                        }}>
                            Source
                        </span>

                        {/* ScribeScript syntax toggle */}
                        <button
                            onClick={() => setShowSyntaxHint(h => !h)}
                            title={showSyntaxHint ? 'Hide ScribeScript syntax reference' : 'Show ScribeScript syntax reference ({{...}} templates)'}
                            style={{
                                background: showSyntaxHint ? 'rgba(97,175,239,0.15)' : 'transparent',
                                border: `1px solid ${showSyntaxHint ? '#61afef' : '#61afef55'}`,
                                color: showSyntaxHint ? '#61afef' : 'var(--tool-text-dim)',
                                borderRadius: '3px',
                                padding: '0.1rem 0.35rem',
                                cursor: 'pointer',
                                fontSize: '0.65rem',
                                fontFamily: 'monospace',
                                lineHeight: 1.4,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {'{{…}}'}
                        </button>

                        <span style={{ flex: 1 }} />

                        {/* Send to REPL */}
                        <button
                            onClick={handleSendToStrudel}
                            title="Preprocess ScribeScript templates and send to the Strudel REPL on the right"
                            style={{
                                background: 'rgba(97, 175, 239, 0.15)',
                                border: '1px solid #61afef',
                                color: '#61afef',
                                borderRadius: '4px',
                                padding: '0.25rem 0.6rem',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                            }}
                        >
                            ▶ Send to REPL →
                        </button>
                    </div>

                    {/* Collapsible ScribeScript syntax reference */}
                    {showSyntaxHint && <SyntaxHintPanel />}

                    {/* Code editor — Strudel is JavaScript, use the strudel highlighter */}
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <ScribeEditor
                            value={rawSource}
                            onChange={setRawSource}
                            language="strudel"
                            minHeight="100%"
                            showLineNumbers
                        />
                    </div>
                </div>

                {/* ── Horizontal drag handle ───────────────────────────── */}
                <div
                    onMouseDown={handleHDragStart}
                    title="Drag to resize"
                    style={{
                        width: '6px',
                        flexShrink: 0,
                        background: 'var(--tool-border)',
                        cursor: 'ew-resize',
                        position: 'relative',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div style={{
                        width: '2px',
                        height: '32px',
                        borderRadius: '2px',
                        background: 'var(--tool-text-dim)',
                        opacity: 0.35,
                    }} />
                </div>

                {/* ── Right: Strudel REPL ──────────────────────────────── */}
                <div style={{
                    flex: 100 - leftPct,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        flexShrink: 0,
                        padding: '0.35rem 0.65rem',
                        borderBottom: '1px solid var(--tool-border)',
                        background: 'var(--tool-bg)',
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--tool-text-dim)',
                    }}>
                        ↳ Live Strudel REPL
                    </div>
                    <iframe
                        key={iframeSrc}
                        src={iframeSrc}
                        title="Strudel REPL"
                        allow="autoplay; microphone"
                        style={{
                            flex: 1,
                            width: '100%',
                            border: 'none',
                            display: 'block',
                            background: '#1a1a2e',
                        }}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    />
                </div>
            </div>

            {/* ── Vertical drag handle (main ↕ bottom panel) ──────────────── */}
            <div
                onMouseDown={handleVDragStart}
                style={{
                    height: '6px',
                    flexShrink: 0,
                    background: 'var(--tool-border)',
                    cursor: 'ns-resize',
                    position: 'relative',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <div style={{
                    width: '40px',
                    height: '2px',
                    borderRadius: '2px',
                    background: 'var(--tool-text-dim)',
                    opacity: 0.35,
                }} />
            </div>

            {/* ── Bottom panel: ScribeScript tester + Samples ─────────────── */}
            <div style={{
                flex: bottomPct,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--tool-border)',
                    flexShrink: 0,
                    background: 'var(--tool-bg)',
                }}>
                    {(['scribe', 'samples'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setBottomTab(tab)}
                            style={{
                                background: bottomTab === tab ? 'rgba(97,175,239,0.1)' : 'transparent',
                                border: 'none',
                                borderBottom: bottomTab === tab ? '2px solid #61afef' : '2px solid transparent',
                                color: bottomTab === tab ? '#61afef' : 'var(--tool-text-dim)',
                                padding: '0.35rem 0.9rem',
                                cursor: 'pointer',
                                fontSize: '0.72rem',
                                fontFamily: 'inherit',
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {tab === 'scribe' ? 'ScribeScript Tester' : 'Samples'}
                            {tab === 'samples' && samples.length > 0 && (
                                <span style={{
                                    marginLeft: '0.4rem',
                                    background: '#61afef33',
                                    borderRadius: '99px',
                                    padding: '0 0.4rem',
                                    fontSize: '0.65rem',
                                }}>
                                    {samples.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {bottomTab === 'scribe' && (
                        <ScribeScriptTab
                            preprocessedPreview={preprocessedPreview}
                            onSendWithTestValues={handleSendWithTestValues}
                            onUpdate={handleDebuggerUpdate}
                        />
                    )}
                    {bottomTab === 'samples' && (
                        <SamplesPanel
                            samples={samples}
                            isLoading={isLoadingSamples}
                            isUploading={isUploading}
                            uploadingName={uploadingName}
                            selectedFileName={selectedFileName}
                            uploadError={uploadError}
                            fileInputRef={fileInputRef}
                            onFileSelect={handleFileSelect}
                            onNameChange={setUploadingName}
                            onUpload={handleUpload}
                            onDelete={handleDeleteSample}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Samples panel sub-component
// ---------------------------------------------------------------------------

interface SamplesPanelProps {
    samples: StrudelSample[];
    isLoading: boolean;
    isUploading: boolean;
    uploadingName: string;
    selectedFileName: string;
    uploadError: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onNameChange: (name: string) => void;
    onUpload: () => void;
    onDelete: (id: string) => void;
}

function SamplesPanel({
    samples, isLoading, isUploading, uploadingName, selectedFileName, uploadError,
    fileInputRef, onFileSelect, onNameChange, onUpload, onDelete,
}: SamplesPanelProps) {
    const cell: React.CSSProperties = {
        padding: '0.4rem 0.6rem',
        fontSize: '0.78rem',
        borderBottom: '1px solid var(--tool-border)',
        color: 'var(--tool-text-header)',
        verticalAlign: 'middle',
    };
    const dimCell: React.CSSProperties = { ...cell, color: 'var(--tool-text-dim)' };

    const canUpload = !!selectedFileName && !!uploadingName.trim() && !isUploading;

    return (
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, minHeight: 0, boxSizing: 'border-box', overflowY: 'auto' }}>

            {/* Upload form — always visible */}
            <div style={{
                background: 'rgba(97,175,239,0.05)',
                border: '1px dashed #61afef55',
                borderRadius: '6px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                flexShrink: 0,
            }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Upload Sample
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.webm"
                        onChange={onFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--tool-border)',
                            color: 'var(--tool-text-header)',
                            borderRadius: '4px',
                            padding: '0.3rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Choose file…
                    </button>
                    <span style={{ fontSize: '0.72rem', color: selectedFileName ? 'var(--tool-text-header)' : 'var(--tool-text-dim)', fontFamily: 'monospace' }}>
                        {selectedFileName || 'wav · mp3 · ogg · flac · aiff · webm'}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--tool-text-dim)', whiteSpace: 'nowrap' }}>
                        Name in Strudel:
                    </label>
                    <input
                        value={uploadingName}
                        onChange={e => onNameChange(e.target.value)}
                        placeholder="e.g. kick"
                        style={{
                            background: '#1a1a1a',
                            border: '1px solid var(--tool-border)',
                            borderRadius: '4px',
                            color: 'var(--tool-text-header)',
                            padding: '0.3rem 0.5rem',
                            fontSize: '0.78rem',
                            fontFamily: 'monospace',
                            width: '140px',
                        }}
                    />
                    <button
                        onClick={onUpload}
                        disabled={!canUpload}
                        title={!selectedFileName ? 'Choose a file first' : !uploadingName.trim() ? 'Enter a name' : 'Upload'}
                        style={{
                            background: canUpload ? 'rgba(98,198,84,0.2)' : 'rgba(98,198,84,0.07)',
                            border: '1px solid #98c379',
                            color: '#98c379',
                            borderRadius: '4px',
                            padding: '0.3rem 0.75rem',
                            cursor: canUpload ? 'pointer' : 'default',
                            fontSize: '0.78rem',
                            fontFamily: 'inherit',
                            opacity: canUpload ? 1 : 0.4,
                        }}
                    >
                        {isUploading ? 'Uploading…' : '↑ Upload'}
                    </button>
                </div>

                {uploadError && (
                    <span style={{ fontSize: '0.72rem', color: '#e06c75' }}>{uploadError}</span>
                )}
            </div>

            {/* Samples list */}
            {isLoading ? (
                <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem' }}>Loading samples…</span>
            ) : samples.length === 0 ? (
                <div style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem', textAlign: 'center', marginTop: '1rem' }}>
                    No samples uploaded yet.<br />
                    <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                        Upload a sample, then use it in Strudel with <code style={{ fontFamily: 'monospace' }}>.s("name")</code>
                    </span>
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--tool-border)' }}>
                            <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Name</th>
                            <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Usage in Strudel</th>
                            <th style={{ ...dimCell, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Size</th>
                            <th style={{ ...dimCell, width: '36px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {samples.map(s => (
                            <tr key={s.id} style={{ borderBottom: '1px solid var(--tool-border)' }}>
                                <td style={cell}>
                                    <code style={{ fontFamily: 'monospace', color: '#e5c07b' }}>{s.id}</code>
                                </td>
                                <td style={dimCell}>
                                    <code style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#56b6c2' }}>
                                        .s("{s.id}")
                                    </code>
                                </td>
                                <td style={{ ...dimCell, textAlign: 'right' }}>
                                    {formatBytes(s.size)}
                                </td>
                                <td style={{ ...dimCell, textAlign: 'right', padding: '0 0.4rem' }}>
                                    <button
                                        onClick={() => onDelete(s.id)}
                                        title={`Delete sample "${s.id}"`}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#e06c75',
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            padding: '0 4px',
                                            lineHeight: 1,
                                        }}
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
