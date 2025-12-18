'use client';

import { useState, useEffect, useRef } from 'react';
import { InstrumentDefinition, ParsedTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { formatLigatureSource } from '@/engine/audio/formatter';
import dynamic from 'next/dynamic';
import { PlayerQualities } from '@/engine/models';
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import { mergeLigatureSnippet } from '@/engine/audio/merger';
import { LigatureParser } from '@/engine/audio/parser';
// import PatternLibrary from '@/engine/audio/components/PatternLibrary'; // REMOVED
import { lintLigature, LintError } from '@/engine/audio/linter';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ minHeight: '500px', background: '#111', borderRadius: '4px', padding: '1rem', color: '#555' }}>Loading Editor...</div>
});
const PianoRoll = dynamic(() => import('@/components/admin/PianoRoll'), { ssr: false });

const EMPTY_TEMPLATE = `[CONFIG]
BPM: 120
Grid: 4
Time: 4/4
Scale: C Minor

[INSTRUMENTS]

[PATTERN: Main]

[PLAYLIST]
`;

// Local interface definition to fix import error
interface TrackData {
    id: string;
    name: string;
    source: string;
    category?: string;
}

interface Props {
    data: TrackData; // Updated type
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
    const [source, setSource] = useState(data.source || "");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const parser = new LigatureParser();

    // --- LINTER STATE ---
    const [lintErrors, setLintErrors] = useState<LintError[]>([]);
    
    // --- AUDIO CONTEXT ---
    const { 
        playTrack, stop, isPlaying, 
        limiterSettings, setLimiterSettings, 
        masterVolume, setMasterVolume 
    } = useAudio();

