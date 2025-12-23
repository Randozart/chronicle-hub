'use client';
import { useState, useEffect } from 'react';
import { ParsedTrack } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';

interface Props {
    parsedTrack: ParsedTrack | null;
    onChange: (source: string) => void;
}

export default function MixerView({ parsedTrack, onChange }: Props) {
    if (!parsedTrack) return <div className="p-4">No Data</div>;
    
    const [selectedInst, setSelectedInst] = useState<string | null>(null);

    // Local state for dragging sliders
    const [localState, setLocalState] = useState<Record<string, { vol: number, oct: number }>>({});

    useEffect(() => {
        const state: any = {};
        Object.entries(parsedTrack.instruments).forEach(([name, config]) => {
            state[name] = {
                vol: config.overrides.volume ?? -10,
                oct: config.overrides.octaveOffset ?? 0
            };
        });
        setLocalState(state);
    }, [parsedTrack]);

    const handleLocalChange = (name: string, key: 'vol' | 'oct', val: number) => {
        setLocalState(prev => ({ ...prev, [name]: { ...prev[name], [key]: val } }));
    };

    const commitChange = (name: string, key: string, value: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const inst = newTrack.instruments[name];
        if (!inst) return;
        
        if (key === 'volume') inst.overrides.volume = value;
        else if (key === 'octave') inst.overrides.octaveOffset = value;
        else if (key === 'reverb') inst.overrides.reverb = value;
        else if (key === 'delay') inst.overrides.delay = value;
        else if (key === 'distortion') inst.overrides.distortion = value;
        else if (key === 'bitcrush') inst.overrides.bitcrush = value;

        onChange(serializeParsedTrack(newTrack));
    };

    return (
        <div style={{ display: 'flex', height: '100%', background: '#111' }}>
            
            {/* MIXER STRIPS */}
            <div style={{ flex: 1, display: 'flex', gap: '8px', padding: '1rem', overflowX: 'auto' }}>
                {Object.entries(parsedTrack.instruments).map(([name, config]) => {
                    const state = localState[name] || { vol: -10, oct: 0 };
                    const isSelected = selectedInst === name;

                    return (
                        <div key={name} style={{ 
                            width: '80px', background: isSelected ? '#2c313a' : '#21252b', 
                            border: `1px solid ${isSelected ? '#61afef' : '#333'}`, 
                            borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', flexShrink: 0
                        }}>
                            <div 
                                onClick={() => setSelectedInst(name)}
                                style={{ 
                                    fontSize: '0.8rem', color: isSelected ? '#fff' : '#61afef', 
                                    marginBottom: '8px', fontWeight: 'bold', whiteSpace:'nowrap', 
                                    overflow:'hidden', textOverflow:'ellipsis', width:'100%', textAlign:'center',
                                    cursor: 'pointer' 
                                }}
                            >
                                {name}
                            </div>
                            
                            <div style={{ flex: 1, position: 'relative', width: '30px', background: '#111', borderRadius: '2px', marginBottom: '8px' }}>
                                <input 
                                    type="range" min="-60" max="6" step="1" 
                                    value={state.vol}
                                    onInput={(e) => handleLocalChange(name, 'vol', parseFloat((e.target as HTMLInputElement).value))}
                                    onMouseUp={(e) => commitChange(name, 'volume', parseFloat((e.target as HTMLInputElement).value))}
                                    style={{
                                        writingMode: 'vertical-lr', direction: 'rtl', 
                                        width: '100%', height: '100%', opacity: 0, cursor: 'ns-resize', position:'absolute', zIndex:10
                                    }}
                                    title={`Volume: ${state.vol}dB`}
                                />
                                <div style={{
                                    position: 'absolute', bottom: `${((state.vol + 60) / 66) * 100}%`, left: 0, right: 0, height: '10px', 
                                    background: '#98c379', borderRadius: '2px', pointerEvents: 'none', transition: 'bottom 0.05s linear'
                                }} />
                            </div>
                            
                            <button 
                                onClick={() => setSelectedInst(isSelected ? null : name)}
                                style={{ 
                                    width: '100%', fontSize: '0.7rem', background: '#333', border: '1px solid #555', 
                                    color: isSelected ? '#61afef' : '#ccc', cursor: 'pointer', borderRadius: '2px', marginTop: '4px' 
                                }}
                            >
                                FX {Object.keys(config.overrides).some(k => ['reverb','delay','distortion','bitcrush'].includes(k)) ? '•' : ''}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* FX RACK */}
            {selectedInst && (
                <div style={{ width: '250px', borderLeft: '1px solid #333', background: '#181a1f', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0, color: '#61afef' }}>{selectedInst} FX</h4>
                        <button onClick={() => setSelectedInst(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>×</button>
                    </div>

                    <EffectKnob label="Reverb" param="reverb" value={parsedTrack.instruments[selectedInst].overrides.reverb} onChange={(v) => commitChange(selectedInst, 'reverb', v)} />
                    <EffectKnob label="Delay" param="delay" value={parsedTrack.instruments[selectedInst].overrides.delay} onChange={(v) => commitChange(selectedInst, 'delay', v)} />
                    <EffectKnob label="Distortion" param="distortion" value={parsedTrack.instruments[selectedInst].overrides.distortion} onChange={(v) => commitChange(selectedInst, 'distortion', v)} />
                    <EffectKnob label="BitCrush" param="bitcrush" value={parsedTrack.instruments[selectedInst].overrides.bitcrush} onChange={(v) => commitChange(selectedInst, 'bitcrush', v)} />
                    
                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                         <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>Octave Offset</label>
                         <input 
                            type="number" 
                            value={localState[selectedInst]?.oct ?? 0} 
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                handleLocalChange(selectedInst, 'oct', v);
                                commitChange(selectedInst, 'octave', v);
                            }}
                            style={{ width: '100%', background: '#111', border: '1px solid #444', color: '#ccc', padding: '4px' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function EffectKnob({ label, param, value, onChange }: { label: string, param: string, value?: number, onChange: (v: number) => void }) {
    const val = value || 0;
    const color = (param === 'distortion' || param === 'bitcrush') ? '#e06c75' : '#61afef';

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: val > 0 ? '#fff' : '#888' }}>{label}</label>
                <span style={{ fontSize: '0.8rem', color: color }}>{val}%</span>
            </div>
            <input 
                type="range" min="0" max="100" step="5"
                value={val}
                onChange={(e) => onChange(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: color }}
            />
        </div>
    );
}