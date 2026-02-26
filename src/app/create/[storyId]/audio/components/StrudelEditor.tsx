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
    storyId?: string;
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

/** Extract all $varName references from inside {{...}} ScribeScript blocks. */
function extractScribeVarNames(source: string): string[] {
    const names = new Set<string>();
    const blockRe = /\{\{([\s\S]*?)\}\}/g;
    let block: RegExpExecArray | null;
    while ((block = blockRe.exec(source)) !== null) {
        const varRe = /\$\$?([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let v: RegExpExecArray | null;
        while ((v = varRe.exec(block[1])) !== null) {
            names.add(v[1]);
        }
    }
    return [...names];
}

/** Extract all sample base-names referenced via s("...") in Strudel code. */
function extractSampleNames(code: string): Set<string> {
    const names = new Set<string>();
    // Match .s("...") or s("...") — the argument is a Strudel pattern string
    const re = /\.?s\(\s*["']([^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
        // Pattern strings can contain spaces, angle-brackets, colons: "bd:0 sd <jazz_bd jazz_sn>"
        const parts = m[1].replace(/[<>[\]]/g, ' ').split(/[\s,]+/);
        for (const part of parts) {
            const base = part.split(':')[0].trim();
            if (base && /^[a-zA-Z0-9_-]+$/.test(base)) names.add(base);
        }
    }
    return names;
}

// ---------------------------------------------------------------------------
// Syntax hint panel
// ---------------------------------------------------------------------------

function SyntaxHintPanel() {
    const [showNested, setShowNested] = useState(false);

    const row = (
        example: React.ReactNode,
        desc: React.ReactNode,
    ): React.ReactNode => (
        <>
            <div style={{ paddingTop: '0.15rem' }}>{example}</div>
            <div style={{ color: 'var(--tool-text-dim)', paddingTop: '0.15rem' }}>{desc}</div>
        </>
    );

    const kw = (s: string, color = 'var(--warning-color)') => (
        <code style={{ fontFamily: 'monospace', color, whiteSpace: 'nowrap' }}>{s}</code>
    );
    const dim = (s: string) => (
        <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.9em' }}>{s}</code>
    );

    return (
        <div style={{
            background: 'rgba(97, 175, 239, 0.05)',
            borderBottom: '1px solid var(--tool-accent-fade, #61afef33)',
            padding: '0.6rem 0.75rem',
            flexShrink: 0,
            fontSize: '0.82rem',
        }}>
            <div style={{
                color: 'var(--tool-accent)',
                fontWeight: 700,
                marginBottom: '0.45rem',
                fontSize: '0.75rem',
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
                {row(kw('{{$$varName}}', 'var(--tool-accent-mauve)'), <>string quality value — {dim('{{$$weapon}} → "sword"')}</>)}
                {row(
                    <>{kw('{{')}{kw('$x > 5', 'var(--text-primary)')}{kw(' : ', 'var(--danger-color)')}{kw('200', 'var(--text-primary)')}{kw(' | ', 'var(--danger-color)')}{kw('100', 'var(--text-primary)')}{kw('}}')} </>,
                    <>
                        <span style={{ fontWeight: 600, color: 'var(--tool-text-header)' }}>conditional</span>
                        {' — if $x > 5 then 200, else 100. '}
                        {dim(': true | false')} syntax, same as audio ref fields
                    </>,
                )}
                {row(kw('{{$hp < 10 ? 0.3 : 1}}', 'var(--text-primary)'), <>JS ternary also works — any JavaScript expression is valid</>)}
                {row(kw('{{$combat * 0.5 + $magic}}', 'var(--text-primary)'), <>arithmetic across multiple variables</>)}
                {row(kw('{{Math.min($combat, 10) / 10}}', 'var(--text-primary)'), <>Math functions work — {dim('Math.min, Math.max, Math.floor, Math.pow, …')}</>)}
            </div>

            {/* Nested / chaining section */}
            <button
                onClick={() => setShowNested(n => !n)}
                style={{
                    marginTop: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--tool-accent)',
                    cursor: 'pointer',
                    fontSize: '0.63rem',
                    fontFamily: 'inherit',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                }}
            >
                <span style={{ fontSize: '0.55rem' }}>{showNested ? '▼' : '▶'}</span>
                {showNested ? 'Hide' : 'Show'} chaining / nested expressions
            </button>

            {showNested && (
                <div style={{
                    marginTop: '0.4rem',
                    padding: '0.5rem 0.6rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    border: '1px solid rgba(97,175,239,0.15)',
                    fontSize: '0.68rem',
                    lineHeight: 1.6,
                    color: 'var(--tool-text-dim)',
                }}>
                    <div style={{ color: 'var(--tool-text-header)', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.63rem' }}>
                        Chaining multiple values
                    </div>
                    <p style={{ margin: '0 0 0.35rem 0' }}>
                        Each <code style={{ fontFamily: 'monospace', color: 'var(--warning-color)' }}>{'{{'}</code>
                        …<code style={{ fontFamily: 'monospace', color: 'var(--warning-color)' }}>{'}}'}</code> block is evaluated independently and replaced with its result.
                        They cannot reference each other directly, but every block can access all quality variables at once.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.1rem 0.7rem', marginBottom: '0.4rem' }}>
                        {row(
                            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.95em' }}>
                                .cpm({'{{$bpm}}'}).amp({'{{$volume / 100}}'})
                            </code>,
                            <>two separate substitutions in one line — each evaluates its own expression</>
                        )}
                        {row(
                            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.95em' }}>
                                {'{{$hp < 10 ? $mp * 2 : $mp}}'}
                            </code>,
                            <>use the value of one variable to compute using another — all vars are in scope</>
                        )}
                        {row(
                            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.95em' }}>
                                {'{{($combat + $magic) > 15 : 200 | 120}}'}
                            </code>,
                            <>combine variables in the condition itself</>
                        )}
                    </div>
                    <div style={{ fontSize: '0.63rem', color: 'var(--tool-text-dim)', fontStyle: 'italic', opacity: 0.8 }}>
                        Tip: the full JavaScript standard library is available inside each {'{{…}}'} block —{' '}
                        <code style={{ fontFamily: 'monospace' }}>Math, Number, String, Array, JSON</code>, etc.
                        String qualities use <code style={{ fontFamily: 'monospace', color: 'var(--tool-accent-mauve)' }}>$$varName</code> and
                        return the raw string value (e.g. <code style={{ fontFamily: 'monospace' }}>"sword"</code>).
                    </div>
                </div>
            )}

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

interface DebugRow { key: string; value: string; }

interface ScribeScriptTabProps {
    onSendWithTestValues: () => void;
    onUpdate: (qualities: PlayerQualities, defs: Record<string, QualityDefinition>) => void;
    storyId?: string;
    rawSource: string;
    mockQualities: PlayerQualities;
}

function ScribeScriptTab({ onSendWithTestValues, onUpdate, storyId, rawSource, mockQualities }: ScribeScriptTabProps) {
    const [players, setPlayers] = useState<any[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

    // Character import — owns the imported rows and reset key for ScribeDebugger
    const [importedRows, setImportedRows] = useState<DebugRow[] | undefined>(undefined);
    const [importResetKey, setImportResetKey] = useState(0);

    // Compute which $vars are used in source but not yet in mock qualities
    const usedVarNames = useMemo(() => extractScribeVarNames(rawSource), [rawSource]);
    const undefinedVarNames = useMemo(
        () => usedVarNames.filter(name => !(name in mockQualities)),
        [usedVarNames, mockQualities],
    );

    // Add all missing $vars from source into the debugger (preserves existing values)
    const handleExtractVars = useCallback(() => {
        if (undefinedVarNames.length === 0) return;
        const existingRows: DebugRow[] = Object.entries(mockQualities).map(([key, q]) => ({
            key,
            value: (q as any).stringValue && (q as any).level === 0
                ? String((q as any).stringValue)
                : String((q as any).level ?? 0),
        }));
        const newRows: DebugRow[] = undefinedVarNames.map(name => ({ key: name, value: '0' }));
        setImportedRows([...existingRows, ...newRows]);
        setImportResetKey(k => k + 1);
    }, [undefinedVarNames, mockQualities]);

    const handleOpenPicker = async () => {
        if (!storyId) return;
        if (players.length === 0) {
            setIsLoadingPlayers(true);
            try {
                const res = await fetch(`/api/admin/players?storyId=${storyId}`);
                const data = await res.json();
                setPlayers(Array.isArray(data) ? data : []);
            } catch { /* ignore */ } finally {
                setIsLoadingPlayers(false);
            }
        }
        setShowPicker(p => !p);
    };

    const handleSelectCharacter = (player: any) => {
        const rows: DebugRow[] = Object.entries(player.qualities ?? {})
            .map(([key, q]: [string, any]) => ({
                key,
                value: (q.stringValue && q.level === 0) ? String(q.stringValue) : String(q.level ?? 0),
            }))
            .filter((r: DebugRow) => r.key);
        setImportedRows(rows);
        setImportResetKey(k => k + 1);
        setShowPicker(false);
    };

    return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.3rem 0.65rem',
                borderBottom: '1px solid var(--tool-border)',
                flexShrink: 0,
                background: 'var(--tool-bg)',
            }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tool-text-dim)' }}>
                    Mock Qualities
                </span>
                {undefinedVarNames.length > 0 && (
                    <span
                        title={`Used in source but not yet defined: $${undefinedVarNames.join(', $')}`}
                        style={{
                            background: 'rgba(224,175,104,0.12)',
                            border: '1px solid var(--warning-color)',
                            color: 'var(--warning-color)',
                            borderRadius: '4px',
                            padding: '0.1rem 0.4rem',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                        }}
                    >
                        ⚠ {undefinedVarNames.length} undefined
                    </span>
                )}
                {undefinedVarNames.length > 0 && (
                    <button
                        onClick={handleExtractVars}
                        title={`Add missing variables to mock qualities: $${undefinedVarNames.join(', $')}`}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--tool-border)',
                            color: 'var(--tool-text-dim)',
                            borderRadius: '4px',
                            padding: '0.25rem 0.55rem',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        ⚡ Extract $vars
                    </button>
                )}
                {storyId && (
                    <button
                        onClick={handleOpenPicker}
                        disabled={isLoadingPlayers}
                        title="Import quality state from a real character in this story"
                        style={{
                            background: showPicker ? 'rgba(97,175,239,0.15)' : 'transparent',
                            border: `1px solid ${showPicker ? 'var(--tool-accent)' : 'var(--tool-border)'}`,
                            color: showPicker ? 'var(--tool-accent)' : 'var(--tool-text-dim)',
                            borderRadius: '4px',
                            padding: '0.25rem 0.55rem',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {isLoadingPlayers ? '…' : '⬇ Import Character State'}
                    </button>
                )}
                <span style={{ flex: 1 }} />
                <button
                    onClick={onSendWithTestValues}
                    title="Send source code preprocessed with these quality values to the Strudel REPL"
                    style={{
                        background: 'rgba(152,195,121,0.15)',
                        border: '1px solid var(--success-color)',
                        color: 'var(--success-color)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.6rem',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                    }}
                >
                    ▶ Send with Test Values
                </button>
            </div>

            {/* Character picker — drops in below the header */}
            {showPicker && (
                <div style={{
                    flexShrink: 0,
                    borderBottom: '1px solid var(--tool-border)',
                    background: 'var(--tool-bg-sidebar)',
                    maxHeight: '150px',
                    overflowY: 'auto',
                }}>
                    {players.length === 0 ? (
                        <div style={{ padding: '0.6rem 0.75rem', color: 'var(--tool-text-dim)', fontSize: '0.75rem' }}>
                            No characters found in this story.
                        </div>
                    ) : players.map((p, i) => (
                        <button
                            key={p._id ?? i}
                            onClick={() => handleSelectCharacter(p)}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                borderBottom: '1px solid var(--tool-border)',
                                padding: '0.4rem 0.75rem',
                                cursor: 'pointer',
                                color: 'var(--tool-text-header)',
                                fontSize: '0.75rem',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(97,175,239,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            <span style={{ fontWeight: 600 }}>{p.name || 'Unnamed'}</span>
                            <span style={{ marginLeft: '0.5rem', color: 'var(--tool-text-dim)', fontSize: '0.7rem' }}>
                                {p.username} · {Object.keys(p.qualities ?? {}).length} qualities
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Quality variable editor — fills remaining space */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <ScribeDebugger
                    onUpdate={onUpdate}
                    initialRows={importedRows}
                    resetKey={importResetKey}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StrudelEditor({ data, onChange, storyId }: Props) {
    const initialSource = data.source || DEFAULT_STRUDEL_SOURCE;

    // Editor state
    const [rawSource, setRawSource] = useState(initialSource);
    const [iframeSrc, setIframeSrc] = useState(() => buildStrudelUrl(initialSource));
    const [bottomTab, setBottomTab] = useState<'scribe' | 'samples'>('scribe');

    // Syntax hint — open by default for first-time users, persisted in localStorage
    const [showSyntaxHint, setShowSyntaxHint] = useState<boolean>(() => {
        if (typeof window === 'undefined') return true;
        const stored = window.localStorage.getItem('strudel-syntax-hint');
        return stored === null ? true : stored === 'true';
    });

    const toggleSyntaxHint = useCallback(() => {
        setShowSyntaxHint(prev => {
            const next = !prev;
            try { window.localStorage.setItem('strudel-syntax-hint', String(next)); } catch { /* ignore */ }
            return next;
        });
    }, []);

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
    const [isLoadingSamples, setIsLoadingSamples] = useState(true);
    const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);
    const [isLoadingLocalGroups, setIsLoadingLocalGroups] = useState(true);
    const [uploadingName, setUploadingName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const debouncedSource = useDebounce(rawSource, 500);


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
        fetch('/api/admin/local-samples')
            .then(r => r.json())
            .then(j => setLocalGroups(j.groups || []))
            .catch(() => {})
            .finally(() => setIsLoadingLocalGroups(false));
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
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        // Scan both raw and processed code so ScribeScript conditionals don't hide names
        const referenced = new Set([...extractSampleNames(source), ...extractSampleNames(processed)]);

        const lines: string[] = [];

        // Local library samples — load via URL endpoint so Strudel fetches the strudel.json
        // format at runtime. This avoids inline URL strings with slashes that trigger
        // Strudel's mini-notation parser on the source code.
        lines.push(`samples('${origin}/api/strudel-samples');`);

        // Cloud-uploaded samples — inline as single-string entries (only referenced ones)
        const cloudEntries: string[] = [];
        for (const s of samples) {
            if (!referenced.has(s.id)) continue;
            cloudEntries.push(`  "${s.id}": "${s.url}"`);
        }
        if (cloudEntries.length > 0) {
            lines.push(`samples({\n${cloudEntries.join(',\n')}\n});`);
        }

        return `${lines.join('\n')}\n\n${processed}`;
    }, [samples]); // localGroups no longer needed — local samples load via URL

    // ── Auto-send to REPL once after cloud samples have loaded ────────────────
    // Local library samples load via URL (no wait needed); only cloud samples require loading.
    const hasSentInitial = useRef(false);
    useEffect(() => {
        if (isLoadingSamples) return;
        if (hasSentInitial.current) return;
        hasSentInitial.current = true;
        setIframeSrc(buildStrudelUrl(buildFinalCode(rawSource, {})));
    }, [isLoadingSamples]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        padding: '0.4rem 0.65rem',
                        borderBottom: '1px solid var(--tool-border)',
                        flexShrink: 0,
                        background: 'var(--tool-bg)',
                    }}>
                        <span style={{
                            fontSize: '0.75rem',
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
                            onClick={toggleSyntaxHint}
                            title={showSyntaxHint ? 'Hide ScribeScript syntax reference' : 'Show ScribeScript syntax reference ({{...}} templates)'}
                            style={{
                                background: showSyntaxHint ? 'rgba(97,175,239,0.15)' : 'transparent',
                                border: `1px solid ${showSyntaxHint ? '#61afef' : '#61afef55'}`,
                                color: showSyntaxHint ? '#61afef' : 'var(--tool-text-dim)',
                                borderRadius: '3px',
                                padding: '0.15rem 0.4rem',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
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
                                padding: '0.3rem 0.7rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
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
                        padding: '0.4rem 0.65rem',
                        borderBottom: '1px solid var(--tool-border)',
                        background: 'var(--tool-bg)',
                        fontSize: '0.75rem',
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
                                padding: '0.4rem 1rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
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
                                    fontSize: '0.75rem',
                                }}>
                                    {samples.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content — both always mounted, hidden via CSS to preserve state */}
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ display: bottomTab === 'scribe' ? 'flex' : 'none', flexDirection: 'column', position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        <ScribeScriptTab
                            onSendWithTestValues={handleSendWithTestValues}
                            onUpdate={handleDebuggerUpdate}
                            storyId={storyId}
                            rawSource={rawSource}
                            mockQualities={mockQualities}
                        />
                    </div>
                    <div style={{ display: bottomTab === 'samples' ? 'flex' : 'none', flexDirection: 'column', position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        <SamplesPanel
                            samples={samples}
                            localGroups={localGroups}
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
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Strudel built-in sample bank reference (SuperDirt default samples)
// ---------------------------------------------------------------------------

const STRUDEL_BUILTINS: { group: string; names: string[]; note?: string }[] = [
    { group: 'Kick / Bass Drum',  names: ['bd', 'kick', 'bassdm', 'bassdm2', 'gabba', 'industrial'] },
    { group: 'Snare',             names: ['sd', 'snare', 'sn', 'realsnare', 'realsquares'] },
    { group: 'Hi-hat',            names: ['hh', 'oh', 'hihat', 'hat'] },
    { group: 'Clap / Rim',        names: ['cp', 'clap', 'rim', 'cb', 'realclaps'] },
    { group: 'Cymbal',            names: ['cy', 'cymbal', 'cr', 'rd'] },
    { group: 'Toms',              names: ['lt', 'mt', 'ht', 'perc'] },
    { group: 'Full Kits',         names: ['gretsch', 'rnb', 'jazz'], note: 'multi-sample drum kits' },
    { group: 'Breakbeats',        names: ['amen', 'amencutup', 'breaks125', 'breaks152', 'breaks165', 'breakbeat'], note: 'use :N for different cuts' },
    { group: 'Bass / Low-end',    names: ['bass', 'bass0', 'bass1', 'bass2', 'bass3', 'jvbass', 'bassdm'] },
    { group: 'Keyboard / Tonal',  names: ['piano', 'casio', 'rhodes', 'supersaw', 'moog', 'pad', 'lead'] },
    { group: 'Electronic',        names: ['rave', 'rave2', 'metal', 'noise', 'glitch', 'tech', 'tink', 'feel'] },
    { group: 'FX / Atmosphere',   names: ['space', 'east', 'west', 'wind', 'seashore', 'bubble', 'click'] },
    { group: 'Voice / Speech',    names: ['alphabet', 'numbers', 'diphone', 'speech', 'speakspell', 'voice'] },
    { group: 'Nature',            names: ['birds', 'crow', 'frog', 'insect', 'jungle'] },
    { group: 'Tabla / World',     names: ['tabla', 'tabla2', 'chin', 'bottle'] },
    { group: 'General MIDI',      names: ['gm'], note: 'use note() + .s("gm:N") for GM patch N' },
];

// ---------------------------------------------------------------------------
// Samples panel sub-component
// ---------------------------------------------------------------------------

interface LocalGroup {
    id: string;
    name: string;
    category: string;
    instruments: {
        id: string;
        label: string;
        preview: string | null;
        files: (string | { note: string; url: string })[];
        type: 'percussion' | 'melodic';
    }[];
}

interface SamplesPanelProps {
    samples: StrudelSample[];
    localGroups: LocalGroup[];
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

/** Shared audio element for previewing local files */
let _previewAudio: HTMLAudioElement | null = null;

function playPreview(url: string, onEnd?: () => void) {
    if (_previewAudio) { _previewAudio.pause(); _previewAudio.src = ''; }
    _previewAudio = new Audio(url);
    if (onEnd) _previewAudio.onended = onEnd;
    _previewAudio.play().catch(() => {});
}

function stopPreview() {
    if (_previewAudio) { _previewAudio.pause(); _previewAudio.src = ''; _previewAudio = null; }
}

function copyToClipboard(text: string) {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
}

function SamplesPanel({
    samples, localGroups, isLoading, isUploading, uploadingName, selectedFileName, uploadError,
    fileInputRef, onFileSelect, onNameChange, onUpload, onDelete,
}: SamplesPanelProps) {
    const [showBuiltins, setShowBuiltins] = useState(false);
    const [showLocalLib, setShowLocalLib] = useState(true);
    const [localLibSearch, setLocalLibSearch] = useState('');
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>('jazz_kit');

    const handlePlay = useCallback((url: string) => {
        if (playingUrl === url) { stopPreview(); setPlayingUrl(null); return; }
        setPlayingUrl(url);
        playPreview(url, () => setPlayingUrl(null));
    }, [playingUrl]);

    const handleCopy = useCallback((text: string) => {
        copyToClipboard(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 1500);
    }, []);

    const canUpload = !!selectedFileName && !!uploadingName.trim() && !isUploading;

    const cell: React.CSSProperties = {
        padding: '0.45rem 0.65rem',
        fontSize: '0.88rem',
        borderBottom: '1px solid var(--tool-border)',
        color: 'var(--tool-text-header)',
        verticalAlign: 'middle',
    };
    const dimCell: React.CSSProperties = { ...cell, color: 'var(--tool-text-dim)' };

    // ── Chip used for both local library and Strudel builtins ────────────────
    const Chip = ({ label, previewUrl, copyText, color = 'var(--info-color)' }: {
        label: string; previewUrl?: string | null; copyText: string; color?: string;
    }) => {
        const isPlaying = previewUrl && playingUrl === previewUrl;
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontFamily: 'monospace',
                    color,
                    background: `${color}18`,
                    border: `1px solid ${color}44`,
                    borderRadius: '4px',
                    padding: '0.1rem 0.35rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.12s',
                    position: 'relative',
                }}
            >
                {previewUrl && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePlay(previewUrl); }}
                        title={isPlaying ? 'Stop' : 'Preview'}
                        style={{
                            background: 'none', border: 'none', padding: '0 2px 0 0',
                            color: isPlaying ? color : `${color}99`,
                            cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1,
                        }}
                    >
                        {isPlaying ? '■' : '▶'}
                    </button>
                )}
                <span
                    onClick={() => handleCopy(copyText)}
                    title={`Click to copy: ${copyText}`}
                    style={{ cursor: 'pointer' }}
                >
                    {label}
                </span>
                {copied === copyText && (
                    <span style={{ position: 'absolute', top: '-1.4rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--tool-bg)', border: '1px solid var(--tool-border)', borderRadius: '3px', padding: '0.1rem 0.35rem', fontSize: '0.68rem', whiteSpace: 'nowrap', color: 'var(--success-color)', zIndex: 20 }}>
                        copied!
                    </span>
                )}
            </span>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxSizing: 'border-box' }}>

                {/* ── Upload form ──────────────────────────────────────────── */}
                <div style={{
                    background: 'rgba(97,175,239,0.05)',
                    border: '1px dashed var(--tool-accent-fade, #61afef55)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                    flexShrink: 0,
                }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Upload Custom Sample (Cloud)
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input ref={fileInputRef} type="file" accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.webm" onChange={onFileSelect} style={{ display: 'none' }} />
                        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-header)', borderRadius: '4px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                            Choose file…
                        </button>
                        <span style={{ fontSize: '0.82rem', color: selectedFileName ? 'var(--tool-text-header)' : 'var(--tool-text-dim)', fontFamily: 'monospace' }}>
                            {selectedFileName || 'wav · mp3 · ogg · flac · aiff · webm'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--tool-text-dim)', whiteSpace: 'nowrap' }}>Name in Strudel:</label>
                        <input value={uploadingName} onChange={e => onNameChange(e.target.value)} placeholder="e.g. kick" style={{ background: 'var(--tool-bg-code-editor, #1a1a1a)', border: '1px solid var(--tool-border)', borderRadius: '4px', color: 'var(--tool-text-header)', padding: '0.35rem 0.55rem', fontSize: '0.88rem', fontFamily: 'monospace', width: '140px', outline: 'none' }} />
                        <button onClick={onUpload} disabled={!canUpload} style={{ background: canUpload ? 'rgba(152,195,121,0.2)' : 'rgba(152,195,121,0.07)', border: '1px solid var(--success-color)', color: 'var(--success-color)', borderRadius: '4px', padding: '0.35rem 0.8rem', cursor: canUpload ? 'pointer' : 'default', fontSize: '0.88rem', fontFamily: 'inherit', opacity: canUpload ? 1 : 0.4 }}>
                            {isUploading ? 'Uploading…' : '↑ Upload'}
                        </button>
                    </div>
                    {uploadError && <span style={{ fontSize: '0.82rem', color: 'var(--danger-color)' }}>{uploadError}</span>}
                </div>

                {/* ── Cloud-uploaded samples ────────────────────────────────── */}
                {isLoading ? (
                    <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.88rem' }}>Loading samples…</span>
                ) : samples.length > 0 && (
                    <>
                        <div style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Cloud Samples</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--tool-border)' }}>
                                    <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Name</th>
                                    <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Usage</th>
                                    <th style={{ ...dimCell, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Size</th>
                                    <th style={{ ...dimCell, width: '52px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {samples.map(s => (
                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--tool-border)' }}>
                                        <td style={cell}><code style={{ fontFamily: 'monospace', color: 'var(--warning-color)' }}>{s.id}</code></td>
                                        <td style={dimCell}><code style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--info-color)' }}>.s("{s.id}")</code></td>
                                        <td style={{ ...dimCell, textAlign: 'right' }}>{formatBytes(s.size)}</td>
                                        <td style={{ ...cell, textAlign: 'right', padding: '0 0.4rem' }}>
                                            <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
                                                <button onClick={() => handlePlay(s.url)} title={playingUrl === s.url ? 'Stop' : 'Preview'} style={{ background: playingUrl === s.url ? 'rgba(97,175,239,0.2)' : 'none', border: 'none', color: playingUrl === s.url ? 'var(--tool-accent)' : 'var(--tool-text-dim)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px', lineHeight: 1 }}>
                                                    {playingUrl === s.url ? '■' : '▶'}
                                                </button>
                                                <button onClick={() => onDelete(s.id)} title={`Delete "${s.id}"`} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px', lineHeight: 1 }}>×</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* ── Chronicle Hub local sound library ────────────────────── */}
                <div style={{ flexShrink: 0 }}>
                    <button
                        onClick={() => setShowLocalLib(l => !l)}
                        style={{ background: showLocalLib ? 'rgba(229,192,123,0.08)' : 'transparent', border: `1px solid ${showLocalLib ? 'var(--warning-color)' : 'var(--tool-border)'}`, color: showLocalLib ? 'var(--warning-color)' : 'var(--tool-text-dim)', borderRadius: '4px', padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <span style={{ fontSize: '0.7rem' }}>{showLocalLib ? '▼' : '▶'}</span>
                        Chronicle Hub Sound Library
                        <span style={{ marginLeft: 'auto', opacity: 0.65, fontSize: '0.75rem' }}>local · click ▶ to preview</span>
                    </button>

                    {showLocalLib && localGroups.length > 0 && (
                        <div style={{ marginTop: '0.5rem', border: '1px solid var(--tool-border)', borderRadius: '4px', overflow: 'hidden' }}>
                            {/* Search */}
                            <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-sidebar)' }}>
                                <input
                                    value={localLibSearch}
                                    onChange={e => setLocalLibSearch(e.target.value)}
                                    placeholder="Filter instruments…"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--tool-text-header)', outline: 'none', fontSize: '0.85rem', fontFamily: 'inherit', width: '100%' }}
                                />
                            </div>
                            {/* Groups */}
                            {localGroups.map(group => {
                                const filtered = localLibSearch.trim()
                                    ? group.instruments.filter(i => i.label.toLowerCase().includes(localLibSearch.toLowerCase()) || i.id.toLowerCase().includes(localLibSearch.toLowerCase()))
                                    : group.instruments;
                                if (filtered.length === 0) return null;
                                const isOpen = expandedGroup === group.id || !!localLibSearch.trim();
                                return (
                                    <div key={group.id} style={{ borderBottom: '1px solid var(--tool-border)' }}>
                                        <button
                                            onClick={() => setExpandedGroup(isOpen && !localLibSearch.trim() ? null : group.id)}
                                            style={{ width: '100%', textAlign: 'left', background: 'var(--tool-bg)', border: 'none', padding: '0.4rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            <span style={{ fontSize: '0.65rem', color: 'var(--tool-text-dim)' }}>{isOpen ? '▼' : '▶'}</span>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--tool-text-header)' }}>{group.name}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>{group.category}</span>
                                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>{filtered.length} instruments</span>
                                        </button>
                                        {isOpen && (
                                            <div style={{ padding: '0.4rem 0.65rem 0.5rem', background: 'var(--tool-bg-sidebar)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                {filtered.map(inst => {
                                                    const previewUrl = inst.preview;
                                                    const strudelId = inst.id;
                                                    return (
                                                        <div key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', borderBottom: '1px solid var(--tool-border)' }}>
                                                            <button
                                                                onClick={() => previewUrl && handlePlay(previewUrl)}
                                                                title={previewUrl ? (playingUrl === previewUrl ? 'Stop' : 'Preview') : 'No preview'}
                                                                disabled={!previewUrl}
                                                                style={{ background: previewUrl && playingUrl === previewUrl ? 'rgba(229,192,123,0.2)' : 'transparent', border: `1px solid ${previewUrl && playingUrl === previewUrl ? 'var(--warning-color)' : 'var(--tool-border)'}`, color: previewUrl ? (playingUrl === previewUrl ? 'var(--warning-color)' : 'var(--tool-text-dim)') : 'transparent', borderRadius: '3px', padding: '0.1rem 0.4rem', cursor: previewUrl ? 'pointer' : 'default', fontSize: '0.78rem', lineHeight: 1 }}
                                                            >
                                                                {previewUrl && playingUrl === previewUrl ? '■' : '▶'}
                                                            </button>
                                                            <span style={{ flex: 1, fontSize: '0.88rem', color: 'var(--tool-text-header)' }}>{inst.label}</span>
                                                            <code
                                                                onClick={() => handleCopy(strudelId)}
                                                                title="Click to copy Strudel sample name"
                                                                style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--warning-color)', background: 'rgba(229,192,123,0.1)', borderRadius: '3px', padding: '0.1rem 0.35rem', cursor: 'pointer', position: 'relative' }}
                                                            >
                                                                {strudelId}
                                                                {copied === strudelId && <span style={{ position: 'absolute', top: '-1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'var(--tool-bg)', border: '1px solid var(--tool-border)', borderRadius: '3px', padding: '0.1rem 0.3rem', fontSize: '0.68rem', color: 'var(--success-color)', whiteSpace: 'nowrap', zIndex: 20 }}>copied!</span>}
                                                            </code>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {showLocalLib && localGroups.length === 0 && isLoading && (
                        <div style={{ marginTop: '0.4rem', padding: '0.6rem', background: 'var(--tool-bg-sidebar)', borderRadius: '4px', color: 'var(--tool-text-dim)', fontSize: '0.85rem' }}>
                            Loading library…
                        </div>
                    )}
                </div>

                {/* ── Strudel built-in samples reference ───────────────────── */}
                <div style={{ flexShrink: 0 }}>
                    <button
                        onClick={() => setShowBuiltins(b => !b)}
                        style={{ background: showBuiltins ? 'rgba(86,182,194,0.08)' : 'transparent', border: `1px solid ${showBuiltins ? 'var(--info-color)' : 'var(--tool-border)'}`, color: showBuiltins ? 'var(--info-color)' : 'var(--tool-text-dim)', borderRadius: '4px', padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'inherit', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                        <span style={{ fontSize: '0.7rem' }}>{showBuiltins ? '▼' : '▶'}</span>
                        Strudel Built-in Samples (SuperDirt)
                        <span style={{ marginLeft: 'auto', opacity: 0.65, fontSize: '0.75rem' }}>click chip to copy name</span>
                    </button>

                    {showBuiltins && (
                        <div style={{ marginTop: '0.5rem', border: '1px solid var(--tool-border)', borderRadius: '4px', overflow: 'hidden', fontSize: '0.85rem' }}>
                            <div style={{ padding: '0.5rem 0.7rem', background: 'var(--tool-bg-sidebar)', borderBottom: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', fontSize: '0.78rem' }}>
                                Built in to Strudel.cc — use <code style={{ fontFamily: 'monospace', color: 'var(--info-color)' }}>.s("name")</code> or <code style={{ fontFamily: 'monospace', color: 'var(--info-color)' }}>s("name")</code>.
                                Append <code style={{ fontFamily: 'monospace', color: 'var(--info-color)' }}>:N</code> for variation (e.g. <code style={{ fontFamily: 'monospace' }}>s("bd:2")</code>).
                                Click a chip to copy its name.
                            </div>
                            {STRUDEL_BUILTINS.map(group => (
                                <div key={group.group} style={{ padding: '0.45rem 0.7rem', borderBottom: '1px solid var(--tool-border)', display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.75rem', flexShrink: 0, minWidth: '140px' }}>{group.group}</span>
                                    <span style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {group.names.map(n => (
                                            <Chip key={n} label={n} copyText={n} />
                                        ))}
                                    </span>
                                    {group.note && <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.72rem', fontStyle: 'italic' }}>— {group.note}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
