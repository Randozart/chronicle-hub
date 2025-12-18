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

const ScribeEditor = dynamic(() => import('@/components/admin/ScribeEditor'), { 
    ssr: false,
    loading: () => <div style={{ minHeight: '500px', background: '#111', borderRadius: '4px', padding: '1rem', color: '#555' }}>Loading Editor...</div>
});
const PianoRoll = dynamic(() => import('@/components/admin/PianoRoll'), { ssr: false });

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
    const [lintErrors, setLintErrors] = useState<LintError[]>([]);
    const [showPianoRoll, setShowPianoRoll] = useState(false);
    const [showMasterSettings, setShowMasterSettings] = useState(false);
    const [editingInstrument, setEditingInstrument] = useState<InstrumentDefinition | null>(null);
    
    const { 
        playTrack, stop, isPlaying, 
        limiterSettings, setLimiterSettings, 
        masterVolume, setMasterVolume 
    } = useAudio();

    const [status, setStatus] = useState("");
    const [isClient, setIsClient] = useState(false);
    const [mockQualities, setMockQualities] = useState<PlayerQualities>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setIsClient(true); setSource(data.source); }, [data]);
    useEffect(() => { setLintErrors(lintLigature(source)); }, [source]);

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
    const handleSaveInstrument = (updatedInstrument: InstrumentDefinition) => {
        onUpdateInstrument(updatedInstrument);
        setEditingInstrument(null);
    };

    const handleInsertInstrumentToTrack = (instrumentId: string, presetId: string) => {
        const snippet = `[INSTRUMENTS]\n${instrumentId}: ${presetId}`;
        const newSource = mergeLigatureSnippet(source, snippet);
        setSource(newSource);
        alert(`Instrument '${instrumentId}' added to track.`);
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '1rem' }}>
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".lig,.txt" />
            
            {editingInstrument && (
                <InstrumentEditor 
                    data={editingInstrument}
                    onSave={handleSaveInstrument}
                    onClose={() => setEditingInstrument(null)}
                    onInsertIntoTrack={handleInsertInstrumentToTrack}
                />
            )}

            <div style={{ width: '250px', flexShrink: 0 }}>
                <ScribeDebugger onUpdate={setMockQualities} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ margin: 0 }}>Track: {data.name}</h2>
                        <span style={{ fontSize: '0.8rem', color: isPlaying ? '#98c379' : '#777' }}>{isPlaying ? "▶ PLAYING" : status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowMasterSettings(!showMasterSettings)} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                                🎚️ Master
                            </button>
                            {showMasterSettings && (
                                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 100, background: '#181a1f', border: '1px solid #61afef', borderRadius: '4px', padding: '1rem', width: '250px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#61afef', fontSize: '0.9rem' }}>Master Bus</h4>
                                    <div><label style={{display: 'block', fontSize: '0.8rem', color: '#888'}}>Volume: {masterVolume} dB</label><input type="range" min="-30" max="10" step="1" value={masterVolume} onChange={e => setMasterVolume(parseInt(e.target.value))} style={{ width: '100%' }}/></div>
                                    <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label style={{ fontSize: '0.9rem' }}>Limiter</label><input type="checkbox" checked={limiterSettings.enabled} onChange={e => setLimiterSettings({...limiterSettings, enabled: e.target.checked})} /></div>
                                        {limiterSettings.enabled && (
                                            <div style={{marginTop: '0.5rem'}}><label style={{display: 'block', fontSize: '0.8rem', color: '#888'}}>Threshold: {limiterSettings.threshold} dB</label><input type="range" min="-40" max="0" step="1" value={limiterSettings.threshold} onChange={e => setLimiterSettings({...limiterSettings, threshold: parseInt(e.target.value)})}/></div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handleImportClick} style={{ background: 'transparent', border: '1px solid #56B6C2', color: '#56B6C2', padding: '0.5rem 1rem', borderRadius: '4px' }}>Import .lig</button>
                        <button onClick={handleClear} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px' }}>New</button>
                        <button onClick={() => setShowPianoRoll(!showPianoRoll)} style={{ background: 'transparent', border: `1px solid ${showPianoRoll ? '#61afef' : '#444'}`, color: showPianoRoll ? '#61afef' : '#888', padding: '0.5rem 1rem', borderRadius: '4px' }}>Visuals</button>
                        <button onClick={handleFormat} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.5rem 1rem', borderRadius: '4px' }}>Format</button>
                        {isPlaying ? <button onClick={handleStop} className="unequip-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>■ Stop</button> : <button onClick={handlePlay} className="save-btn" style={{ background: '#98c379', color: '#000' }}>▶ Play</button>}
                        {enableDownload && <button onClick={handleDownload} style={{ background: '#56B6C2', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', fontWeight: 'bold' }}>Download</button>}
                        {!isPlayground && <button onClick={handleSaveClick} className="save-btn">Save</button>}
                    </div>
                </div>
                
                 {showPianoRoll && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Visual Editor</label>
                        {isClient && <PianoRoll source={source} qualities={mockQualities} onChange={setSource} />}
                    </div>
                )}
                
                {lintErrors.length > 0 && (
                    <div style={{ marginBottom: '0.5rem', padding: '0.75rem', background: '#2c2525', border: '1px solid #e06c75', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                        <div style={{ color: '#e06c75', fontWeight: 'bold', fontSize: '0.75rem' }}>{lintErrors.length} Issues</div>
                        {lintErrors.map((err, i) => <div key={i} style={{fontSize: '0.8rem'}}>Ln {err.line}: {err.message}</div>)}
                    </div>
                )}

                <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                    <label className="form-label">Ligature Source Code</label>
                    {isClient && <ScribeEditor value={source} onChange={setSource} minHeight="100%" language="ligature" errors={lintErrors} />}
                </div>

                {!isPlayground && (
                    <button onClick={onDelete} className="unequip-btn" style={{ width: 'auto', marginTop: '1rem', alignSelf: 'flex-start' }}>Delete Track</button>
                )}
            </div>

            <div style={{ width: '250px', flexShrink: 0 }}>
                <InstrumentLibrary 
                    instruments={availableInstruments.filter(inst => !hideCategories.includes(inst.category || ''))}
                    onSelect={handleEditInstrument}
                />
            </div>
        </div>
    );
}