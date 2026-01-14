'use client';

import { useState, useEffect, useRef } from 'react';
import { InstrumentDefinition, EmbellishmentDef } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets';
import * as Tone from 'tone';
import { useAudio } from '@/providers/AudioProvider';

// --- SUBCOMPONENTS ---

function WaveformDisplay({ url, loopStart, loopEnd }: { url: string | null, loopStart?: number, loopEnd?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [peaks, setPeaks] = useState<number[]>([]);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!url) return;
        let active = true;
        const fetchWav = async () => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const ctx = new window.AudioContext(); 
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                
                if (!active) return;
                setDuration(audioBuffer.duration);
                
                const data = audioBuffer.getChannelData(0);
                const width = 600;
                const step = Math.ceil(data.length / width);
                const newPeaks: number[] = [];
                
                for (let i = 0; i < width; i++) {
                    let max = 0;
                    for (let j = 0; j < step; j++) {
                        const val = Math.abs(data[(i * step) + j] || 0);
                        if (val > max) max = val;
                    }
                    newPeaks.push(max);
                }
                setPeaks(newPeaks);
            } catch(e) { console.error("Waveform load error", e); }
        };
        fetchWav();
        return () => { active = false; };
    }, [url]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const w = canvas.width; 
        const h = canvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#111'; 
        ctx.fillRect(0, 0, w, h);
        
        if(peaks.length === 0) {
            ctx.fillStyle = '#333'; 
            ctx.fillText("No Audio", 10, 20); 
            return;
        }
        
        ctx.strokeStyle = '#61afef'; 
        ctx.lineWidth = 1; 
        ctx.beginPath();
        
        for (let i = 0; i < peaks.length; i++) {
            const x = (i / peaks.length) * w;
            const y = peaks[i] * (h / 2);
            ctx.moveTo(x, (h / 2) - y); 
            ctx.lineTo(x, (h / 2) + y);
        }
        ctx.stroke();

        if (duration > 0) {
            ctx.lineWidth = 2;
            if (loopStart !== undefined) {
                 const x = (loopStart / duration) * w;
                 ctx.strokeStyle = '#98c379'; 
                 ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            if (loopEnd !== undefined && loopEnd > 0) {
                 const x = (loopEnd / duration) * w;
                 ctx.strokeStyle = '#e06c75'; 
                 ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
        }
    }, [peaks, loopStart, loopEnd, duration]);

    return <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100px', borderRadius: '4px', border:'1px solid #333' }} />;
}

// Enhanced Slider with Tooltips
function Slider({ label, val, onChange, min = 0, max = 1, step = 0.01, disabled = false, tooltip }: any) {
    const [showTip, setShowTip] = useState(false);

    return (
        <div style={{ marginBottom: '0.75rem', opacity: disabled ? 0.5 : 1, position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', alignItems: 'center' }}>
                <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }}
                    onMouseEnter={() => setShowTip(true)}
                    onMouseLeave={() => setShowTip(false)}
                >
                    <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', cursor: 'help' }}>{label}</label>
                    {tooltip && (
                        <div style={{ 
                            width: '12px', height: '12px', borderRadius: '50%', background: '#333', color: '#888', 
                            fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                        }}>?</div>
                    )}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#ccc', fontFamily: 'monospace' }}>{Number(val || 0).toFixed(2)}</span>
            </div>
            
            {showTip && tooltip && (
                <div style={{ 
                    position: 'absolute', bottom: '100%', left: 0, width: '220px', 
                    background: '#2c313a', border: '1px solid #61afef', borderRadius: '4px', 
                    padding: '8px', zIndex: 50, boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    color: '#e0e0e0', fontSize: '0.75rem', lineHeight: '1.4', pointerEvents: 'none'
                }}>
                    <div style={{fontWeight:'bold', color:'#61afef', marginBottom:'4px'}}>{tooltip.title}</div>
                    <div style={{marginBottom:'4px'}}>{tooltip.desc}</div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'#aaa', borderTop:'1px solid #444', paddingTop:'4px'}}>
                        <span>L: {tooltip.min}</span>
                        <span>R: {tooltip.max}</span>
                    </div>
                </div>
            )}

            <input 
                type="range" min={min} max={max} step={step} 
                value={val || 0} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                style={{ width: '100%', accentColor: '#61afef', height: '4px', cursor: 'pointer' }}
                disabled={disabled}
            />
        </div>
    );
}

