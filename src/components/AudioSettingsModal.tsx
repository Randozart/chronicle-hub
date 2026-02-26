'use client';

import { useAudio } from '@/providers/AudioProvider';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function AudioSettingsModal({ isOpen, onClose }: Props) {
    const {
        musicMuted, setMusicMuted,
        sfxMuted, setSfxMuted,
        sfxVolume, setSfxVolume,
        masterVolume, setMasterVolume,
        isStrudelPlaying, stopStrudelTrack,
    } = useAudio();

    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
    };

    const modalStyle: React.CSSProperties = {
        background: 'var(--bg-panel, #1a1a2e)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
        borderRadius: '8px',
        padding: '1.5rem',
        width: '300px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        color: 'var(--text-primary, #e0e0e0)',
    };

    const rowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        gap: '0.75rem',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.82rem',
        color: 'var(--text-secondary, #aaa)',
        flex: 1,
    };

    const sliderStyle: React.CSSProperties = {
        flex: 2,
        accentColor: 'var(--accent-color, #61afef)',
        cursor: 'pointer',
    };

    const toggleStyle = (active: boolean): React.CSSProperties => ({
        width: '36px',
        height: '20px',
        borderRadius: '999px',
        background: active ? 'var(--accent-color, #61afef)' : 'var(--border-color, #444)',
        position: 'relative',
        cursor: 'pointer',
        border: 'none',
        transition: 'background 0.2s',
        flexShrink: 0,
    });

    const toggleThumbStyle = (active: boolean): React.CSSProperties => ({
        position: 'absolute',
        top: '3px',
        left: active ? '18px' : '3px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        pointerEvents: 'none',
    });

    const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
        <button
            style={toggleStyle(on)}
            onClick={onToggle}
            title={on ? 'Enabled' : 'Disabled'}
            aria-pressed={on}
        >
            <span style={toggleThumbStyle(on)} />
        </button>
    );

    // Master volume is in dB (-60 to 0). Convert to 0-100 slider.
    const dbToSlider = (db: number) => Math.round(((db + 60) / 60) * 100);
    const sliderToDb = (v: number) => (v / 100) * 60 - 60;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Audio Settings</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted, #666)', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Music section */}
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted, #666)', marginBottom: '0.6rem' }}>
                    Music
                </p>

                <div style={rowStyle}>
                    <span style={labelStyle}>Enable Music</span>
                    <Toggle
                        on={!musicMuted}
                        onToggle={() => {
                            if (!musicMuted && isStrudelPlaying) stopStrudelTrack();
                            setMusicMuted(!musicMuted);
                        }}
                    />
                </div>

                <div style={{ ...rowStyle, opacity: musicMuted ? 0.4 : 1, pointerEvents: musicMuted ? 'none' : 'auto' }}>
                    <span style={labelStyle}>Volume</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={dbToSlider(masterVolume)}
                        onChange={e => setMasterVolume(sliderToDb(Number(e.target.value)))}
                        style={sliderStyle}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)', minWidth: '30px', textAlign: 'right' }}>
                        {dbToSlider(masterVolume)}%
                    </span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', margin: '0.75rem 0' }} />

                {/* SFX section */}
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted, #666)', marginBottom: '0.6rem' }}>
                    Sound Effects
                </p>

                <div style={rowStyle}>
                    <span style={labelStyle}>Enable SFX</span>
                    <Toggle on={!sfxMuted} onToggle={() => setSfxMuted(!sfxMuted)} />
                </div>

                <div style={{ ...rowStyle, opacity: sfxMuted ? 0.4 : 1, pointerEvents: sfxMuted ? 'none' : 'auto' }}>
                    <span style={labelStyle}>Volume</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(sfxVolume * 100)}
                        onChange={e => setSfxVolume(Number(e.target.value) / 100)}
                        style={sliderStyle}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)', minWidth: '30px', textAlign: 'right' }}>
                        {Math.round(sfxVolume * 100)}%
                    </span>
                </div>
            </div>
        </div>
    );
}
