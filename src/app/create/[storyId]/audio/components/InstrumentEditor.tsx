'use client';

import { useState, useEffect, useRef } from 'react';
import { InstrumentDefinition, LFODef } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets';
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
        const w = canvas.width; const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
        
        if(peaks.length === 0) {
            ctx.fillStyle = '#333'; ctx.fillText("No Audio", 10, 20); return;
        }
        
        ctx.strokeStyle = '#61afef'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < peaks.length; i++) {
            const x = (i / peaks.length) * w;
            const y = peaks[i] * (h / 2);
            ctx.moveTo(x, (h / 2) - y); ctx.lineTo(x, (h / 2) + y);
        }
        ctx.stroke();

        if (duration > 0 && loopStart !== undefined) {
             const x = (loopStart / duration) * w;
             ctx.strokeStyle = '#98c379'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        if (duration > 0 && loopEnd !== undefined && loopEnd > 0) {
             const x = (loopEnd / duration) * w;
             ctx.strokeStyle = '#e06c75'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
    }, [peaks, loopStart, loopEnd, duration]);

    return <canvas ref={canvasRef} width={600} height={100} style={{ width: '100%', height: '100px', borderRadius: '4px', border:'1px solid #333' }} />;
}

function Slider({ label, val, onChange, min = 0, max = 1, step = 0.01 }: any) {
    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <label style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' }}>{label}</label>
                <span style={{ fontSize: '0.75rem', color: '#ccc', fontFamily: 'monospace' }}>{Number(val || 0).toFixed(2)}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step} 
                value={val || 0} 
                onChange={e => onChange(parseFloat(e.target.value))} 
                style={{ width: '100%', accentColor: '#61afef' }}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* COLUMN 1 */}
                <div>
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input className="form-input" value={data.name} onChange={e => handleChange('name', e.target.value)} />
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem', background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
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

                        <Slider label="Volume" val={c.volume} onChange={(v:number) => handleChange('config.volume', v)} min={-60} max={6} step={1} />
                        
                        <div style={{ marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                            <label className="form-label">Loop</label>
                            <div style={{display:'flex', gap:'10px', alignItems:'center', marginBottom:'10px'}}>
                                <input type="checkbox" checked={c.loop?.enabled || false} onChange={e => handleChange('config.loop.enabled', e.target.checked)} />
                                <span style={{fontSize:'0.8rem', color:'#ccc'}}>Enabled</span>
                            </div>
                            {c.loop?.enabled && (
                                <>
                                    <Slider label="Start" val={c.loop?.start} onChange={(v:number) => handleChange('config.loop.start', v)} max={10} />
                                    <Slider label="End" val={c.loop?.end} onChange={(v:number) => handleChange('config.loop.end', v)} max={10} />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2 */}
                <div>
                     <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Envelope</h4>
                        <Slider label="Attack" val={c.envelope?.attack} onChange={(v:number) => handleChange('config.envelope.attack', v)} max={2} />
                        <Slider label="Decay" val={c.envelope?.decay} onChange={(v:number) => handleChange('config.envelope.decay', v)} max={2} />
                        <Slider label="Sustain" val={c.envelope?.sustain} onChange={(v:number) => handleChange('config.envelope.sustain', v)} max={1} />
                        <Slider label="Release" val={c.envelope?.release} onChange={(v:number) => handleChange('config.envelope.release', v)} max={5} />
                    </div>

                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                        <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Effects</h4>
                        <Slider label="Filter Freq" val={c.filter?.frequency || 20000} onChange={(v:number) => handleChange('config.filter.frequency', v)} min={20} max={20000} step={100} />
                        <Slider label="Resonance" val={c.filter?.Q || 1} onChange={(v:number) => handleChange('config.filter.Q', v)} min={0.1} max={10} />
                        <div style={{marginTop:'1rem'}}></div>
                        <Slider label="Reverb" val={c.reverb} onChange={(v:number) => handleChange('config.reverb', v)} max={100} step={1} />
                        <Slider label="Delay" val={c.delay} onChange={(v:number) => handleChange('config.delay', v)} max={100} step={1} />
                        <Slider label="Distortion" val={c.distortion} onChange={(v:number) => handleChange('config.distortion', v)} max={100} step={1} />
                    </div>
                    
                    {/* NEW: Modulators Section */}
                    <div style={{ background: '#21252b', padding: '1rem', borderRadius: '4px' }}>
                         <h4 style={{marginTop:0, color:'#ccc', borderBottom:'1px solid #444', paddingBottom:'5px'}}>Modulation</h4>
                         
                         <label style={{fontSize:'0.75rem', color:'#888', display:'block', marginBottom:'5px'}}>Vibrato</label>
                         <Slider label="Depth" val={c.vibrato?.depth} onChange={(v:number) => handleChange('config.vibrato.depth', v)} max={100} step={1} />
                         <Slider label="Rate" val={c.vibrato?.rate} onChange={(v:number) => handleChange('config.vibrato.rate', v)} max={10} step={0.1} />
                         
                         <div style={{marginTop:'1rem', borderTop:'1px dashed #444', paddingTop:'1rem'}}>
                             <label style={{fontSize:'0.75rem', color:'#888', display:'block', marginBottom:'5px'}}>Panning</label>
                             <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                 <label style={{fontSize:'0.8rem', color:'#ccc'}}>
                                     <input type="checkbox" checked={c.panning?.enabled || false} onChange={e => handleChange('config.panning.enabled', e.target.checked)} /> Enable Auto-Pan
                                 </label>
                             </div>
                             {c.panning?.enabled && (
                                 <>
                                     <Slider label="Frequency" val={c.panning?.frequency} onChange={(v:number) => handleChange('config.panning.frequency', v)} max={10} />
                                     <Slider label="Depth" val={c.panning?.depth} onChange={(v:number) => handleChange('config.panning.depth', v)} max={1} />
                                 </>
                             )}
                         </div>
                    </div>
                </div>

            </div>
        </div>
    );
}