// --- MAIN COMPONENT ---

export default function InstrumentEditor({ 
    data, onChange, onInsertIntoTrack 
}: { 
    data: InstrumentDefinition, 
    onChange: (d: InstrumentDefinition) => void,
    onInsertIntoTrack?: (id: string, presetId: string) => void
}) {
    const { playPreviewNote, startPreviewNote, stopPreviewNote } = useAudio();

    // Helper: Deep Update
    const handleChange = (path: string, val: any) => {
        const next = JSON.parse(JSON.stringify(data)); 
        const keys = path.split('.');
        let curr: any = next;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!curr[keys[i]]) curr[keys[i]] = {}; 
            curr = curr[keys[i]];
        }
        curr[keys[keys.length - 1]] = val;
        onChange(next); 
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = AUDIO_PRESETS[presetId];
        if (preset) {
            onChange({
                ...data,
                type: preset.type,
                config: JSON.parse(JSON.stringify(preset.config))
            });
        }
    };

    // VOICING MODE LOGIC
    const togglePolyMode = (mode: string) => {
        if (mode === 'poly') {
            handleChange('config.noteCut', false);
            handleChange('config.portamento', 0);
        } else if (mode === 'mono_cut') {
            handleChange('config.noteCut', true);
            handleChange('config.portamento', 0);
        } else if (mode === 'mono_glide') {
            handleChange('config.noteCut', false);
            handleChange('config.portamento', 0.1); 
        }
    };

    // EMBELLISHMENT LOGIC
    const addEmbellishment = () => {
        const currentList = data.config.embellishments || [];
        handleChange('config.embellishments', [...currentList, { url: '', probability: 0.1, volume: 0 }]);
    };

    const updateEmbellishment = (index: number, field: keyof EmbellishmentDef, val: any) => {
        const list = [...(data.config.embellishments || [])];
        if (list[index]) {
            list[index] = { ...list[index], [field]: val };
            handleChange('config.embellishments', list);
        }
    };

    const removeEmbellishment = (index: number) => {
        const list = [...(data.config.embellishments || [])];
        list.splice(index, 1);
        handleChange('config.embellishments', list);
    };

    // Playback
    const previewOneShot = () => playPreviewNote(data, "C4", "8n");
    const handleHoldStart = () => startPreviewNote(data, 'C4');
    const handleHoldStop = () => stopPreviewNote('C4');

    const getSampleUrl = () => {
        if (data.type !== 'sampler' || !data.config.urls) return null;
        const key = Object.keys(data.config.urls)[0];
        return key ? (data.config.baseUrl || "") + data.config.urls[key] : null;
    };

    // Derived values
    const c = data.config as any; 
    const isSampler = data.type === 'sampler';
    
    const portamentoVal = c.portamento ?? 0;
    const noteCutVal = !!c.noteCut;
    let currentMode = 'poly';
    if (noteCutVal) currentMode = 'mono_cut';
    else if (portamentoVal > 0) currentMode = 'mono_glide'; 

    // Group Presets
    const groupedPresets = Object.values(AUDIO_PRESETS).reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, InstrumentDefinition[]>);

    return (
        <div>
            {/* Toolbar Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem', alignItems: 'center' }}>
                <h2 style={{margin: 0, color:'#fff'}}>{data.name}</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', border: '1px solid #61afef' }}>
                        <button onClick={previewOneShot} style={{ background: '#21252b', color: '#61afef', border: 'none', padding: '0.4rem 1rem', cursor: 'pointer', borderRight:'1px solid #333' }}>
                            ▶ Tap
                        </button>
                        <button 
                            onMouseDown={handleHoldStart} onMouseUp={handleHoldStop} onMouseLeave={handleHoldStop}
                            style={{ background: '#21252b', color: '#61afef', border: 'none', padding: '0.4rem 1rem', cursor: 'pointer' }}
                        >
                            Hold
                        </button>
                    </div>
                    {onInsertIntoTrack && (
                         <button onClick={() => onInsertIntoTrack(data.id, data.id)} style={{ background: '#98c379', color: '#000', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' }}>
                            + Insert
                        </button>
                    )}
                </div>
            </div>

            {/* Core Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                
                {/* COLUMN 1: CORE, SOURCE & LOOP */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 1.1 Name & Preset */}
                    <div>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input className="form-input" value={data.name} onChange={e => handleChange('name', e.target.value)} />
                        </div>
                        <div style={{ marginTop: '1rem', background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                            <label className="form-label" style={{color: '#61afef'}}>Load Preset</label>
                            <select className="form-select" onChange={e => handleLoadPreset(e.target.value)} value="">
                                <option value="" disabled>-- Overwrite Settings --</option>
                                {Object.keys(groupedPresets).sort().map(cat => (
                                    <optgroup key={cat} label={cat}>
                                        {groupedPresets[cat].map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 1.2 Source & Volume */}
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Source</h4>
                        
                        <div className="form-group">
                            <label className="form-label">Engine</label>
                            <select className="form-select" value={data.type} onChange={e => handleChange('type', e.target.value)}>
                                <option value="synth">Synth</option>
                                <option value="sampler">Sampler</option>
                            </select>
                        </div>
                        
                        {isSampler ? (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Base URL</label>
                                    <input className="form-input" value={c.baseUrl || ''} onChange={e => handleChange('config.baseUrl', e.target.value)} />
                                </div>
                                <WaveformDisplay url={getSampleUrl()} loopStart={c.loop?.start} loopEnd={c.loop?.end} />
                            </>
                        ) : (
                            <div className="form-group">
                                <label className="form-label">Oscillator</label>
                                <select className="form-select" value={c.oscillator?.type || 'triangle'} onChange={e => handleChange('config.oscillator.type', e.target.value)}>
                                    <option value="triangle">Triangle</option>
                                    <option value="sine">Sine</option>
                                    <option value="square">Square</option>
                                    <option value="sawtooth">Sawtooth</option>
                                    <option value="fmsine">FM Sine</option>
                                </select>
                            </div>
                        )}

                        <div style={{ marginTop: '1rem' }}>
                            <Slider 
                                label="Volume" 
                                val={c.volume} onChange={(v:number) => handleChange('config.volume', v)} min={-60} max={6} step={1} 
                                tooltip={{ title: "Output Gain", desc: "Controls the final loudness of the instrument.", min: "Silent (-60dB)", max: "Boost (+6dB)" }}
                            />
                            <Slider 
                                label="Octave Offset" 
                                val={c.octaveOffset} onChange={(v:number) => handleChange('config.octaveOffset', v)} min={-3} max={3} step={1} 
                                tooltip={{ title: "Pitch Shift", desc: "Transposes the entire instrument by octaves.", min: "-3 Octaves (Deep)", max: "+3 Octaves (High)" }}
                            />
                        </div>

                        {/* VOICING MODE TOGGLES */}
                        <div style={{ marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#888', fontWeight: 'bold' }}>VOICING MODE</label>
                            
                            <div style={{ display: 'flex', gap: '4px', background: '#111', padding: '2px', borderRadius: '4px', marginTop:'4px' }}>
                                <button 
                                    onClick={() => togglePolyMode('poly')}
                                    style={{
                                        flex: 1, border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '2px',
                                        background: currentMode === 'poly' ? '#61afef' : 'transparent',
                                        color: currentMode === 'poly' ? '#000' : '#888',
                                        fontWeight: 'bold', fontSize: '0.7rem'
                                    }}
                                    title="Play multiple notes at once."
                                >
                                    Poly
                                </button>
                                <button 
                                    onClick={() => togglePolyMode('mono_cut')}
                                    style={{
                                        flex: 1, border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '2px',
                                        background: currentMode === 'mono_cut' ? '#e06c75' : 'transparent',
                                        color: currentMode === 'mono_cut' ? '#000' : '#888',
                                        fontWeight: 'bold', fontSize: '0.7rem'
                                    }}
                                    title="One note at a time. Hard cut."
                                >
                                    Mono (Cut)
                                </button>
                                <button 
                                    onClick={() => togglePolyMode('mono_glide')}
                                    style={{
                                        flex: 1, border: 'none', padding: '6px', cursor: 'pointer', borderRadius: '2px',
                                        background: currentMode === 'mono_glide' ? '#98c379' : 'transparent',
                                        color: currentMode === 'mono_glide' ? '#000' : '#888',
                                        fontWeight: 'bold', fontSize: '0.7rem'
                                    }}
                                    title="One note at a time. Pitch slide."
                                >
                                    Glide
                                </button>
                            </div>
                            
                            {currentMode === 'mono_cut' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <Slider 
                                        label="Cut Bleed (s)" 
                                        val={c.noteCutBleed ?? 0.05} onChange={(v:number) => handleChange('config.noteCutBleed', v)} max={0.5} step={0.01} 
                                        tooltip={{ title: "Cut Smoothness", desc: "How fast the previous note fades when interrupted.", min: "Instant Click", max: "Smooth Fade" }}
                                    />
                                </div>
                            )}

                            {currentMode === 'mono_glide' && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <Slider 
                                        label="Glide Time (s)" 
                                        val={c.portamento ?? 0.1} onChange={(v:number) => handleChange('config.portamento', v)} max={1} step={0.01} 
                                        tooltip={{ title: "Portamento Speed", desc: "Time taken to slide pitch between overlapping notes.", min: "Instant", max: "Slow Slide" }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 1.3 Loop */}
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <div style={{ marginTop: '0', display: 'flex', alignItems: 'center', justifyContent:'space-between' }}>
                            <label className="form-label" style={{marginTop:0}}>Looping</label>
                            <label style={{ fontSize: '0.8rem', color: '#ccc', display: 'flex', alignItems:'center', gap:'5px', cursor:'pointer' }}>
                                <input type="checkbox" checked={c.loop?.enabled || false} onChange={e => handleChange('config.loop.enabled', e.target.checked)} />
                                Enabled
                            </label>
                        </div>
                        {c.loop?.enabled && (
                            <div style={{ marginTop: '1rem' }}>
                                <div style={{marginBottom:'0.5rem'}}>
                                    <label className="form-label" style={{fontSize:'0.7rem'}}>Type</label>
                                    <select 
                                        value={c.loop?.type || 'forward'} 
                                        onChange={e => handleChange('config.loop.type', e.target.value)}
                                        style={{width:'100%', background:'#333', color:'#fff', border:'none', padding:'4px', borderRadius:'4px'}}
                                    >
                                        <option value="forward">Forward (Repeat)</option>
                                        <option value="pingpong">Ping-Pong (Back & Forth)</option>
                                    </select>
                                </div>
                                <Slider 
                                    label="Start (s)" 
                                    val={c.loop?.start} onChange={(v:number) => handleChange('config.loop.start', v)} max={10} 
                                    tooltip={{ title: "Loop Start", desc: "Time where the loop begins.", min: "0s", max: "10s" }}
                                />
                                <Slider 
                                    label="End (s)" 
                                    val={c.loop?.end} onChange={(v:number) => handleChange('config.loop.end', v)} max={10} 
                                    tooltip={{ title: "Loop End", desc: "Time where the loop wraps back.", min: "0s", max: "10s" }}
                                />
                                <Slider 
                                    label="X-Fade (s)" 
                                    val={c.loop?.crossfade} onChange={(v:number) => handleChange('config.loop.crossfade', v)} max={0.1} 
                                    tooltip={{ title: "Crossfade", desc: "Smooths out clicks at the loop point by blending.", min: "Hard Cut", max: "Smooth Blend" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* 1.4 EMBELLISHMENTS (Moved here) */}
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <h4 style={{marginTop:0, color:'#e5c07b', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Embellishments</h4>
                        <p style={{fontSize: '0.7rem', color: '#888', marginBottom: '1rem'}}>
                            Extra sounds (like fret noise or breath) that trigger randomly alongside notes.
                        </p>
                        {c.embellishments?.map((emb: EmbellishmentDef, i: number) => (
                            <div key={i} style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '0.7rem', color: '#888'}}>Layer {i+1}</label>
                                    <button onClick={() => removeEmbellishment(i)} style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                                </div>
                                <input 
                                    value={emb.url} 
                                    onChange={e => updateEmbellishment(i, 'url', e.target.value)}
                                    style={{ width: '100%', background: '#111', border: '1px solid #444', color: '#ccc', fontSize: '0.8rem', marginBottom: '8px', padding:'4px', borderRadius:'3px' }}
                                    placeholder="/sounds/noise.mp3"
                                />
                                <Slider 
                                    label="Chance" 
                                    val={emb.probability} onChange={(v: number) => updateEmbellishment(i, 'probability', v)} max={1} 
                                    tooltip={{ title: "Probability", desc: "Likelihood this layer plays with a note.", min: "Never (0%)", max: "Always (100%)" }}
                                />
                                <Slider 
                                    label="Vol (dB)" 
                                    val={emb.volume} onChange={(v: number) => updateEmbellishment(i, 'volume', v)} min={-40} max={0} step={1} 
                                    tooltip={{ title: "Layer Volume", desc: "Mix volume relative to the main instrument.", min: "Quiet", max: "Full Volume" }}
                                />
                            </div>
                        ))}
                        <button onClick={addEmbellishment} style={{ width: '100%', background: '#333', border: '1px dashed #555', color: '#ccc', padding: '6px', cursor: 'pointer', fontSize: '0.8rem', borderRadius: '4px' }}>
                            + Add Layer
                        </button>
                    </div>
                </div>

                {/* COLUMN 2: ENVELOPE, TONE & FX */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                     <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Envelope (ADSR)</h4>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                            <Slider 
                                label="Attack" 
                                val={c.envelope?.attack} onChange={(v:number) => handleChange('config.envelope.attack', v)} max={2} 
                                tooltip={{ title: "Attack Time", desc: "How quickly the sound reaches full volume.", min: "Instant (Punchy)", max: "Slow (Pad/Swell)" }}
                            />
                            <Slider 
                                label="Decay" 
                                val={c.envelope?.decay} onChange={(v:number) => handleChange('config.envelope.decay', v)} max={2} 
                                tooltip={{ title: "Decay Time", desc: "Time to drop from peak to Sustain level.", min: "Fast Drop", max: "Slow Drop" }}
                            />
                            <Slider 
                                label="Sustain" 
                                val={c.envelope?.sustain} onChange={(v:number) => handleChange('config.envelope.sustain', v)} max={1} 
                                tooltip={{ title: "Sustain Level", desc: "Volume level while holding the note.", min: "Silent", max: "Full Volume" }}
                            />
                            <Slider 
                                label="Release" 
                                val={c.envelope?.release} onChange={(v:number) => handleChange('config.envelope.release', v)} max={5} 
                                tooltip={{ title: "Release Time", desc: "Fade out time after releasing the key.", min: "Abrupt Stop", max: "Long Tail" }}
                            />
                        </div>
                    </div>

                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Tone & Filter</h4>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                            <label style={{fontWeight:'bold', color: '#aaa', fontSize:'0.8rem'}}>Filter Type</label>
                            <select 
                                value={c.filter?.type || 'lowpass'} 
                                onChange={e => handleChange('config.filter.type', e.target.value)}
                                style={{background:'#111', color:'#ccc', border:'none', fontSize:'0.8rem', padding:'2px', borderRadius:'2px'}}
                            >
                                <option value="lowpass">Low Pass (Muffle)</option>
                                <option value="highpass">High Pass (Thin)</option>
                                <option value="bandpass">Band Pass (Focus)</option>
                            </select>
                        </div>
                        <Slider 
                            label="Filter Freq" 
                            val={c.filter?.frequency || 20000} onChange={(v:number) => handleChange('config.filter.frequency', v)} min={20} max={20000} step={100} 
                            tooltip={{ title: "Cutoff Frequency", desc: "The point where the filter starts working.", min: "Closed (Dark)", max: "Open (Bright)" }}
                        />
                        <Slider 
                            label="Resonance" 
                            val={c.filter?.Q || 1} onChange={(v:number) => handleChange('config.filter.Q', v)} min={0.1} max={10} 
                            tooltip={{ title: "Resonance (Q)", desc: "Boosts frequencies at the cutoff point.", min: "Flat", max: "Sharp/Whistling" }}
                        />
                        
                        <div style={{marginTop:'1rem', borderTop:'1px dashed #444', paddingTop:'0.5rem'}}>
                            <label style={{fontWeight:'bold', color: '#aaa', fontSize:'0.8rem', marginBottom:'0.5rem', display:'block'}}>EQ</label>
                            <Slider 
                                label="Low (dB)" 
                                val={c.eq?.low ?? 0} onChange={(v: number) => handleChange('config.eq.low', v)} min={-20} max={10} step={1} 
                                tooltip={{ title: "Low Shelf", desc: "Bass frequencies.", min: "Cut Bass", max: "Boost Bass" }}
                            />
                            <Slider 
                                label="Mid (dB)" 
                                val={c.eq?.mid ?? 0} onChange={(v: number) => handleChange('config.eq.mid', v)} min={-20} max={10} step={1} 
                                tooltip={{ title: "Mid Peaking", desc: "Body and vocals.", min: "Scoop Mids", max: "Push Mids" }}
                            />
                            <Slider 
                                label="High (dB)" 
                                val={c.eq?.high ?? 0} onChange={(v: number) => handleChange('config.eq.high', v)} min={-20} max={10} step={1} 
                                tooltip={{ title: "High Shelf", desc: "Treble and air.", min: "Dark", max: "Bright" }}
                            />
                        </div>
                    </div>

                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Effects</h4>
                        <Slider 
                            label="Reverb" 
                            val={c.reverb} onChange={(v:number) => handleChange('config.reverb', v)} max={100} step={1} 
                            tooltip={{ title: "Reverb Mix", desc: "Room ambience.", min: "Dry (None)", max: "Wet (Cave)" }}
                        />
                        <Slider 
                            label="Delay" 
                            val={c.delay} onChange={(v:number) => handleChange('config.delay', v)} max={100} step={1} 
                            tooltip={{ title: "Delay Mix", desc: "Echo effect.", min: "Dry", max: "Wet" }}
                        />
                        <Slider 
                            label="Distortion" 
                            val={c.distortion} onChange={(v:number) => handleChange('config.distortion', v)} max={100} step={1} 
                            tooltip={{ title: "Distortion Amount", desc: "Grits up the sound.", min: "Clean", max: "Crunchy/Destroyed" }}
                        />
                        <Slider 
                            label="BitCrusher" 
                            val={c.bitcrush} onChange={(v:number) => handleChange('config.bitcrush', v)} max={100} step={1} 
                            tooltip={{ title: "BitCrusher Mix", desc: "Lo-fi digital noise.", min: "Clean", max: "8-bit" }}
                        />
                    </div>
                    
                    {/* MODULATORS Section */}
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                         <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Modulation</h4>
                         
                         <label style={{fontSize:'0.75rem', color:'#888', display:'block', marginBottom:'5px', fontWeight:'bold'}}>VIBRATO</label>
                         <Slider 
                            label="Depth" 
                            val={c.vibrato?.depth} onChange={(v:number) => handleChange('config.vibrato.depth', v)} max={100} step={1} 
                            tooltip={{ title: "Vibrato Depth", desc: "How much the pitch wobbles.", min: "None", max: "Wide Wobble" }}
                         />
                         <Slider 
                            label="Rate" 
                            val={c.vibrato?.rate} onChange={(v:number) => handleChange('config.vibrato.rate', v)} max={10} step={0.1} 
                            tooltip={{ title: "Vibrato Speed", desc: "Speed of the pitch wobble.", min: "Slow", max: "Fast Flutter" }}
                         />
                         
                         <div style={{marginTop:'1rem', borderTop:'1px dashed #444', paddingTop:'1rem'}}>
                             <label style={{fontSize:'0.75rem', color:'#888', display:'block', marginBottom:'5px', fontWeight:'bold'}}>AUTO-PAN</label>
                             <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                 <label style={{fontSize:'0.8rem', color:'#ccc', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                                     <input type="checkbox" checked={c.panning?.enabled || false} onChange={e => handleChange('config.panning.enabled', e.target.checked)} /> Enable
                                 </label>
                             </div>
                             {c.panning?.enabled && (
                                 <>
                                     <Slider 
                                        label="Frequency" 
                                        val={c.panning?.frequency} onChange={(v:number) => handleChange('config.panning.frequency', v)} max={10} 
                                        tooltip={{ title: "Pan Speed", desc: "How fast sound moves L-R.", min: "Slow Drift", max: "Fast Spin" }}
                                     />
                                     <Slider 
                                        label="Depth" 
                                        val={c.panning?.depth} onChange={(v:number) => handleChange('config.panning.depth', v)} max={1} 
                                        tooltip={{ title: "Pan Width", desc: "How far to the sides it goes.", min: "Center", max: "Hard L/R" }}
                                     />
                                 </>
                             )}
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
}