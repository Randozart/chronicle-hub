'use client';
import { useState, useEffect, useRef, useCallback } from 'react'; // Added useCallback
// import '@/app/tools.css'; 

import { InstrumentDefinition, ParsedTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { formatLigatureSource } from '@/engine/audio/formatter';
import dynamic from 'next/dynamic';
import { PlayerQualities, QualityDefinition } from '@/engine/models'; 
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import { LigatureParser } from '@/engine/audio/parser';
import { lintLigature, LintError } from '@/engine/audio/linter';
import InstrumentEditor from './InstrumentEditor';
import InstrumentLibrary from './InstrumentLibrary';
import { mergeLigatureSnippet } from '@/engine/audio/merger';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { useDebounce } from '@/hooks/useDebounce';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });
const PianoRoll = dynamic(() => import('@/components/admin/pianoroll/PianoRoll'), { ssr: false });
import ArrangementView from './ArrangementView';
import TrackerView from './TrackerView';
import MixerView from '@/engine/audio/components/MixerView';

const EMPTY_TEMPLATE = `[CONFIG]\nBPM: 120\nGrid: 4\nScale: C Minor\n\n[INSTRUMENTS]\n\nPiano: hq_piano\n\n[PATTERN: Main]\n\nPiano |................|\n\n[PLAYLIST]\n\nMain\n`;

interface TrackData { id: string; name: string; source: string; category?: string; }

interface Props {
    data: TrackData;
    onSave: (d: any) => void;
    onDelete: () => void;
    availableInstruments: InstrumentDefinition[];
    onUpdateInstrument: (updated: InstrumentDefinition) => void;
    enableDownload?: boolean;
    isPlayground?: boolean;
    hideCategories?: string[];
}

