'use client';
import { useState, useEffect } from 'react';
import { LigatureTrack, InstrumentDefinition } from '@/engine/audio/models';
import ScribeEditor from '@/components/admin/ScribeEditor'; // Reusing your monospace editor
import { useAudio } from '@/providers/AudioProvider';

const EMPTY_TEMPLATE = `[CONFIG]
BPM: 120
Grid: 4
Time: 4/4
Scale: C Minor

[INSTRUMENTS]
// TrackName: InstrumentID
// Example: Lead: retro_lead

[DEFINITIONS]
// @AliasName = [NoteDefs]
// Example: @Power = [1, 5]

[PATTERN: Main]
// TrackName | Beat 1   Beat 2   Beat 3   Beat 4   |
// Example: Lead | 1 . . .  3 . . .  5 . . .  4 . . . |

[PLAYLIST]
// Arrange patterns here
// Example: Main
`;

interface Props {
    data: LigatureTrack;
    onSave: (d: any) => void;
    onDelete: () => void;
    availableInstruments: InstrumentDefinition[];
    enableDownload?: boolean; // <-- NEW PROP
}

export default function TrackEditor({ data, onSave, onDelete, availableInstruments, enableDownload = false }: Props) {
    const [form, setForm] = useState(data);
    const { playTrack, stop, isPlaying } = useAudio();
    const [status, setStatus] = useState("");

    useEffect(() => setForm(data), [data]);

    const handlePlay = () => {
        try {
            // We pass the raw text source and the list of ALL definition objects available
            // The parser will look up names in the [INSTRUMENTS] block against this list
            playTrack(form.source, availableInstruments);
            setStatus("Playing...");
        } catch (e: any) {
            setStatus("Error: " + e.message);
            stop();
        }
    };

    const handleStop = () => {
        stop();
        setStatus("Stopped");
    };

    const handleClear = () => {
        if (confirm("Replace the current track with a blank template?")) {
            setForm({ ...form, source: EMPTY_TEMPLATE });
        }
    };

    const handleDownload = () => {
        const blob = new Blob([form.source], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.id || 'track'}.lig`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Track: {form.name}</h2>
                    <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* --- 2. ADD THE NEW BUTTON --- */}
                    <button onClick={handleClear} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                        New Template
                    </button>
                    {isPlaying ? (
                        <button onClick={handleStop} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>■ Stop</button>
                    ) : (
                        <button onClick={handlePlay} className="save-btn" style={{ background: '#98c379', color: '#000' }}>▶ Play Preview</button>
                    )}
                    {enableDownload && (
                        <button onClick={handleDownload} style={{ background: '#56B6C2', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Download .lig
                        </button>
                    )}
                    <button onClick={() => onSave(form)} className="save-btn">Save</button>
                </div>
            </div>

            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">Ligature Source Code</label>
                {/* We use ScribeEditor for syntax highlighting if we updated prism, otherwise text area works */}
                <ScribeEditor 
                    value={form.source || ""} 
                    onChange={v => setForm({...form, source: v})} 
                    minHeight="500px"
                    placeholder="[CONFIG]..."
                />
            </div>
            
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#666' }}>
                <strong>Available Instruments:</strong> {availableInstruments.map(i => i.id).join(', ')}
            </div>

            <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', marginTop: '1rem', alignSelf: 'flex-start' }}>Delete Track</button>
        </div>
    );
}