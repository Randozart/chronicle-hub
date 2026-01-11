'use client';

import { useState } from 'react';
import { InstrumentDefinition, SynthType } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets';
import { useAudio } from '@/providers/AudioProvider';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { toggleProperty } from '@/utils/propertyHelpers'; // Assuming generic helper exists, or we implement local

interface Props {
    initialData: InstrumentDefinition;
    onSave: (d: InstrumentDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (d: InstrumentDefinition) => void;
    storyId: string;
    guardRef: { current: FormGuard | null };
}

// Helper for strict number sliders
function NumberSlider({ label, val, onChange, min = 0, max = 100, step = 0.01 }: { label: string, val?: number, onChange: (v: number) => void, min?: number, max?: number, step?: number }) {
    return (
        <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase' }}>{label}</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--tool-text-main)', fontFamily: 'monospace' }}>{Number(val || 0).toFixed(2)}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} 
                value={val || 0} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                style={{ width: '100%', accentColor: 'var(--tool-accent)', height: '4px' }}
            />
        </div>
    );
}

export default function InstrumentMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, guardRef }: Props) {
    
    // Determine Endpoint based on Scope (Local vs Global)
    // We infer scope from the ID or passed props usually, but here we assume the passed data has context
    // For this template, we assume all edits here go to the Project Config unless it's explicitly a global asset library
    // Adjust endpoint logic as per your backend structure.
    const isGlobal = (initialData as any).scope === 'global'; 
    const endpoint = isGlobal ? '/api/assets/audio' : '/api/admin/config';
    const extraParams = isGlobal 
        ? { id: initialData.id, type: 'instrument' } 
        : { storyId, category: 'instruments', itemId: initialData.id };

    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved,
        setData 
    } = useCreatorForm<InstrumentDefinition>(
        initialData, 
        endpoint, 
        extraParams, 
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const { playPreviewNote, startPreviewNote, stopPreviewNote } = useAudio();

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

    // --- Helpers ---
    const handleConfigChange = (path: string, val: any) => {
        // Deep clone config to avoid mutation
        const next = JSON.parse(JSON.stringify(form.config || {}));
        const parts = path.split('.');
        let curr: any = next;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!curr[parts[i]]) curr[parts[i]] = {};
            curr = curr[parts[i]];
        }
        curr[parts[parts.length - 1]] = val;
        handleChange('config', next);
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = AUDIO_PRESETS[presetId];
        if (preset) {
            // Merge preset config into current form
            setData(prev => prev ? { ...prev, type: preset.type, config: JSON.parse(JSON.stringify(preset.config)) } : null);
        }
    };

    // --- Audio Preview ---
    const previewOneShot = () => playPreviewNote(form, "C4", "8n");

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    {isGlobal && <span style={{ fontSize: '0.7rem', border: '1px solid var(--success-color)', color: 'var(--success-color)', padding: '2px 6px', borderRadius: '4px' }}>GLOBAL</span>}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={previewOneShot} style={{ background: 'var(--tool-bg-dark)', border: '1px solid var(--tool-accent)', color: 'var(--tool-accent)', borderRadius: '4px', cursor: 'pointer', padding: '0.3rem 0.8rem' }}>▶ Test Note</button>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                
                <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                        <label className="form-label">Name</label>
                        <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Engine Type</label>
                        <select value={form.type} onChange={e => handleChange('type', e.target.value as any)} className="form-select">
                            <option value="synth">Synth</option>
                            <option value="sampler">Sampler</option>
                        </select>
                    </div>
                </div>

                {/* Preset Loader */}
                <div style={{ marginBottom: '1.5rem', background: 'var(--tool-bg-dark)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed var(--tool-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" style={{ color: 'var(--tool-accent)', margin: 0 }}>Load Preset</label>
                        <select onChange={e => handleLoadPreset(e.target.value)} className="form-select" value="" style={{ width: '60%' }}>
                            <option value="" disabled>-- Select to Overwrite --</option>
                            {Object.values(AUDIO_PRESETS).sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    
                    {/* COLUMN 1: CORE & SOURCE */}
                    <div>
                        <h4 style={{ color: 'var(--tool-text-header)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>Source</h4>
                        <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px' }}>
                            
                            {form.type === 'synth' && (
                                <div className="form-group">
                                    <label className="form-label">Oscillator</label>
                                    <select 
                                        value={form.config.oscillator?.type || 'triangle'} 
                                        onChange={e => handleConfigChange('oscillator.type', e.target.value)} 
                                        className="form-select"
                                    >
                                        <option value="triangle">Triangle</option>
                                        <option value="sine">Sine</option>
                                        <option value="square">Square</option>
                                        <option value="sawtooth">Sawtooth</option>
                                        <option value="fmsine">FM Sine</option>
                                        <option value="amsine">AM Sine</option>
                                        <option value="fmsawtooth">FM Sawtooth</option>
                                    </select>
                                </div>
                            )}

                            {form.type === 'sampler' && (
                                <div className="form-group">
                                    <label className="form-label">Base URL</label>
                                    <input 
                                        value={form.config.baseUrl || ''} 
                                        onChange={e => handleConfigChange('baseUrl', e.target.value)} 
                                        className="form-input" 
                                        placeholder="/audio/"
                                    />
                                    {/* Note: Detailed URL mapping editor omitted for brevity, assuming simple one-sample mapping for now */}
                                </div>
                            )}

                            <NumberSlider label="Volume (dB)" val={form.config.volume} onChange={(v: number) => handleConfigChange('volume', v)} min={-60} max={6} step={1} />
                            <NumberSlider label="Octave Shift" val={form.config.octaveOffset} onChange={(v: number) => handleConfigChange('octaveOffset', v)} min={-3} max={3} step={1} />
                            
                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--tool-border)' }}>
                                <label className="form-label">Polyphony</label>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <button 
                                        onClick={() => { handleConfigChange('noteCut', false); handleConfigChange('portamento', 0); }}
                                        style={{ flex: 1, padding: '6px', background: (!form.config.noteCut && !form.config.portamento) ? 'var(--tool-accent)' : 'var(--tool-bg-dark)', color: (!form.config.noteCut && !form.config.portamento) ? 'var(--tool-key-black)' : 'var(--tool-text-dim)', border: '1px solid var(--tool-border)', cursor: 'pointer', borderRadius:'4px' }}
                                    >Poly</button>
                                    <button 
                                        onClick={() => { handleConfigChange('noteCut', true); handleConfigChange('portamento', 0); }}
                                        style={{ flex: 1, padding: '6px', background: form.config.noteCut ? 'var(--danger-color)' : 'var(--tool-bg-dark)', color: form.config.noteCut ? '#fff' : 'var(--tool-text-dim)', border: '1px solid var(--tool-border)', cursor: 'pointer', borderRadius:'4px' }}
                                    >Mono</button>
                                    <button 
                                        onClick={() => { handleConfigChange('noteCut', false); handleConfigChange('portamento', 0.1); }}
                                        style={{ flex: 1, padding: '6px', background: (form.config.portamento || 0) > 0 ? 'var(--success-color)' : 'var(--tool-bg-dark)', color: (form.config.portamento || 0) > 0 ? '#000' : 'var(--tool-text-dim)', border: '1px solid var(--tool-border)', cursor: 'pointer', borderRadius:'4px' }}
                                    >Glide</button>
                                </div>
                            </div>
                        </div>

                        <h4 style={{ color: 'var(--tool-text-header)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>Envelope</h4>
                        <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px' }}>
                            <NumberSlider label="Attack" val={form.config.envelope?.attack} onChange={(v: number) => handleConfigChange('envelope.attack', v)} max={2} />
                            <NumberSlider label="Decay" val={form.config.envelope?.decay} onChange={(v: number) => handleConfigChange('envelope.decay', v)} max={2} />
                            <NumberSlider label="Sustain" val={form.config.envelope?.sustain} onChange={(v: number) => handleConfigChange('envelope.sustain', v)} max={1} />
                            <NumberSlider label="Release" val={form.config.envelope?.release} onChange={(v: number) => handleConfigChange('envelope.release', v)} max={5} />
                        </div>
                    </div>

                    {/* COLUMN 2: FILTERS & EQ */}
                    <div>
                        <h4 style={{ color: 'var(--tool-text-header)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem' }}>Filter</h4>
                        <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px' }}>
                            <div className="form-group">
                                <select 
                                    value={form.config.filter?.type || 'lowpass'} 
                                    onChange={e => handleConfigChange('filter.type', e.target.value)}
                                    className="form-select"
                                >
                                    <option value="lowpass">Low Pass</option>
                                    <option value="highpass">High Pass</option>
                                    <option value="bandpass">Band Pass</option>
                                    <option value="notch">Notch</option>
                                </select>
                            </div>
                            <NumberSlider label="Frequency (Hz)" val={form.config.filter?.frequency ?? 20000} onChange={(v: number) => handleConfigChange('filter.frequency', v)} min={20} max={20000} step={10} />
                            <NumberSlider label="Resonance (Q)" val={form.config.filter?.Q ?? 1} onChange={(v: number) => handleConfigChange('filter.Q', v)} min={0.1} max={10} />
                        </div>

                        <h4 style={{ color: 'var(--tool-text-header)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>Parametric EQ</h4>
                        <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px' }}>
                            <NumberSlider label="Low (dB)" val={form.config.eq?.low} onChange={(v: number) => handleConfigChange('eq.low', v)} min={-20} max={10} step={1} />
                            <NumberSlider label="Mid (dB)" val={form.config.eq?.mid} onChange={(v: number) => handleConfigChange('eq.mid', v)} min={-20} max={10} step={1} />
                            <NumberSlider label="High (dB)" val={form.config.eq?.high} onChange={(v: number) => handleConfigChange('eq.high', v)} min={-20} max={10} step={1} />
                        </div>

                        <h4 style={{ color: 'var(--tool-text-header)', borderBottom: '1px solid var(--tool-border)', paddingBottom: '0.5rem', marginTop: '1.5rem' }}>Vibrato</h4>
                        <div style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px' }}>
                            <NumberSlider label="Depth (Cents)" val={form.config.vibrato?.depth} onChange={(v: number) => handleConfigChange('vibrato.depth', v)} min={0} max={100} step={1} />
                            <NumberSlider label="Rate (Hz)" val={form.config.vibrato?.rate} onChange={(v: number) => handleConfigChange('vibrato.rate', v)} min={0.1} max={10} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Instrument"
            />

            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert to last saved state?"
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}