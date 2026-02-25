// src/app/create/[storyId]/audio/components/StrudelEditor.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LigatureTrack } from '@/engine/audio/models';
import { preprocessStrudelSource } from '@/engine/audio/strudelPreprocessor';
import { useDebounce } from '@/hooks/useDebounce';
import dynamic from 'next/dynamic';

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
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_STRUDEL_SOURCE = `note("c3 e3 g3 c4").s("piano").slow(2)`;
const MIN_TOP_PCT = 15;
const MIN_BOTTOM_PCT = 15;

function buildStrudelUrl(code: string): string {
    // Strudel decodes its URL hash with atob() directly (no decodeURIComponent).
    // Strudel code is ASCII JavaScript, so btoa(code) is correct.
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
// Component
// ---------------------------------------------------------------------------

export default function StrudelEditor({ data, onChange }: Props) {
    const initialSource = data.source || DEFAULT_STRUDEL_SOURCE;

    // Editor state
    const [rawSource, setRawSource] = useState(initialSource);
    const [iframeSrc, setIframeSrc] = useState(() => buildStrudelUrl(initialSource));
    const [bottomTab, setBottomTab] = useState<'source' | 'samples'>('source');

    // Resizable split — topPct is the percentage the REPL occupies
    const [topPct, setTopPct] = useState(68);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    // Samples state
    const [samples, setSamples] = useState<StrudelSample[]>([]);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [uploadingName, setUploadingName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const debouncedSource = useDebounce(rawSource, 500);

    // Sync when a different track is selected
    useEffect(() => {
        const s = data.source || DEFAULT_STRUDEL_SOURCE;
        setRawSource(s);
        setIframeSrc(buildStrudelUrl(s));
    }, [data.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Notify parent of source changes
    useEffect(() => {
        if (onChange) onChange(debouncedSource);
    }, [debouncedSource]); // eslint-disable-line react-hooks/exhaustive-deps

    // Load samples on mount
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

    // ------------------------------------------------------------------
    // Send to Strudel: preprocess ScribeScript, prepend samples(), refresh
    // ------------------------------------------------------------------
    const handleSendToStrudel = useCallback(() => {
        // 1. Preprocess any {{...}} ScribeScript templates (no qualities in creator studio)
        const processed = preprocessStrudelSource(rawSource, {});

        // 2. Build a samples({}) preamble if any samples exist
        let finalCode = processed;
        if (samples.length > 0) {
            const entries = samples
                .map(s => `  "${s.id}": "${s.url}"`)
                .join(',\n');
            finalCode = `samples({\n${entries}\n})\n\n${processed}`;
        }

        setIframeSrc(buildStrudelUrl(finalCode));
    }, [rawSource, samples]);

    // ------------------------------------------------------------------
    // Drag-to-resize split handle
    // ------------------------------------------------------------------
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;

        const onMove = (ev: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newPct = ((ev.clientY - rect.top) / rect.height) * 100;
            setTopPct(Math.min(100 - MIN_BOTTOM_PCT, Math.max(MIN_TOP_PCT, newPct)));
        };
        const onUp = () => {
            isDraggingRef.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    // ------------------------------------------------------------------
    // Sample upload
    // ------------------------------------------------------------------
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { setSelectedFileName(''); return; }
        setSelectedFileName(file.name);
        // Pre-fill the name field from the filename (without extension)
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
            if (res.ok) {
                setSamples(prev => prev.filter(s => s.id !== id));
            }
        } catch {
            // ignore
        }
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
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
                userSelect: isDraggingRef.current ? 'none' : undefined,
            }}
        >
            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.75rem',
                borderBottom: '1px solid var(--tool-border)',
                flexShrink: 0,
            }}>
                <button
                    onClick={handleSendToStrudel}
                    title="Send source code to the Strudel REPL (with ScribeScript pre-processed)"
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

                <span style={{ fontSize: '0.72rem', color: 'var(--tool-text-dim)', marginLeft: '0.25rem' }}>
                    Edit in Source below, then send — or code directly in the REPL above.
                </span>
            </div>

            {/* ── Strudel REPL (top, resizable) ───────────────────────── */}
            <div style={{ flex: topPct, minHeight: 0, position: 'relative' }}>
                <iframe
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

            {/* ── Drag handle ─────────────────────────────────────────── */}
            <div
                onMouseDown={handleDragStart}
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
                    opacity: 0.4,
                }} />
            </div>

            {/* ── Bottom panel (source + samples) ─────────────────────── */}
            <div style={{ flex: 100 - topPct, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Tab bar */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--tool-border)',
                    flexShrink: 0,
                    background: 'var(--tool-bg)',
                }}>
                    {(['source', 'samples'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setBottomTab(tab)}
                            style={{
                                background: bottomTab === tab ? 'rgba(97,175,239,0.1)' : 'transparent',
                                border: 'none',
                                borderBottom: bottomTab === tab ? '2px solid #61afef' : '2px solid transparent',
                                color: bottomTab === tab ? '#61afef' : 'var(--tool-text-dim)',
                                padding: '0.4rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                fontFamily: 'inherit',
                                textTransform: 'capitalize',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {tab}
                            {tab === 'samples' && samples.length > 0 && (
                                <span style={{
                                    marginLeft: '0.4rem',
                                    background: '#61afef33',
                                    borderRadius: '99px',
                                    padding: '0 0.4rem',
                                    fontSize: '0.7rem',
                                }}>
                                    {samples.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    {bottomTab === 'source' && (
                        <ScribeEditor
                            value={rawSource}
                            onChange={setRawSource}
                            language="scribescript"
                            minHeight="100%"
                            showLineNumbers
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
    fileInputRef: React.RefObject<HTMLInputElement>;
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
        <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>

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
                <span style={{ fontSize: '0.72rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Upload Sample
                </span>

                {/* Row 1: file picker */}
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

                {/* Row 2: name + upload button — always visible */}
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
                        Upload a sample, then reference it in Strudel with <code style={{ fontFamily: 'monospace' }}>.s("name")</code>
                    </span>
                </div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--tool-border)' }}>
                            <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>Name</th>
                            <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>Usage</th>
                            <th style={{ ...dimCell, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em' }}>Size</th>
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
