'use client';

import { useState, useEffect, useRef } from 'react';
import { InstrumentDefinition } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets';
import * as Tone from 'tone';
import { getOrMakeInstrument, AnySoundSource } from '@/engine/audio/synth';
import { useAudio } from '@/providers/AudioProvider';
import { Note } from 'tonal';

// --- Sub-Components ---

// Waveform Visualizer
function WaveformDisplay({ 
    peaks, loopStart, loopEnd, duration 
}: { 
    peaks: number[], loopStart?: number, loopEnd?: number, duration: number 
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(224, 108, 117, 0.7)'; // Muted red for waveform
        
        peaks.forEach((peak, i) => {
            const h = peak * height;
            ctx.beginPath();
            ctx.moveTo(i, height / 2 - h / 2);
            ctx.lineTo(i, height / 2 + h / 2);
            ctx.stroke();
        });

        // Draw Loop points
        if (duration > 0) {
            ctx.lineWidth = 2; // Make lines thicker
            if (loopStart !== undefined) {
                const startX = (loopStart / duration) * width;
                ctx.strokeStyle = '#98c379'; // Green for start
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(startX, height);
                ctx.stroke();
            }
            if (loopEnd !== undefined) {
                const endX = (loopEnd / duration) * width;
                ctx.strokeStyle = '#e06c75'; // Brighter Red for end
                ctx.beginPath();
                ctx.moveTo(endX, 0);
                ctx.lineTo(endX, height);
                ctx.stroke();
            }
        }
    }, [peaks, loopStart, loopEnd, duration]);

    return <canvas ref={canvasRef} width="600" height="150" style={{ width: '100%', height: '150px', background: '#000', borderRadius: '4px' }} />;
}

// Slider Component
interface SliderProps {
    label: string; val?: number; onChange: (val: number) => void;
    min?: number; max?: number; step?: number; disabled?: boolean;
}
function Slider({ label, val, onChange, min = 0, max = 1, step = 0.01, disabled = false }: SliderProps) {
    const displayVal = Number(val || 0).toFixed(3);
    return (
        <div>
            <label className="form-label" style={{ fontSize: '0.8rem', color: disabled ? '#555' : '#aaa', textTransform: 'uppercase' }}>{label} ({displayVal})</label>
            <input 
                type="range" min={min} max={max} step={step} 
                value={val || 0} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                style={{ width: '100%' }}
                disabled={disabled}
            />
        </div>
    );
}