    const [status, setStatus] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    const [showMasterSettings, setShowMasterSettings] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsClient(true);
        try {
            setParsedTrack(parser.parse(data.source, mockQualities));
        } catch(e) {}
        setSource(data.source);
    }, [data, mockQualities]);

    // Linter Effect
    useEffect(() => {
        const errors = lintLigature(source);
        setLintErrors(errors);
    }, [source]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                handleSourceChange(text);
                setStatus('File imported successfully.');
            } else {
                setStatus('Error: Could not read file content.');
            }
        };
        reader.onerror = () => {
            setStatus('Error: Failed to read file.');
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleSourceChange = (newSource: string) => {
        setSource(newSource);
        try {
            setParsedTrack(parser.parse(newSource, mockQualities));
        } catch(e) {}
    };

    const handlePianoRollChange = (newSource: string) => {
        setSource(newSource);
        try {
            setParsedTrack(parser.parse(newSource, mockQualities));
        } catch(e) {}
    };

    const handlePlay = () => {
        try {
            playTrack(source, availableInstruments, mockQualities);
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
            handleSourceChange(EMPTY_TEMPLATE); 
        }
    };

    const handleDownload = () => {
        const blob = new Blob([source], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.id || 'track'}.lig`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleFormat = () => {
        handleSourceChange(formatLigatureSource(source));
    };

    const handleInsertSnippet = (textToInsert: string) => {
        handleSourceChange(mergeLigatureSnippet(source, textToInsert));
    };
    
    const handleSaveClick = () => {
        const saveData: TrackData & { category: 'track' } = {
            id: data.id,
            name: data.name,
            source: source,
            category: 'track'
        };
        onSave(saveData);
    }

    const groupedInsts = availableInstruments.reduce((acc, curr) => {
        const cat = curr.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr.id);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div style={{ height: '100%', display: 'flex', gap: '1rem' }}>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                style={{ display: 'none' }} 
                accept=".lig,.txt"
            />
            
            {/* LEFT COLUMN: DEBUGGER */}
            <div style={{ width: '250px', flexShrink: 0 }}>
                <ScribeDebugger onUpdate={setMockQualities} />
            </div>

            {/* MIDDLE (MAIN) COLUMN: EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '0' }}>
                
                {/* TOOLBAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}>Track: {data.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        
                        {/* MASTER SETTINGS DROPDOWN */}
                        <div style={{ position: 'relative' }}>
                            <button 
                                onClick={() => setShowMasterSettings(!showMasterSettings)} 
                                style={{ 
                                    background: '#21252b', border: '1px solid #444', color: '#ccc', 
                                    padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                🎚️ Master {masterVolume !== 0 ? `(${masterVolume > 0 ? '+' : ''}${masterVolume}dB)` : ''}
                            </button>

                            {showMasterSettings && (
                                <div style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100,
                                    background: '#181a1f', border: '1px solid #61afef', borderRadius: '4px',
                                    padding: '1rem', width: '250px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#61afef', fontSize: '0.9rem', textTransform: 'uppercase' }}>Master Bus Output</h4>
                                    
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
                                            Master Volume: {masterVolume} dB
                                        </label>
                                        <input 
                                            type="range" min="-30" max="10" step="1" 
                                            value={masterVolume} 
                                            onChange={e => setMasterVolume(parseInt(e.target.value))}
                                            style={{ width: '100%', accentColor: '#61afef' }}
                                        />
                                    </div>

                                    <div style={{ borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <label style={{ fontSize: '0.9rem', color: '#ccc' }}>Limiter</label>
                                            <input 
                                                type="checkbox" 
                                                checked={limiterSettings.enabled} 
                                                onChange={e => setLimiterSettings({...limiterSettings, enabled: e.target.checked})} 
                                            />
                                        </div>
                                        
                                        {limiterSettings.enabled && (
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>
                                                    Threshold: {limiterSettings.threshold} dB
                                                </label>
                                                <input 
                                                    type="range" min="-40" max="0" step="1" 
                                                    value={limiterSettings.threshold} 
                                                    onChange={e => setLimiterSettings({...limiterSettings, threshold: parseInt(e.target.value)})}
                                                    style={{ width: '100%', accentColor: '#98c379' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={handleImportClick} style={{ background: 'transparent', border: '1px solid #56B6C2', color: '#56B6C2', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                           Import .lig
                        </button>
                        
                        <button onClick={handleClear} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                            New
                        </button>
                        <button onClick={handleFormat} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                            Format
                        </button>
                
                        {isPlaying ? (
                            <button onClick={handleStop} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>■ Stop</button>
                        ) : (
                            <button onClick={handlePlay} className="save-btn" style={{ background: '#98c379', color: '#000' }}>▶ Play Preview</button>
                        )}
                        {enableDownload && (
                            <button onClick={handleDownload} style={{ background: '#56B6C2', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Download
                            </button>
                        )}
                        {!isPlayground && (
                            <button onClick={handleSaveClick} className="save-btn">Save</button>
                        )}
                    </div>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Visual Editor</label>
                    {isClient && (
                        <PianoRoll 
                            source={source} 
                            qualities={mockQualities}
                            onChange={handlePianoRollChange}
                        />
                    )}
                </div>

                {lintErrors.length > 0 && (
                    <div style={{ 
                        marginBottom: '0.5rem', 
                        padding: '0.75rem', 
                        background: '#2c2525', 
                        border: '1px solid #e06c75', 
                        borderRadius: '4px',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ color: '#e06c75', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            {lintErrors.length} Issues Found
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {lintErrors.map((err, i) => (
                                <div key={i} style={{ fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                                    <span style={{ color: '#aaa', fontFamily: 'monospace', minWidth: '40px' }}>Ln {err.line}</span>
                                    <span style={{ color: err.severity === 'error' ? '#e06c75' : '#e5c07b' }}>
                                        {err.message}
                                    </span>
                                    {err.context && <span style={{ color: '#666' }}>({err.context})</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                    <label className="form-label">Ligature Source Code</label>
                    {isClient && (
                        <ScribeEditor 
                            value={source} 
                            onChange={handleSourceChange} 
                            minHeight="100%"
                            placeholder="[CONFIG]..."
                            language="ligature"
                            errors={lintErrors} 
                        />
                    )}
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '4px', fontSize: '0.8rem', color: '#666', overflowY: 'auto', maxHeight: '150px' }}>
                    <strong style={{ color: '#aaa' }}>Available Instruments:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                        {Object.keys(groupedInsts).sort().map(cat => (
                            <div key={cat}>
                                <span style={{ color: '#61afef', fontWeight: 'bold', fontSize: '0.75rem' }}>{cat}: </span>
                                <span style={{ fontFamily: 'monospace' }}>{groupedInsts[cat].join(', ')}</span>
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

            {/* RIGHT COLUMN: REMOVED */}
        </div>
    );
}