export default function TrackEditor({ 
    data, onSave, onDelete, availableInstruments, onUpdateInstrument,
    enableDownload = false, isPlayground = false, hideCategories = []
}: Props) {
    const [source, setSource] = useState(data.source || "");
    const debouncedSource = useDebounce(source, 600);
    
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const [isParsing, setIsParsing] = useState(false);

    const [showArrangement, setShowArrangement] = useState(true);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [showMixer, setShowMixer] = useState(false); 
    const [noteEditorMode, setNoteEditorMode] = useState<'piano' | 'tracker'>('piano');
    const [showMasterSettings, setShowMasterSettings] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [lintErrors, setLintErrors] = useState<LintError[]>([]);
    const [editingInstrument, setEditingInstrument] = useState<InstrumentDefinition | null>(null);
    
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    const [mockDefs, setMockDefs] = useState<Record<string, QualityDefinition>>({});
    
    const [status, setStatus] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);

    const [activePlaylistIndex, setActivePlaylistIndex] = useState<number>(0);
    const [playbackMode, setPlaybackMode] = useState<'global' | 'local' | 'stopped'>('stopped');
    const { playTrack, stop, isPlaying, limiterSettings, setLimiterSettings, masterVolume, setMasterVolume } = useAudio();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setIsClient(true); setSource(data.source); }, [data]);
    
    useEffect(() => {
        setIsParsing(true);
        const timer = setTimeout(() => {
            setLintErrors(lintLigature(debouncedSource)); 
            try {
                const parser = new LigatureParser();
                const track = parser.parse(debouncedSource, mockQualities, mockDefs);
                setParsedTrack(track);
            } catch(e) {
                console.error("Parse error", e);
            } finally {
                setIsParsing(false);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [debouncedSource, mockQualities, mockDefs]);

    // --- FIX: MEMOIZE CALLBACK TO PREVENT INFINITE LOOP ---
    const handleDebuggerUpdate = useCallback((qualities: PlayerQualities, defs: Record<string, QualityDefinition>) => {
        // Use functional state update to prevent dependency cycle if we were depending on state
        setMockQualities(q => JSON.stringify(q) === JSON.stringify(qualities) ? q : qualities);
        setMockDefs(d => JSON.stringify(d) === JSON.stringify(defs) ? d : defs);
    }, []);

    const handleSourceChange = (newSource: string) => setSource(newSource);
    const handleVisualUpdate = (newSource: string) => setSource(newSource);
    
    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleConfigUpdate = (key: string, val: any) => {
        if (!parsedTrack) return;
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));

        if (key === 'grid') {
            const oldGrid = newTrack.config.grid;
            const newGrid = val;
            
            if (oldGrid !== newGrid && oldGrid > 0) {
                const ratio = newGrid / oldGrid;
                Object.values(newTrack.patterns).forEach((pat: any) => {
                    pat.duration = Math.round(pat.duration * ratio);
                    Object.values(pat.tracks).forEach((events: any) => {
                        events.forEach((ev: any) => {
                            ev.time = ev.time * ratio;
                            ev.duration = ev.duration * ratio;
                        });
                    });
                });
                newTrack.config.grid = newGrid;
            }
        } else {
            // @ts-ignore
            newTrack.config[key] = val;
        }
        setSource(serializeParsedTrack(newTrack));
    };

    const handlePatternAction = (action: string, patternId: string) => {
        if (!parsedTrack) return;
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const pattern = newTrack.patterns[patternId];
        if (!pattern) return;

        if (action === 'double_speed') {
            pattern.duration = Math.ceil(pattern.duration / 2);
            Object.values(pattern.tracks).forEach((events: any) => {
                events.forEach((e: any) => { e.time /= 2; e.duration /= 2; });
            });
        } else if (action === 'half_speed') {
            pattern.duration *= 2;
            Object.values(pattern.tracks).forEach((events: any) => {
                events.forEach((e: any) => { e.time *= 2; e.duration *= 2; });
            });
        }

        setSource(serializeParsedTrack(newTrack));
    };

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { if (typeof e.target?.result === 'string') setSource(e.target.result); };
        reader.readAsText(file);
        event.target.value = '';
    };
    
    const handlePlay = () => {
        try {
            stop(); 
            setPlaybackMode('global'); 
            playTrack(source, availableInstruments, mockQualities);
            setStatus("Playing Global...");
        } catch (e: any) {
            setStatus("Error: " + e.message);
            stop();
            setPlaybackMode('stopped');
        }
    };
    
    const handleStop = () => {
        stop();
        setPlaybackMode('stopped');
        setStatus("Stopped");
    };    
    
    const handleClear = () => { if (confirm("Clear track?")) setSource(EMPTY_TEMPLATE); };
    const handleFormat = () => setSource(formatLigatureSource(source));
    
    const handleSaveClick = async () => {
        try {
            await onSave({ id: data.id, name: data.name, source, category: 'track' });
            showToast("Track Saved Successfully");
        } catch(e) {
            showToast("Failed to save track", 'error');
        }
    };

    const handleDownload = () => {
        const blob = new Blob([source], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${data.id || 'track'}.lig`; a.click(); URL.revokeObjectURL(url);
    };
    const handleEditInstrument = (id: string) => setEditingInstrument(availableInstruments.find(i => i.id === id) || null);
    
    const handleInsertInstrumentToTrack = (instrumentId: string, presetId: string) => {
        const snippet = `[INSTRUMENTS]\n${instrumentId}: ${presetId}`;
        const newSource = mergeLigatureSnippet(source, snippet);
        setSource(newSource);
    };

    return (
        <div className="editor-layout">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".lig,.txt" />
            
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'success' ? '#2ecc71' : '#e74c3c',
                    color: '#fff', padding: '10px 20px', borderRadius: '4px', zIndex: 10000,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 'bold', fontSize: '0.9rem'
                }}>
                    {toast.msg}
                </div>
            )}

            <div 
                className="editor-sidebar"
                style={{ width: leftSidebarOpen ? '250px' : '40px' }}
                onClick={() => !leftSidebarOpen && setLeftSidebarOpen(true)}
            >
                <div className="editor-sidebar-header">
                    <button onClick={(e) => { e.stopPropagation(); setLeftSidebarOpen(!leftSidebarOpen); }} className="tool-icon-btn">
                        {leftSidebarOpen ? '«' : '»'}
                    </button>
                </div>
                {leftSidebarOpen ? (
                    <ScribeDebugger onUpdate={handleDebuggerUpdate} />
                ) : <div className="editor-sidebar-collapsed-text">DEBUGGER</div>}
            </div>

            <div className="editor-main">
                <div className="editor-toolbar">
                     <div className="editor-toolbar-group">
                        <h2 className="editor-title">{data.name}</h2>
                        <span className="editor-status" style={{color: isParsing ? '#e5c07b' : '#777'}}>
                            {isParsing ? "⚡ PARSING..." : (isPlaying ? "▶ PLAYING" : status)}
                        </span>
                    </div>
                    <div className="editor-toolbar-group">
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowMasterSettings(!showMasterSettings)} className="tool-btn">🎚️ Master</button>
                            {showMasterSettings && (
                                <div className="tool-popup">
                                    <h4>Master Bus</h4>
                                    <div><label>Volume: {masterVolume} dB</label><input type="range" min="-30" max="10" step="1" value={masterVolume} onChange={e => setMasterVolume(parseInt(e.target.value))} style={{ width: '100%' }}/></div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label style={{ fontSize: '0.9rem' }}>Limiter</label><input type="checkbox" checked={limiterSettings.enabled} onChange={e => setLimiterSettings({...limiterSettings, enabled: e.target.checked})} /></div>
                                        {limiterSettings.enabled && (<div style={{marginTop: '0.5rem'}}><label>Threshold: {limiterSettings.threshold} dB</label><input type="range" min="-40" max="0" step="1" value={limiterSettings.threshold} onChange={e => setLimiterSettings({...limiterSettings, threshold: parseInt(e.target.value)})}/></div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleImportClick} className="tool-btn">Import</button>
                        <button onClick={handleClear} className="tool-btn">New</button>
                        
                        <div className="toggle-group">
                            <button onClick={() => setShowArrangement(!showArrangement)} className={showArrangement ? 'active' : ''}>Timeline</button>
                            <button onClick={() => setShowMixer(!showMixer)} className={showMixer ? 'active' : ''}>Mixer</button>
                            <button onClick={() => setShowNoteEditor(!showNoteEditor)} className={showNoteEditor ? 'active' : ''}>Notes</button>
                        </div>
                        
                        <button onClick={handleFormat} className="tool-btn">Format</button>
                        {isPlaying 
                            ? <button onClick={handleStop} className="tool-btn tool-btn-stop">■ Stop</button> 
                            : <button onClick={handlePlay} className="tool-btn tool-btn-play">▶ Play</button>
                        }
                        {enableDownload && <button onClick={handleDownload} className="tool-btn tool-btn-action">.lig</button>}
                        {!isPlayground && <button onClick={handleSaveClick} className="tool-btn tool-btn-action">Save</button>}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {showArrangement && isClient && (
                        <div style={{ borderBottom: '1px solid #333' }}>
                           <ArrangementView 
                                parsedTrack={parsedTrack} 
                                onChange={handleVisualUpdate} 
                                onSelectRow={setActivePlaylistIndex}
                                activeIndex={activePlaylistIndex}
                                onConfigUpdate={handleConfigUpdate}
                                onPatternAction={handlePatternAction}
                                isPlaying={isPlaying}
                                playbackMode={playbackMode} 
                            />
                        </div>
                    )}
                    
                    {showMixer && isClient && (
                        <div style={{ borderBottom: '1px solid #333', height: '220px', resize: 'vertical', overflow: 'hidden' }}>
                            <MixerView parsedTrack={parsedTrack} onChange={handleVisualUpdate} />
                        </div>
                    )}

                    {showNoteEditor && isClient && (
                        <div style={{ borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                            <div className="note-editor-header">
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setNoteEditorMode('piano')} className={`note-editor-tab ${noteEditorMode === 'piano' ? 'active' : ''}`}>Piano Roll</button>
                                    <button onClick={() => setNoteEditorMode('tracker')} className={`note-editor-tab ${noteEditorMode === 'tracker' ? 'active' : ''}`}>Tracker</button>
                                </div>
                                <span style={{fontSize: '0.75rem', color: '#555'}}>Context: Playlist Row {activePlaylistIndex}</span>
                            </div>
                            <div style={{ background: '#0d0d0d' }}>
                                {noteEditorMode === 'piano' ? (
                                    <PianoRoll 
                                        source={source} 
                                        qualities={mockQualities} 
                                        onChange={handleVisualUpdate}
                                        availableInstruments={availableInstruments} 
                                        playbackMode={playbackMode} 
                                        onPlaybackModeChange={setPlaybackMode}
                                    />
                                ) : (
                                    <TrackerView 
                                        parsedTrack={parsedTrack} 
                                        onChange={handleVisualUpdate} 
                                        playlistIndex={activePlaylistIndex}
                                        availableInstruments={availableInstruments} 
                                        playbackMode={playbackMode} 
                                        onPlaybackModeChange={setPlaybackMode}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {lintErrors.length > 0 && (
                    <div className="editor-error-panel">
                        <div className="editor-error-header">{lintErrors.length} Issues</div>
                        {lintErrors.map((err, i) => <div key={i} className="editor-error-item">Ln {err.line}: {err.message}</div>)}
                    </div>
                )}
                
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '0', padding: '0', overflow:'hidden' }}>
                    {isClient && <ScribeEditor value={source} onChange={handleSourceChange} minHeight="100%" language="ligature" errors={lintErrors} />}
                </div>
            </div>

            <div 
                className="editor-sidebar right"
                style={{ width: rightSidebarOpen ? '250px' : '40px' }}
                onClick={() => !rightSidebarOpen && setRightSidebarOpen(true)}
            >
                <div className="editor-sidebar-header">
                    <button onClick={(e) => { e.stopPropagation(); setRightSidebarOpen(!rightSidebarOpen); }} className="tool-icon-btn">
                        {rightSidebarOpen ? '»' : '«'}
                    </button>
                </div>
                {rightSidebarOpen 
                    ? <InstrumentLibrary instruments={availableInstruments.filter(inst => !hideCategories.includes(inst.category || ''))} onSelect={handleEditInstrument} /> 
                    : <div className="editor-sidebar-collapsed-text">LIBRARY</div>
                }
            </div>

            {editingInstrument && (
                <InstrumentEditor 
                    data={editingInstrument} 
                    onSave={(updated) => { onUpdateInstrument(updated); setEditingInstrument(null); }} 
                    onClose={() => setEditingInstrument(null)} 
                    onInsertIntoTrack={handleInsertInstrumentToTrack} 
                />
            )}
        </div>
    );
}