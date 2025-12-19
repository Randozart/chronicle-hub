// src/app/create/[storyId]/audio/components/ArrangementView.tsx
'use client';
import { ParsedTrack, PatternPlaylistItem } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import * as Tone from 'tone';
import { usePlaybackState } from '@/hooks/usePlaybackState';

interface Props {
    parsedTrack: ParsedTrack | null;
    onChange: (source: string) => void;
    onSelectRow: (index: number) => void;
    activeIndex: number;
    onConfigUpdate?: (key: string, value: any) => void;
}

export default function ArrangementView({ parsedTrack, onChange, onSelectRow, activeIndex, onConfigUpdate }: Props) {
    if (!parsedTrack) return <div className="p-4 text-gray-500">No track data</div>;

    const SLOT_WIDTH = 2; 
    const currentSlot = usePlaybackState(
        Tone.Transport.state === 'started',
        10000, 
        parsedTrack.config.bpm, 
        parsedTrack.config.grid, 
        parsedTrack.config.timeSig
    );
    // --- ACTIONS ---
    const handleClone = (index: number) => {
        const newPlaylist = [...parsedTrack.playlist];
        newPlaylist.splice(index + 1, 0, JSON.parse(JSON.stringify(newPlaylist[index]))); 
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
    };

    const handleDelete = (index: number) => {
        if (!confirm('Delete this entire section?')) return;
        const newPlaylist = [...parsedTrack.playlist];
        newPlaylist.splice(index, 1);
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
    };

    const handleModifyPattern = (rowIndex: number, layerIndex: number, chainIndex: number) => {
        const currentItem = (parsedTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex].items[chainIndex];
        const newId = prompt("Enter Pattern ID:", currentItem.id);
        if (newId && newId !== currentItem.id) {
            const newTrack = JSON.parse(JSON.stringify(parsedTrack));
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex].items[chainIndex].id = newId;
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleRemoveItem = (rowIndex: number, layerIndex: number, chainIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const layer = (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex];
        layer.items.splice(chainIndex, 1);
        // If layer is empty, remove layer? Let's keep it empty to allow re-adding for now, or add explicit delete layer btn
        if (layer.items.length === 0) {
             (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers.splice(layerIndex, 1);
        }
        onChange(serializeParsedTrack(newTrack));
    };

    // Append Pattern to Horizontal Chain
    const handleAddItem = (rowIndex: number, layerIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        // Prompt for ID
        const existingKeys = Object.keys(newTrack.patterns);
        const defaultId = existingKeys.length > 0 ? existingKeys[0] : 'Main';
        const patId = prompt("Enter Pattern ID to append:", defaultId);
        
        if (patId) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex].items.push({ id: patId, transposition: 0 });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    // Add New Vertical Layer
    const handleAddLayer = (rowIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const existingKeys = Object.keys(newTrack.patterns);
        const defaultId = existingKeys.length > 0 ? existingKeys[0] : 'Main';
        const patId = prompt("Enter Pattern ID for new stack:", defaultId);

        if (patId) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers.push({
                items: [{ id: patId, transposition: 0 }]
            });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleAddSection = () => {
        const firstPat = Object.keys(parsedTrack.patterns)[0] || 'Main';
        const newPlaylist = [...parsedTrack.playlist, { type: 'pattern', layers: [{ items: [{ id: firstPat, transposition: 0 }] }] }];
        // @ts-ignore
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#141414' }}>
            {/* CONFIG TOOLBAR */}
            <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem', background: '#111', borderBottom: '1px solid #333', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#666' }}>SONG CFG:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>BPM</label>
                    <input type="number" value={parsedTrack.config.bpm} onChange={(e) => onConfigUpdate?.('bpm', parseInt(e.target.value))} style={{ background: '#222', border: '1px solid #444', color: '#fff', width: '50px', padding: '2px' }}/>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Grid</label>
                    <select value={parsedTrack.config.grid} onChange={(e) => onConfigUpdate?.('grid', parseInt(e.target.value))} style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '2px' }}>{[4, 8, 12, 16, 24, 32].map(g => <option key={g} value={g}>{g}</option>)}</select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Key</label>
                    <input type="text" value={parsedTrack.config.scaleRoot} onChange={(e) => onConfigUpdate?.('scaleRoot', e.target.value)} style={{ background: '#222', border: '1px solid #444', color: '#fff', width: '30px', padding: '2px', textAlign: 'center' }}/>
                    <select value={parsedTrack.config.scaleMode} onChange={(e) => onConfigUpdate?.('scaleMode', e.target.value)} style={{ background: '#222', border: '1px solid #444', color: '#fff', padding: '2px' }}>{['Major', 'Minor', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian', 'Harmonic Minor'].map(m => <option key={m} value={m}>{m}</option>)}</select>
                </div>
            </div>

            {/* TIMELINE */}
            <div style={{ padding: '1rem', overflowX: 'auto', whiteSpace: 'nowrap', minHeight: '180px', display: 'flex', gap: '2px', alignItems: 'flex-start', position: 'relative' }}>
                
                {/* PLAYHEAD OVERLAY */}
                {Tone.Transport.state === 'started' && (
                    <div style={{
                        position: 'absolute',
                        left: `${(currentSlot * SLOT_WIDTH) + 16}px`, // +16 compensates for padding: 1rem
                        top: 0, bottom: 0,
                        width: '2px',
                        background: '#e06c75',
                        zIndex: 50,
                        boxShadow: '0 0 4px #e06c75',
                        pointerEvents: 'none'
                    }} />
                )}

                {parsedTrack.playlist.map((item, index) => {
                    const isPattern = item.type === 'pattern';
                    let maxDuration = 16;
                    let contentUI = null;

                    if (isPattern) {
                        const pItem = item as PatternPlaylistItem;
                        pItem.layers.forEach(layer => {
                            let layerDur = 0;
                            layer.items.forEach(ci => {
                                const pat = parsedTrack.patterns[ci.id];
                                if (pat) layerDur += pat.duration;
                            });
                            if (layerDur > maxDuration) maxDuration = layerDur;
                        });

                        contentUI = (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                {pItem.layers.map((layer, lIdx) => (
                                    <div key={lIdx} style={{ display: 'flex', alignItems: 'center', height: '24px', background: '#21252b', borderRadius: '2px', paddingLeft: '2px' }}>
                                        {layer.items.map((ci, cIdx) => {
                                            const pat = parsedTrack.patterns[ci.id];
                                            const dur = pat ? pat.duration : 16;
                                            return (
                                                <div 
                                                    key={cIdx} 
                                                    onClick={(e) => { e.stopPropagation(); handleModifyPattern(index, lIdx, cIdx); }}
                                                    style={{ 
                                                        width: `${dur * SLOT_WIDTH}px`, 
                                                        borderRight: '1px solid #444', 
                                                        display: 'flex', alignItems: 'center', padding: '0 4px',
                                                        fontSize: '11px', color: '#98c379', cursor: 'pointer', position:'relative',
                                                        background: activeIndex === index ? '#2c313a' : 'transparent',
                                                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'
                                                    }}
                                                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveItem(index, lIdx, cIdx); }}
                                                    title={ci.id}
                                                >
                                                    {ci.id}
                                                </div>
                                            );
                                        })}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAddItem(index, lIdx); }}
                                            style={{ border:'none', background:'transparent', color:'#555', fontSize:'14px', cursor:'pointer', padding:'0 4px', marginLeft: 'auto' }}
                                        >
                                            +
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleAddLayer(index); }}
                                    style={{ 
                                        width: '100%', height: '20px', border: '1px dashed #444', 
                                        background: 'transparent', color: '#666', fontSize: '10px', cursor: 'pointer',
                                        marginTop: '4px'
                                    }}
                                >
                                    + Stack Layer
                                </button>
                            </div>
                        );
                    } else {
                        contentUI = <div style={{ padding: '0.5rem', color: '#c678dd' }}>{item.command}</div>;
                    }

                    return (
                        <div key={index} style={{ position: 'relative' }}>
                            <div
                                onClick={() => onSelectRow(index)}
                                style={{
                                    width: `${maxDuration * SLOT_WIDTH + 60}px`,
                                    minWidth: '100px', minHeight: '120px',
                                    background: activeIndex === index ? '#333' : '#181a1f',
                                    border: activeIndex === index ? '2px solid #61afef' : '1px solid #333',
                                    borderRadius: '4px', cursor: 'default',
                                    padding: '4px'
                                }}
                            >
                                {contentUI}
                            </div>
                            <button onClick={() => handleDelete(index)} style={{ position: 'absolute', top: -8, right: -8, background: '#e06c75', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>×</button>
                        </div>
                    );
                })}
                
                <button onClick={handleAddSection} style={{ minWidth: '60px', height: '120px', border: '2px dashed #444', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: '24px', borderRadius: '4px' }}>+</button>
            </div>
        </div>
    );
}