// Main Editor Component
export default function InstrumentEditor({ 
    data, onSave, onClose, onInsertIntoTrack, onDelete
}: { 
    data: InstrumentDefinition, 
    onSave: (d: InstrumentDefinition) => void, 
    onClose?: () => void,
    onDelete?: () => void,
    onInsertIntoTrack?: (id: string, presetId: string) => void
}) {
    const [form, setForm] = useState(data);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const activeSynthRef = useRef<AnySoundSource | null>(null);
    const [sampleDuration, setSampleDuration] = useState(0);
    const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
    const { playPreviewNote, startPreviewNote, stopPreviewNote } = useAudio();

    useEffect(() => setForm(data), [data]);
    useEffect(() => {
        return () => {
            stopPreviewNote();
        };
    }, [stopPreviewNote]);

    const handlePlayNote = (midi: number) => {
    // FIX: Use 'Note' from 'tonal', not 'Tone.Note'
        const noteName = Note.fromMidi(midi); 
        playPreviewNote(form, noteName, '8n');
    };

    useEffect(() => {
        if (form.type === 'sampler' && form.config.urls && Object.values(form.config.urls)[0]) {
            const url = `${form.config.baseUrl}${Object.values(form.config.urls)[0]}`;
            let isActive = true;
            const audioContext = Tone.getContext().rawContext;
            
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                .then(audioBuffer => {
                    if (!isActive) return;
                    setSampleDuration(audioBuffer.duration);

                    const data = audioBuffer.getChannelData(0);
                    const width = 600;
                    const step = Math.ceil(data.length / width);
                    const peaks: number[] = [];
                    for (let i = 0; i < width; i++) {
                        let max = 0;
                        for (let j = i * step; j < (i * step) + step; j++) {
                            if (Math.abs(data[j]) > max) max = Math.abs(data[j]);
                        }
                        peaks.push(max);
                    }
                    setWaveformPeaks(peaks);
                })
                .catch(err => {
                    console.error("Error loading sample data:", err);
                    setSampleDuration(0);
                    setWaveformPeaks([]);
                });
            
            return () => { isActive = false; };
        } else {
            setSampleDuration(0);
            setWaveformPeaks([]);
        }
    }, [form.config.baseUrl, form.config.urls, form.type]);

    const handleChange = (path: string, val: any) => {
        const next = JSON.parse(JSON.stringify(form));
        const keys = path.split('.');
        let curr: any = next;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!curr[keys[i]]) curr[keys[i]] = {}; 
            curr = curr[keys[i]];
        }
        curr[keys[keys.length - 1]] = val;
        setForm(next);
    };

    const groupedPresets = Object.values(AUDIO_PRESETS).reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, InstrumentDefinition[]>);

    const handleLoadPreset = (presetId: string) => {
        const preset = AUDIO_PRESETS[presetId];
        if (preset) {
            setForm(prev => ({
                ...prev,
                config: JSON.parse(JSON.stringify(preset.config)),
                type: preset.type
            }));
        }
    };

    const previewOneShot = () => {
        playPreviewNote(form, "C4", "8n");
    };
    const handlePreviewStart = () => {
        startPreviewNote(form, 'C4');
    };
    const handlePreviewStop = () => {
        stopPreviewNote('C4');
    };

    const handleSaveClick = () => {
        onSave(form);
        if (onClose) onClose();
    };

    const handleInsertClick = () => {
        if (onInsertIntoTrack) {
            const originalPreset = Object.values(AUDIO_PRESETS).find(p => JSON.stringify(p.config) === JSON.stringify(form.config));
            onInsertIntoTrack(form.id, originalPreset ? originalPreset.id : form.id);
            if (onClose) onClose();
        }
    };
    
    const editorContent = (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem', alignItems: 'center' }}>
                <h2 style={{margin: 0}}>Instrument: {form.name}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {onInsertIntoTrack && (
                        <button onClick={handleInsertClick} style={{ background: '#98c379', color: '#000', fontWeight: 'bold', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                           + Insert into Track
                        </button>
                    )}
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
                        <button onClick={previewOneShot} disabled={isPreviewing} style={{ background: '#56B6C2', color: 'black', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold', borderRight: '1px solid rgba(0,0,0,0.2)' }}>
                            ▶ Play Once
                        </button>
                        <button onMouseDown={handlePreviewStart} onMouseUp={handlePreviewStop} onMouseLeave={handlePreviewStop} disabled={isPreviewing} style={{ background: '#56B6C2', color: 'black', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold' }}>
                            Hold to Play
                        </button>
                    </div>
                    <button onClick={handleSaveClick} className="save-btn">
                        {onClose ? 'Save & Close' : 'Save'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} style={{background: 'transparent', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.5rem'}}>&times;</button>
                    )}
                </div>
            </div>
            
            <div style={{ background: '#111', padding: '1rem', borderRadius: '4px', border: '1px dashed #444', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ color: '#98c379' }}>Load Sound Preset</label>
                <select className="form-select" onChange={(e) => handleLoadPreset(e.target.value)} value="">
                    <option value="" disabled>-- Select a Sound --</option>
                    {Object.keys(groupedPresets).sort().map(cat => (
                        <optgroup key={cat} label={cat}>
                            {groupedPresets[cat].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
            </div>

            {form.type === 'sampler' && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label" style={{ color: '#aaa', textTransform: 'uppercase' }}>Sample Waveform</label>
                    <WaveformDisplay 
                        peaks={waveformPeaks}
                        duration={sampleDuration}
                        loopStart={form.config.loop?.start}
                        loopEnd={form.config.loop?.end}
                    />
                </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                    <h3 style={{marginTop: 0}}>Core</h3>
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Slider label="Volume (dB)" val={form.config.volume} onChange={(v) => handleChange('config.volume', v)} min={-60} max={6} step={1} />
                        <Slider label="Octave Offset" val={form.config.octaveOffset} onChange={(v) => handleChange('config.octaveOffset', v)} min={-3} max={3} step={1} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.config.noteCut || false} onChange={e => handleChange('config.noteCut', e.target.checked)} />
                            Enable Note Cut (Monophonic)
                        </label>
                    </div>
                    <h3 style={{ marginTop: '1.5rem' }}>Envelope (ADSR)</h3>
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Slider label="Attack" val={form.config.envelope?.attack} onChange={(v) => handleChange('config.envelope.attack', v)} max={2} />
                        <Slider label="Decay" val={form.config.envelope?.decay} onChange={(v) => handleChange('config.envelope.decay', v)} max={2} />
                        <Slider label="Sustain" val={form.config.envelope?.sustain} onChange={(v) => handleChange('config.envelope.sustain', v)} max={1} />
                        <Slider label="Release" val={form.config.envelope?.release} onChange={(v) => handleChange('config.envelope.release', v)} max={5} />
                    </div>
                </div>
                <div>
                    <h3 style={{ marginTop: 0 }}>Effects</h3>
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.config.loop?.enabled || false} onChange={e => handleChange('config.loop.enabled', e.target.checked)} />
                            Loop Enabled
                        </label>
                        <div style={{ opacity: form.config.loop?.enabled ? 1 : 0.5, display: 'grid', gap: '1rem' }}>
                            <div>
                                <label className="form-label" style={{ fontSize: '0.8rem', color: '#aaa' }}>Loop Type</label>
                                <select 
                                    value={form.config.loop?.type || 'forward'} 
                                    onChange={e => handleChange('config.loop.type', e.target.value)} 
                                    style={{width: '100%', background: '#111', border: '1px solid #444', color: '#ccc', padding: '6px', borderRadius: '4px'}}
                                    disabled={!form.config.loop?.enabled}
                                >
                                    <option value="forward">Forward (Standard)</option>
                                    <option value="pingpong">Ping-Pong (Bidi)</option>
                                </select>
                            </div>
                            <Slider label="Loop Start (s)" val={form.config.loop?.start} onChange={(v) => handleChange('config.loop.start', v)} max={sampleDuration || 1} disabled={!form.config.loop?.enabled || sampleDuration === 0} />
                            <Slider label="Loop End (s)" val={form.config.loop?.end} onChange={(v) => handleChange('config.loop.end', v)} max={sampleDuration || 1} disabled={!form.config.loop?.enabled || sampleDuration === 0} />
                            <Slider label="Crossfade (s)" val={form.config.loop?.crossfade} onChange={(v) => handleChange('config.loop.crossfade', v)} max={0.1} disabled={!form.config.loop?.enabled} />
                        </div>
                    </div>
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.config.panning?.enabled || false} onChange={e => handleChange('config.panning.enabled', e.target.checked)} />
                            Auto-Pan Enabled
                        </label>
                        <div style={{ opacity: form.config.panning?.enabled ? 1 : 0.5, marginTop: '1rem', display: 'grid', gap: '1rem' }}>
                            <Slider label="Pan Frequency (Hz)" val={form.config.panning?.frequency} onChange={(v) => handleChange('config.panning.frequency', v)} min={0.1} max={10} />
                            <Slider label="Pan Depth" val={form.config.panning?.depth} onChange={(v) => handleChange('config.panning.depth', v)} max={1} />
                        </div>
                    </div>
                </div>
            </div>
            {onDelete && (<button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', marginTop: '2rem' }}>Delete Instrument</button>)}
        </div>
    );

    if (onClose) {
        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
                <div style={{ background: '#181a1f', padding: '2rem', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
                    {editorContent}
                </div>
            </div>
        );
    }
    return editorContent;
}