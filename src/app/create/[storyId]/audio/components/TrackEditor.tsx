'use client';
import { useState, useEffect } from 'react';
import { LigatureTrack, InstrumentDefinition, ParsedTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { formatLigatureSource } from '@/engine/audio/formatter';
import dynamic from 'next/dynamic';
import { PlayerQualities } from '@/engine/models';
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import { mergeLigatureSnippet } from '@/engine/audio/merger';
import { LigatureParser } from '@/engine/audio/parser';
import PatternLibrary from '@/engine/audio/components/PatternLibrary';
import { lintLigature, LintError } from '@/engine/audio/linter'; // Import Linter

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


[DEFINITIONS]


[PATTERN: Main]


[PLAYLIST]


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
    const [source, setSource] = useState(data.source || "");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const parser = new LigatureParser();

    // --- LINTER STATE ---
    const [lintErrors, setLintErrors] = useState<LintError[]>([]);
    // --------------------

    const { playTrack, stop, isPlaying } = useAudio();
    const [status, setStatus] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    
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
        // Prevent play if critical errors exist? Optional.
        // For now, allow it, but maybe warn.
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
        const saveData: LigatureTrack & { category: 'track' } = {
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
            {/* LEFT COLUMN: DEBUGGER */}
            <div style={{ width: '250px', flexShrink: 0 }}>
                <ScribeDebugger onUpdate={setMockQualities} />
            </div>

            {/* MIDDLE (MAIN) COLUMN: EDITOR */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '800px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}>Track: {data.name}</h2>
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

                {/* MOVED: Linter Output is now ABOVE source code */}
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

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: '800px'}}>
                    <label className="form-label">Ligature Source Code</label>
                    {isClient && (
                        <ScribeEditor 
                            value={source} 
                            onChange={handleSourceChange} 
                            minHeight="400px"
                            placeholder="[CONFIG]..."
                            language="ligature"
                            errors={lintErrors} // Pass errors to highlight line numbers
                        />
                    )}
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