'use client';

/**
 * AudioTrackPicker — select a music track by ID from a story's music catalogue.
 * SamplePicker    — select an uploaded audio sample (sound sting) from the user's library.
 *
 * Both are lightweight self-fetching selects for use inside creator-studio editor forms.
 */

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Shared select style
// ---------------------------------------------------------------------------

const selectStyle: React.CSSProperties = {
    background: 'var(--tool-bg)',
    border: '1px solid var(--tool-border)',
    color: 'var(--tool-text)',
    borderRadius: '4px',
    padding: '0.3rem 0.5rem',
    fontSize: '0.82rem',
    flex: 1,
    cursor: 'pointer',
    minWidth: 0,
};

// ---------------------------------------------------------------------------
// AudioTrackPicker
// ---------------------------------------------------------------------------

interface TrackPickerProps {
    storyId: string;
    value?: string;
    onChange: (trackId: string | undefined) => void;
    placeholder?: string;
}

interface TrackOption { id: string; name: string; }

export function AudioTrackPicker({ storyId, value, onChange, placeholder = 'None' }: TrackPickerProps) {
    const [tracks, setTracks] = useState<TrackOption[]>([]);

    useEffect(() => {
        fetch(`/api/admin/audio?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => {
                const opts: TrackOption[] = [];
                if (data.music) {
                    Object.values(data.music).forEach((t: any) => opts.push({ id: t.id, name: t.name || t.id }));
                }
                // Global tracks
                if (data.globalTracks) {
                    Object.values(data.globalTracks).forEach((t: any) => opts.push({ id: t.id, name: `[Global] ${t.name || t.id}` }));
                }
                opts.sort((a, b) => a.name.localeCompare(b.name));
                setTracks(opts);
            })
            .catch(() => {});
    }, [storyId]);

    return (
        <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || undefined)}
            style={selectStyle}
        >
            <option value="">{placeholder}</option>
            {tracks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
            ))}
        </select>
    );
}

// ---------------------------------------------------------------------------
// SamplePicker
// ---------------------------------------------------------------------------

interface SamplePickerProps {
    /** The stored value is a sample URL (not an ID) since the game engine plays by URL. */
    value?: string;
    onChange: (sampleUrl: string | undefined) => void;
    placeholder?: string;
}

interface SampleOption { id: string; url: string; category?: string; }

export function SamplePicker({ value, onChange, placeholder = 'None' }: SamplePickerProps) {
    const [samples, setSamples] = useState<SampleOption[]>([]);

    useEffect(() => {
        fetch('/api/admin/samples')
            .then(r => r.json())
            .then(data => {
                const opts: SampleOption[] = (data.samples || []).map((s: any) => ({
                    id: s.id,
                    url: s.url,
                    category: s.category,
                }));
                opts.sort((a, b) => a.id.localeCompare(b.id));
                setSamples(opts);
            })
            .catch(() => {});
    }, []);

    return (
        <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || undefined)}
            style={selectStyle}
        >
            <option value="">{placeholder}</option>
            {samples.map(s => (
                <option key={s.id} value={s.url}>{s.category ? `[${s.category}] ${s.id}` : s.id}</option>
            ))}
        </select>
    );
}
