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

    // Local state to track dragging values to prevent lag
    // We only commit to 'onChange' when the user releases the handle
    const [localState, setLocalState] = useState<Record<string, { vol: number, oct: number }>>({});

    // Sync local state when external parsedTrack changes (unless dragging?)
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
        setLocalState(prev => ({
            ...prev,
            [name]: { ...prev[name], [key]: val }
        }));
    };

    const commitChange = (name: string, key: 'volume' | 'octave', value: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const inst = newTrack.instruments[name];
        if (!inst) return;
        
        if (key === 'volume') inst.overrides.volume = value;
        if (key === 'octave') inst.overrides.octaveOffset = value;

        onChange(serializeParsedTrack(newTrack));
    };

    return (
        <div style={{ display: 'flex', gap: '8px', padding: '1rem', overflowX: 'auto', height: '100%', background: '#111' }}>
            {Object.entries(parsedTrack.instruments).map(([name, config]) => {
                const state = localState[name] || { vol: -10, oct: 0 };

                return (
                    <div key={name} style={{ 
                        width: '80px', background: '#21252b', border: '1px solid #333', 
                        borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#61afef', marginBottom: '8px', fontWeight: 'bold', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', textAlign:'center' }}>
                            {name}
                        </div>
                        
                        {/* Fader Track */}
                        <div style={{ flex: 1, position: 'relative', width: '30px', background: '#111', borderRadius: '2px', marginBottom: '8px' }}>
                            <input 
                                type="range" 
                                min="-60" max="6" step="1" 
                                value={state.vol}
                                onInput={(e) => handleLocalChange(name, 'vol', parseFloat((e.target as HTMLInputElement).value))}
                                onMouseUp={(e) => commitChange(name, 'volume', parseFloat((e.target as HTMLInputElement).value))}
                                style={{
                                    writingMode: 'vertical-lr', direction: 'rtl', 
                                    width: '100%', height: '100%', opacity: 0, cursor: 'ns-resize', position:'absolute', zIndex:10
                                }}
                                title={`Volume: ${state.vol}dB`}
                            />
                            {/* Visual Cap */}
                            <div style={{
                                position: 'absolute', 
                                bottom: `${((state.vol + 60) / 66) * 100}%`, 
                                left: 0, right: 0, height: '10px', 
                                background: '#98c379', borderRadius: '2px',
                                pointerEvents: 'none',
                                transition: 'bottom 0.05s linear' // Smooth visual update
                            }} />
                        </div>
                        
                        <div style={{ fontSize: '0.7rem', color: '#ccc', marginBottom: '8px' }}>{Math.round(state.vol)}dB</div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '100%' }}>
                            <label style={{ fontSize: '0.65rem', color: '#777' }}>OCT</label>
                            <input 
                                type="number" 
                                value={state.oct} 
                                onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    handleLocalChange(name, 'oct', v);
                                    commitChange(name, 'octave', v);
                                }}
                                style={{ width: '100%', background: '#111', border: '1px solid #444', color: '#ccc', fontSize: '0.8rem', textAlign: 'center' }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}