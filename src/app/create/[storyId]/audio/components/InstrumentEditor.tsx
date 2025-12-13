'use client';
import { useState, useEffect } from 'react';
import { InstrumentDefinition } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets'; // <--- IMPORT PRESETS
import * as Tone from 'tone';
import { getOrMakeInstrument } from '@/engine/audio/synth';

export default function InstrumentEditor({ data, onSave, onDelete }: { data: InstrumentDefinition, onSave: (d: any) => void, onDelete: () => void }) {
    const [form, setForm] = useState(data);

    // Update form when data changes
    useEffect(() => setForm(data), [data]);

    const handleChange = (path: string, val: any) => {
        const next = { ...form };
        const keys = path.split('.');
        let curr: any = next;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!curr[keys[i]]) curr[keys[i]] = {}; 
            curr = curr[keys[i]];
        }
        curr[keys[keys.length - 1]] = val;
        setForm(next);
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = AUDIO_PRESETS[presetId];
        if (preset) {
            setForm(prev => ({
                ...prev,
                // Keep the current ID and Name, just overwrite the sound engine
                config: JSON.parse(JSON.stringify(preset.config))
            }));
        }
    };

    const previewNote = async () => {
        await Tone.start();
        const synth = getOrMakeInstrument(form);
        
        const env = form.config.envelope || { attack:0.1, decay:0.1, sustain:0.5, release:1 };
        
        synth.set({
            oscillator: { type: form.config.oscillator?.type as any },
            envelope: env,
            volume: form.config.volume
        });
        
        synth.triggerAttackRelease("C4", "8n");
    };

    return (
        <div>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                <h2>Instrument: {form.name}</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                     <button onClick={previewNote} style={{ background: 'var(--accent-highlight)', color: 'black', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ▶ Test Tone
                    </button>
                    <button onClick={() => onSave(form)} className="save-btn">Save</button>
                </div>
            </div>

            {/* --- NEW: PRESET LOADER --- */}
            <div className="form-group" style={{ background: '#111', padding: '1rem', borderRadius: '4px', border: '1px dashed #444', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ color: '#98c379' }}>Load Preset (Overwrites Settings)</label>
                <select 
                    className="form-select" 
                    onChange={(e) => handleLoadPreset(e.target.value)}
                    value="" // Always reset to empty after selection
                >
                    <option value="" disabled>-- Select a Sound --</option>
                    {Object.values(AUDIO_PRESETS).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            {/* -------------------------- */}

            <div className="form-group">
                <label className="form-label">Oscillator Type</label>
                <select 
                    className="form-select"
                    value={form.config.oscillator?.type || 'triangle'}
                    onChange={e => handleChange('config.oscillator.type', e.target.value)}
                >
                    <option value="triangle">Triangle (Flute-like)</option>
                    <option value="sine">Sine (Pure/Sub)</option>
                    <option value="square">Square (Retro/Gameboy)</option>
                    <option value="sawtooth">Sawtooth (Brass/String)</option>
                    <option value="fmsquare">FM Square (Metallic)</option>
                    <option value="fmsawtooth">FM Saw (Aggressive)</option>
                    <option value="fmsine">FM Sine (Glassy)</option>
                    <option value="amsine">AM Sine (Sci-Fi)</option>
                </select>
            </div>

            <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                <label className="special-label" style={{ color: '#61afef' }}>Envelope (ADSR)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                    <Slider label="Attack" val={form.config.envelope?.attack} onChange={(v: number) => handleChange('config.envelope.attack', v)} max={2} />
                    <Slider label="Decay" val={form.config.envelope?.decay} onChange={(v: number) => handleChange('config.envelope.decay', v)} max={2} />
                    <Slider label="Sustain" val={form.config.envelope?.sustain} onChange={(v: number) => handleChange('config.envelope.sustain', v)} max={1} />
                    <Slider label="Release" val={form.config.envelope?.release} onChange={(v: number) => handleChange('config.envelope.release', v)} max={5} />
                </div>
            </div>
            
            <div className="form-group">
                 <Slider label="Volume (dB)" val={form.config.volume} onChange={(v: number) => handleChange('config.volume', v)} min={-60} max={0} step={1} />
            </div>

            <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', marginTop: '2rem' }}>Delete Instrument</button>
        </div>
    );
}

interface SliderProps {
    label: string;
    val?: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

function Slider({ label, val, onChange, min=0, max=1, step=0.01 }: SliderProps) {
    return (
        <div>
            <label className="form-label">{label} ({Number(val || 0).toFixed(2)})</label>
            <input 
                type="range" min={min} max={max} step={step} 
                value={val || 0} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                style={{ width: '100%' }}
            />
        </div>
    );
}