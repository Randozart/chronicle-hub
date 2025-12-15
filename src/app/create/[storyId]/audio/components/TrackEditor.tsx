'use client';
import { useState, useEffect } from 'react';
import { LigatureTrack, InstrumentDefinition } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { formatLigatureSource } from '@/engine/audio/formatter';
import dynamic from 'next/dynamic';
import { PlayerQualities } from '@/engine/models';
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import PianoRoll from '@/components/admin/PianoRoll';
import PatternLibrary from '@/engine/audio/components/PatternLibrary';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ minHeight: '500px', background: '#111', borderRadius: '4px', padding: '1rem', color: '#555' }}>Loading Editor...</div>
});

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
    enableDownload?: boolean;
    isPlayground?: boolean;
}

export default function TrackEditor({ 
    data, 
    onSave, 
    onDelete, 
    availableInstruments, 
    enableDownload = false,
    isPlayground = false 
}: Props) {
    const [form, setForm] = useState(data);
    const { playTrack, stop, isPlaying } = useAudio();
    const [status, setStatus] = useState("");
    const [editorValue, setEditorValue] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    const [optTolerance, setOptTolerance] = useState<0 | 1 | 2 | 3>(2);

    useEffect(() => {
        setIsClient(true);
        setEditorValue(data.source || "");
        setForm(data);
    }, [data]);

    const handlePlay = () => {
        try {
            playTrack(form.source, availableInstruments, mockQualities);
            setStatus("Playing...");
        } catch (e: any) {
            setStatus("Error: " + e.message);
            stop();
        }
    };

    const handleSourceChange = (newSource: string) => {
        setEditorValue(newSource);
        setForm(prev => ({ ...prev, source: newSource }));
    };

    const handleStop = () => {
        stop();
        setStatus("Stopped");
    };

    const handleClear = () => {
        if (confirm("Replace the current track with a blank template?")) {
            const newSource = EMPTY_TEMPLATE;
            setForm({ ...form, source: newSource });
            setEditorValue(newSource);
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

    const handleFormat = () => {
        setEditorValue(currentEditorValue => {
            const formatted = formatLigatureSource(currentEditorValue);
            setForm(prevForm => ({ ...prevForm, source: formatted }));
            return formatted;
        });
    };

    // --- 2. NEW HANDLER FOR SNIPPET INSERTION ---
    const handleInsertSnippet = (textToInsert: string) => {
        const newValue = editorValue + textToInsert;
        setEditorValue(newValue);
        setForm(prev => ({ ...prev, source: newValue }));
    };

    const groupedInsts = availableInstruments.reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr.id);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        // --- 3. UPDATED 3-COLUMN LAYOUT ---
        <div style={{ height: '100%', display: 'flex', gap: '1rem' }}>
            {/* LEFT COLUMN: DEBUGGER */}
            <div style={{ width: '250px', flexShrink: 0 }}>
                <ScribeDebugger onUpdate={setMockQualities} />
            </div>

            {/* MIDDLE (MAIN) COLUMN: EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}>Track: {form.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={handleClear} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                            New Template
                        </button>
                        <button onClick={handleFormat} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                            Format Grid
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
                        {!isPlayground && (
                            <button onClick={() => onSave(form)} className="save-btn">Save</button>
                        )}
                    </div>
                </div>

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '800px'}}>
                    <label className="form-label">Ligature Source Code</label>
                    {isClient && (
                        <ScribeEditor 
                            value={editorValue} 
                            onChange={handleSourceChange} 
                            minHeight="400px"
                            placeholder="[CONFIG]..."
                            language="ligature"
                        />
                    )}
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Pattern Visualization</label>
                    <PianoRoll source={editorValue} qualities={mockQualities} />
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#666', overflowY: 'auto', maxHeight: '200px' }}>
                    <strong style={{ color: '#aaa' }}>Available Instruments:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                        {Object.keys(groupedInsts).sort().map(cat => (
                            <div key={cat}>
                                <div style={{ color: '#61afef', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.7rem' }}>{cat}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {groupedInsts[cat].map(id => (
                                        <div key={id} style={{ fontFamily: 'monospace' }}>{id}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {!isPlayground && (
                    <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', marginTop: '1rem', alignSelf: 'flex-start' }}>
                        Delete Track
                    </button>
                )}
            </div>

            {/* RIGHT COLUMN: PATTERN LIBRARY */}
            <div style={{ width: '250px', flexShrink: 0 }}>
                <PatternLibrary onInsert={handleInsertSnippet} />
            </div>
        </div>
    );
}