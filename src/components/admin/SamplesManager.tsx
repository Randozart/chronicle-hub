'use client';

import { useState, useRef, useEffect } from 'react';

interface StrudelSample {
    id: string;
    url: string;
    size: number;
    uploadedAt: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SamplesManager() {
    const [samples, setSamples] = useState<StrudelSample[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingName, setUploadingName] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        load();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const load = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/samples');
            const json = await res.json();
            setSamples(json.samples || []);
        } catch { /* ignore */ } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) { setSelectedFileName(''); return; }
        setSelectedFileName(file.name);
        const base = file.name.split('.').slice(0, -1).join('_') || file.name;
        setUploadingName(base.replace(/[^a-z0-9_-]/gi, '_').toLowerCase());
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

    const handleDelete = async (id: string) => {
        if (!confirm(`Delete sample "${id}"? This cannot be undone.`)) return;
        try {
            const res = await fetch('/api/admin/samples', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) setSamples(prev => prev.filter(s => s.id !== id));
        } catch { /* ignore */ }
    };

    const handlePlay = (sample: StrudelSample) => {
        if (playingId === sample.id) {
            audioRef.current?.pause();
            setPlayingId(null);
            return;
        }
        if (audioRef.current) {
            audioRef.current.pause();
        }
        const audio = new Audio(sample.url);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => setPlayingId(null);
        audioRef.current = audio;
        audio.play().catch(() => setPlayingId(null));
        setPlayingId(sample.id);
    };

    const canUpload = !!selectedFileName && !!uploadingName.trim() && !isUploading;

    const filteredSamples = search.trim()
        ? samples.filter(s => s.id.toLowerCase().includes(search.toLowerCase()))
        : samples;

    const cell: React.CSSProperties = {
        padding: '0.45rem 0.65rem',
        fontSize: '0.82rem',
        borderBottom: '1px solid var(--tool-border)',
        color: 'var(--tool-text-header)',
        verticalAlign: 'middle',
    };
    const dimCell: React.CSSProperties = { ...cell, color: 'var(--tool-text-dim)' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--tool-border)',
                background: 'var(--tool-bg)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
            }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--tool-text-dim)' }}>
                    Audio Samples
                </span>
                <span style={{ flex: 1 }} />

                {/* Search */}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    style={{
                        background: 'var(--tool-bg-sidebar)',
                        border: '1px solid var(--tool-border)',
                        borderRadius: '4px',
                        color: 'var(--tool-text-header)',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        fontFamily: 'inherit',
                        width: '160px',
                        outline: 'none',
                    }}
                />

                <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.75rem' }}>
                    {samples.length} sample{samples.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Upload form */}
            <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--tool-border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                background: 'rgba(97,175,239,0.04)',
            }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.webm"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--tool-border)',
                        color: 'var(--tool-text-header)',
                        borderRadius: '4px',
                        padding: '0.35rem 0.8rem',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Choose file…
                </button>
                <span style={{ fontSize: '0.75rem', color: selectedFileName ? 'var(--tool-text-header)' : 'var(--tool-text-dim)', fontFamily: 'monospace', minWidth: '120px' }}>
                    {selectedFileName || 'wav · mp3 · ogg · flac'}
                </span>

                <label style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', whiteSpace: 'nowrap' }}>
                    Name:
                </label>
                <input
                    value={uploadingName}
                    onChange={e => setUploadingName(e.target.value)}
                    placeholder="e.g. kick"
                    style={{
                        background: 'var(--tool-bg-code-editor, #1a1a1a)',
                        border: '1px solid var(--tool-border)',
                        borderRadius: '4px',
                        color: 'var(--tool-text-header)',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        width: '130px',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    style={{
                        background: canUpload ? 'rgba(152,195,121,0.2)' : 'rgba(152,195,121,0.07)',
                        border: '1px solid var(--success-color)',
                        color: 'var(--success-color)',
                        borderRadius: '4px',
                        padding: '0.35rem 0.8rem',
                        cursor: canUpload ? 'pointer' : 'default',
                        fontSize: '0.8rem',
                        fontFamily: 'inherit',
                        opacity: canUpload ? 1 : 0.4,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {isUploading ? 'Uploading…' : '↑ Upload'}
                </button>
                {uploadError && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger-color)' }}>{uploadError}</span>
                )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {isLoading ? (
                    <div style={{ padding: '2rem', color: 'var(--tool-text-dim)', textAlign: 'center' }}>Loading…</div>
                ) : filteredSamples.length === 0 ? (
                    <div style={{ padding: '2rem', color: 'var(--tool-text-dim)', textAlign: 'center', fontSize: '0.85rem' }}>
                        {search ? `No samples match "${search}".` : 'No samples uploaded yet.'}
                        {!search && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                                Upload an audio file above, then use it in Strudel with{' '}
                                <code style={{ fontFamily: 'monospace' }}>.s("name")</code>
                            </div>
                        )}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--tool-bg-sidebar)', zIndex: 1 }}>
                            <tr style={{ borderBottom: '1px solid var(--tool-border)' }}>
                                <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Name</th>
                                <th style={{ ...dimCell, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Strudel usage</th>
                                <th style={{ ...dimCell, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Size</th>
                                <th style={{ ...dimCell, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em' }}>Uploaded</th>
                                <th style={{ ...dimCell, width: '60px' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSamples.map(s => (
                                <tr
                                    key={s.id}
                                    style={{ borderBottom: '1px solid var(--tool-border)', background: playingId === s.id ? 'rgba(97,175,239,0.06)' : 'transparent' }}
                                >
                                    <td style={cell}>
                                        <code style={{ fontFamily: 'monospace', color: 'var(--warning-color)' }}>{s.id}</code>
                                    </td>
                                    <td style={dimCell}>
                                        <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--info-color)' }}>
                                            .s("{s.id}")
                                        </code>
                                    </td>
                                    <td style={{ ...dimCell, textAlign: 'right' }}>
                                        {formatBytes(s.size)}
                                    </td>
                                    <td style={{ ...dimCell, textAlign: 'right', fontSize: '0.7rem' }}>
                                        {new Date(s.uploadedAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ ...cell, textAlign: 'right', padding: '0 0.4rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                                            {/* Play/stop button */}
                                            <button
                                                onClick={() => handlePlay(s)}
                                                title={playingId === s.id ? 'Stop' : 'Preview'}
                                                style={{
                                                    background: playingId === s.id ? 'rgba(97,175,239,0.2)' : 'none',
                                                    border: 'none',
                                                    color: playingId === s.id ? 'var(--tool-accent)' : 'var(--tool-text-dim)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    padding: '0 4px',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                {playingId === s.id ? '■' : '▶'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                title={`Delete "${s.id}"`}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--danger-color)',
                                                    cursor: 'pointer',
                                                    fontSize: '1rem',
                                                    padding: '0 4px',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
