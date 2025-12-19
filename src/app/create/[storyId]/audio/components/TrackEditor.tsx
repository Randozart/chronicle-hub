// src/app/create/[storyId]/audio/components/TrackEditor.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { InstrumentDefinition, ParsedTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { formatLigatureSource } from '@/engine/audio/formatter';
import dynamic from 'next/dynamic';
import { PlayerQualities } from '@/engine/models';
import ScribeDebugger from '@/components/admin/ScribeDebugger';
import { LigatureParser } from '@/engine/audio/parser';
import { lintLigature, LintError } from '@/engine/audio/linter';
import InstrumentEditor from './InstrumentEditor';
import InstrumentLibrary from './InstrumentLibrary';
import { mergeLigatureSnippet } from '@/engine/audio/merger';
import { serializeParsedTrack } from '@/engine/audio/serializer';

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { ssr: false });
const PianoRoll = dynamic(() => import('@/components/admin/PianoRoll'), { ssr: false });
import ArrangementView from './ArrangementView';
import TrackerView from './TrackerView';

const EMPTY_TEMPLATE = `[CONFIG]\nBPM: 120\nGrid: 4\nScale: C Minor\n\n[INSTRUMENTS]\n\n[PATTERN: Main]\n\n[PLAYLIST]\n`;

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
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const [showArrangement, setShowArrangement] = useState(true);
    const [showNoteEditor, setShowNoteEditor] = useState(false);
    const [noteEditorMode, setNoteEditorMode] = useState<'piano' | 'tracker'>('piano');
    const [showMasterSettings, setShowMasterSettings] = useState(false);
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [lintErrors, setLintErrors] = useState<LintError[]>([]);
    const [editingInstrument, setEditingInstrument] = useState<InstrumentDefinition | null>(null);
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    const [status, setStatus] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [activePlaylistIndex, setActivePlaylistIndex] = useState<number>(0);

    const { playTrack, stop, isPlaying, limiterSettings, setLimiterSettings, masterVolume, setMasterVolume } = useAudio();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setIsClient(true); setSource(data.source); }, [data]);
    
    useEffect(() => {
        setLintErrors(lintLigature(source)); 
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source, mockQualities);
            setParsedTrack(track);
        } catch(e) {}
    }, [source, mockQualities]);

    const handleSourceChange = (newSource: string) => setSource(newSource);
    const handleVisualUpdate = (newSource: string) => setSource(newSource);
    
    // --- GRID REFACTORING LOGIC ---
    const handleConfigUpdate = (key: string, val: any) => {
        if (!parsedTrack) return;
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));

        if (key === 'grid') {
            const oldGrid = newTrack.config.grid;
            const newGrid = val;
            
            if (oldGrid !== newGrid) {
                const ratio = newGrid / oldGrid;
                
                // Scale every event in every pattern
                Object.values(newTrack.patterns).forEach((pat: any) => {
                    // Scale Pattern Duration
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
    }

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => { if (typeof e.target?.result === 'string') setSource(e.target.result); };
        reader.readAsText(file);
        event.target.value = '';
    };
    const handlePlay = () => { try { playTrack(source, availableInstruments, mockQualities); setStatus("Playing..."); } catch (e: any) { setStatus("Error: " + e.message); stop(); }};
    const handleStop = () => { stop(); setStatus("Stopped"); };
    const handleClear = () => { if (confirm("Clear track?")) setSource(EMPTY_TEMPLATE); };
    const handleFormat = () => setSource(formatLigatureSource(source));
    const handleSaveClick = () => onSave({ id: data.id, name: data.name, source, category: 'track' });
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
        <div style={{ height: '100%', display: 'flex', gap: '0px', overflow: 'hidden' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".lig,.txt" />
            
            <div 
                style={{ 
                    width: leftSidebarOpen ? '250px' : '40px', flexShrink: 0, display: 'flex', flexDirection: 'column', 
                    borderRight: '1px solid #333', transition: 'width 0.2s', background: '#181a1f', cursor: leftSidebarOpen ? 'default' : 'pointer'
                }}
                onClick={() => !leftSidebarOpen && setLeftSidebarOpen(true)}
            >
                <div style={{ padding: '4px', borderBottom: '1px solid #333', display: 'flex', justifyContent: leftSidebarOpen ? 'flex-end' : 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); setLeftSidebarOpen(!leftSidebarOpen); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize:'1.2rem', fontWeight:'bold' }}>{leftSidebarOpen ? '«' : '»'}</button>
                </div>
                {leftSidebarOpen ? <ScribeDebugger onUpdate={setMockQualities} /> : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#666', fontSize:'0.9rem', letterSpacing:'2px' }}>DEBUGGER</div>}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#141414' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #333', padding: '0.5rem 1rem', alignItems: 'center', background: '#21252b' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{data.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777', width: '80px' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowMasterSettings(!showMasterSettings)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize:'0.8rem' }}>🎚️ Master</button>
                            {showMasterSettings && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100, background: '#181a1f', border: '1px solid #61afef', borderRadius: '4px', padding: '1rem', width: '250px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#61afef', fontSize: '0.9rem' }}>Master Bus</h4>
                                    <div><label style={{display: 'block', fontSize: '0.8rem', color: '#888'}}>Volume: {masterVolume} dB</label><input type="range" min="-30" max="10" step="1" value={masterVolume} onChange={e => setMasterVolume(parseInt(e.target.value))} style={{ width: '100%' }}/></div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label style={{ fontSize: '0.9rem' }}>Limiter</label><input type="checkbox" checked={limiterSettings.enabled} onChange={e => setLimiterSettings({...limiterSettings, enabled: e.target.checked})} /></div>
                                        {limiterSettings.enabled && (<div style={{marginTop: '0.5rem'}}><label style={{display: 'block', fontSize: '0.8rem', color: '#888'}}>Threshold: {limiterSettings.threshold} dB</label><input type="range" min="-40" max="0" step="1" value={limiterSettings.threshold} onChange={e => setLimiterSettings({...limiterSettings, threshold: parseInt(e.target.value)})}/></div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleImportClick} style={{ background: 'transparent', border: '1px solid #56B6C2', color: '#56B6C2', padding: '4px 8px', borderRadius: '4px', fontSize:'0.8rem' }}>Import</button>
                        <button onClick={handleClear} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '4px 8px', borderRadius: '4px', fontSize:'0.8rem' }}>New</button>
                        <div style={{ display: 'flex', gap: '1px', background: '#333', padding: '1px', borderRadius: '4px' }}>
                            <button onClick={() => setShowArrangement(!showArrangement)} style={{ background: showArrangement ? '#61afef' : '#111', color: showArrangement ? '#000' : '#ccc', padding: '4px 8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Arranger</button>
                            <button onClick={() => setShowNoteEditor(!showNoteEditor)} style={{ background: showNoteEditor ? '#61afef' : '#111', color: showNoteEditor ? '#000' : '#ccc', padding: '4px 8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Notes</button>
                        </div>
                        <button onClick={handleFormat} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '4px 8px', borderRadius: '4px', fontSize:'0.8rem' }}>Format</button>
                        {isPlaying ? <button onClick={handleStop} className="unequip-btn" style={{width: 'auto', padding: '4px 12px'}}>■ Stop</button> : <button onClick={handlePlay} className="save-btn" style={{ background: '#98c379', color: '#000', padding:'4px 12px' }}>▶ Play</button>}
                        {enableDownload && <button onClick={handleDownload} style={{ background: '#56B6C2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize:'0.8rem' }}>.lig</button>}
                        {!isPlayground && <button onClick={handleSaveClick} className="save-btn" style={{ padding: '4px 12px' }}>Save</button>}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                    {showArrangement && isClient && (
                        <div style={{ borderBottom: '1px solid #333' }}>
                            <ArrangementView parsedTrack={parsedTrack} onChange={handleVisualUpdate} onSelectRow={setActivePlaylistIndex} activeIndex={activePlaylistIndex} onConfigUpdate={handleConfigUpdate} />
                        </div>
                    )}
                    {showNoteEditor && isClient && (
                        <div style={{ borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ background: '#111', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom:'1px solid #222' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => setNoteEditorMode('piano')} style={{ background: 'none', border: 'none', color: noteEditorMode === 'piano' ? '#61afef' : '#555', cursor: 'pointer', fontWeight: 'bold' }}>Piano Roll</button>
                                    <button onClick={() => setNoteEditorMode('tracker')} style={{ background: 'none', border: 'none', color: noteEditorMode === 'tracker' ? '#61afef' : '#555', cursor: 'pointer', fontWeight: 'bold' }}>Tracker</button>
                                </div>
                                <span style={{fontSize: '0.75rem', color: '#555'}}>Context: Playlist Row {activePlaylistIndex}</span>
                            </div>
                            <div style={{ background: '#0d0d0d' }}>
                                {noteEditorMode === 'piano' ? (
                                    <PianoRoll source={source} qualities={mockQualities} onChange={handleVisualUpdate} />
                                ) : (
                                    <TrackerView parsedTrack={parsedTrack} onChange={handleVisualUpdate} playlistIndex={activePlaylistIndex} />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {lintErrors.length > 0 && (
                    <div style={{ padding: '0.5rem', background: '#2c2525', borderBottom: '1px solid #e06c75', maxHeight: '100px', overflowY: 'auto' }}>
                        <div style={{ color: '#e06c75', fontWeight: 'bold', fontSize: '0.75rem' }}>{lintErrors.length} Issues</div>
                        {lintErrors.map((err, i) => <div key={i} style={{fontSize: '0.8rem'}}>Ln {err.line}: {err.message}</div>)}
                    </div>
                )}
                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '0', padding: '0' }}>
                    {isClient && <ScribeEditor value={source} onChange={handleSourceChange} minHeight="100%" language="ligature" errors={lintErrors} />}
                </div>
            </div>

            <div 
                style={{ 
                    width: rightSidebarOpen ? '250px' : '40px', flexShrink: 0, display: 'flex', flexDirection: 'column',
                    borderLeft: '1px solid #333', transition: 'width 0.2s', background: '#181a1f', cursor: rightSidebarOpen ? 'default' : 'pointer'
                }}
                onClick={() => !rightSidebarOpen && setRightSidebarOpen(true)}
            >
                <div style={{ padding: '4px', borderBottom: '1px solid #333', display: 'flex', justifyContent: rightSidebarOpen ? 'flex-start' : 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); setRightSidebarOpen(!rightSidebarOpen); }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize:'1.2rem', fontWeight:'bold' }}>{rightSidebarOpen ? '»' : '«'}</button>
                </div>
                {rightSidebarOpen ? <InstrumentLibrary instruments={availableInstruments.filter(inst => !hideCategories.includes(inst.category || ''))} onSelect={handleEditInstrument} /> : <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: '#666', fontSize:'0.9rem', letterSpacing:'2px' }}>LIBRARY</div>}
            </div>

            {editingInstrument && (
                <InstrumentEditor data={editingInstrument} onSave={(updated) => { onUpdateInstrument(updated); setEditingInstrument(null); }} onClose={() => setEditingInstrument(null)} onInsertIntoTrack={handleInsertInstrumentToTrack} />
            )}
        </div>
    );
}