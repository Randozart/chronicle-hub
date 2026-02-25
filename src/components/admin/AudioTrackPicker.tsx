'use client';

/**
 * AudioTrackPicker — text input + dropdown helper for music track IDs.
 * SamplePicker    — text input + dropdown helper for uploaded audio sample URLs.
 *
 * Both support raw text editing (for ScribeScript expressions, comma-separated
 * playlists, or complex conditionals) alongside a "Browse" dropdown for quickly
 * inserting individual IDs/URLs.
 *
 * Examples of valid values:
 *   Plain:       "ambient_forest"
 *   Playlist:    "combat_a, combat_b, combat_c"
 *   Conditional: "{ $combat > 5 : battle_drums | ambient_rain }"
 *   Combined:    "{ $combat > 5 : battle_a, battle_b | ambient_a }"
 */

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
    flex: 1,
    background: 'var(--tool-bg)',
    border: '1px solid var(--tool-border)',
    color: 'var(--tool-text)',
    borderRadius: '4px 0 0 4px',
    padding: '0.3rem 0.5rem',
    fontSize: '0.82rem',
    minWidth: 0,
    fontFamily: 'monospace',
    outline: 'none',
};

const btnStyle: React.CSSProperties = {
    background: 'var(--tool-bg)',
    border: '1px solid var(--tool-border)',
    borderLeft: 'none',
    color: 'var(--tool-text-dim)',
    borderRadius: '0 4px 4px 0',
    padding: '0.3rem 0.5rem',
    cursor: 'pointer',
    fontSize: '0.78rem',
    whiteSpace: 'nowrap',
};

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 200,
    background: 'var(--tool-bg)',
    border: '1px solid var(--tool-border)',
    borderRadius: '0 0 4px 4px',
    maxHeight: '180px',
    overflowY: 'auto',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const dropdownItemStyle: React.CSSProperties = {
    padding: '0.35rem 0.6rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: 'var(--tool-text)',
    borderBottom: '1px solid var(--tool-border)',
};

// ---------------------------------------------------------------------------
// AudioTrackPicker
// ---------------------------------------------------------------------------

interface TrackPickerProps {
    storyId: string;
    value?: string;
    onChange: (v: string | undefined) => void;
    placeholder?: string;
}

interface TrackOption { id: string; name: string; }

export function AudioTrackPicker({ storyId, value, onChange, placeholder = 'None — or type a ScribeScript expression' }: TrackPickerProps) {
    const [tracks, setTracks] = useState<TrackOption[]>([]);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch(`/api/admin/audio?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => {
                const opts: TrackOption[] = [];
                if (data.music) Object.values(data.music).forEach((t: any) => opts.push({ id: t.id, name: t.name || t.id }));
                if (data.globalTracks) Object.values(data.globalTracks).forEach((t: any) => opts.push({ id: t.id, name: `[Global] ${t.name || t.id}` }));
                opts.sort((a, b) => a.name.localeCompare(b.name));
                setTracks(opts);
            })
            .catch(() => {});
    }, [storyId]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const appendId = (id: string) => {
        const cur = value?.trim() ?? '';
        onChange(cur ? `${cur}, ${id}` : id);
        setOpen(false);
    };

    return (
        <div ref={wrapRef} style={{ display: 'flex', position: 'relative' }}>
            <input
                type="text"
                value={value ?? ''}
                onChange={e => onChange(e.target.value || undefined)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--tool-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--tool-border)')}
            />
            <button
                type="button"
                style={btnStyle}
                onClick={() => setOpen(o => !o)}
                title="Browse tracks"
            >
                ▾ Browse
            </button>
            {open && (
                <div style={dropdownStyle}>
                    <div
                        style={{ ...dropdownItemStyle, color: 'var(--tool-text-dim)', fontStyle: 'italic' }}
                        onClick={() => { onChange(undefined); setOpen(false); }}
                    >
                        — Clear —
                    </div>
                    {tracks.map(t => (
                        <div
                            key={t.id}
                            style={{ ...dropdownItemStyle, background: value?.includes(t.id) ? 'var(--tool-bg-hover)' : undefined }}
                            onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = 'var(--tool-bg-hover)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = value?.includes(t.id) ? 'var(--tool-bg-hover)' : 'transparent')}
                            onClick={() => appendId(t.id)}
                            title={`Append "${t.id}" to the field`}
                        >
                            {t.name}
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', opacity: 0.5, fontFamily: 'monospace' }}>{t.id}</span>
                        </div>
                    ))}
                    {tracks.length === 0 && (
                        <div style={{ ...dropdownItemStyle, color: 'var(--tool-text-dim)', fontStyle: 'italic' }}>No tracks found</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// SamplePicker
// ---------------------------------------------------------------------------

interface SamplePickerProps {
    /** The stored value is a sample URL (not an ID) since the game engine plays by URL.
     *  May also be a ScribeScript expression or comma-separated list of URLs. */
    value?: string;
    onChange: (v: string | undefined) => void;
    placeholder?: string;
}

interface SampleOption { id: string; url: string; category?: string; }

export function SamplePicker({ value, onChange, placeholder = 'None — or type a ScribeScript expression' }: SamplePickerProps) {
    const [samples, setSamples] = useState<SampleOption[]>([]);
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/admin/samples')
            .then(r => r.json())
            .then(data => {
                const opts: SampleOption[] = (data.samples || []).map((s: any) => ({
                    id: s.id, url: s.url, category: s.category,
                }));
                opts.sort((a, b) => a.id.localeCompare(b.id));
                setSamples(opts);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const appendUrl = (url: string) => {
        const cur = value?.trim() ?? '';
        onChange(cur ? `${cur}, ${url}` : url);
        setOpen(false);
    };

    return (
        <div ref={wrapRef} style={{ display: 'flex', position: 'relative' }}>
            <input
                type="text"
                value={value ?? ''}
                onChange={e => onChange(e.target.value || undefined)}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'var(--tool-accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--tool-border)')}
            />
            <button
                type="button"
                style={btnStyle}
                onClick={() => setOpen(o => !o)}
                title="Browse samples"
            >
                ▾ Browse
            </button>
            {open && (
                <div style={dropdownStyle}>
                    <div
                        style={{ ...dropdownItemStyle, color: 'var(--tool-text-dim)', fontStyle: 'italic' }}
                        onClick={() => { onChange(undefined); setOpen(false); }}
                    >
                        — Clear —
                    </div>
                    {samples.map(s => (
                        <div
                            key={s.id}
                            style={{ ...dropdownItemStyle }}
                            onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = 'var(--tool-bg-hover)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
                            onClick={() => appendUrl(s.url)}
                            title={`Append URL for "${s.id}"`}
                        >
                            {s.category ? <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>[{s.category}] </span> : null}
                            {s.id}
                        </div>
                    ))}
                    {samples.length === 0 && (
                        <div style={{ ...dropdownItemStyle, color: 'var(--tool-text-dim)', fontStyle: 'italic' }}>No samples uploaded yet</div>
                    )}
                </div>
            )}
        </div>
    );
}
