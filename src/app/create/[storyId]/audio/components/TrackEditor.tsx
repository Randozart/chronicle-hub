'use client';
import { useState, useEffect } from 'react';
import { LigatureTrack, InstrumentDefinition } from '@/engine/audio/models';
import ScribeEditor from '@/components/admin/ScribeEditor'; // Reusing your monospace editor
import { useAudio } from '@/providers/AudioProvider';

interface Props {
    data: LigatureTrack;
    onSave: (d: any) => void;
    onDelete: () => void;
    availableInstruments: InstrumentDefinition[];
}

export default function TrackEditor({ data, onSave, onDelete, availableInstruments }: Props) {
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

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h2 style={{ margin: 0 }}>Track: {form.name}</h2>
                    <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {isPlaying ? (
                        <button onClick={handleStop} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>■ Stop</button>
                    ) : (
                        <button onClick={handlePlay} className="save-btn" style={{ background: '#98c379', color: '#000' }}>▶ Play Preview</button>
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