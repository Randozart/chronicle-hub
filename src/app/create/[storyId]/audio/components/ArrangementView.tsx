'use client';

import { ParsedTrack, PatternPlaylistItem } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { useGlobalPlaybackState } from '@/hooks/useGlobalPlaybackState';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArrangementClip from './ArrangementClip';
import AudioContextMenu from '@/components/admin/AudioContextMenu';

interface Props {
    parsedTrack: ParsedTrack | null;
    onChange: (source: string) => void;
    onSelectRow: (index: number) => void;
    activeIndex: number;
    onConfigUpdate?: (key: string, value: any) => void;
    onPatternAction?: (action: string, patternId: string) => void;
    isPlaying: boolean;
    playbackMode: 'global' | 'local' | 'stopped';
}

const SLOT_WIDTH = 4;
const LAYER_HEIGHT = 48;
const BLOCK_GAP = 4;
const LAYER_COLORS = ['#61afef', '#c678dd', '#98c379', '#e5c07b', '#e06c75'];

export default function ArrangementView({
    parsedTrack,
    onChange,
    onSelectRow,
    activeIndex,
    onConfigUpdate,
    onPatternAction,
    isPlaying,
    playbackMode
}: Props) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, patternId: string } | null>(null);
    const config = parsedTrack?.config || { bpm: 120, grid: 4, timeSig: [4, 4] as [number, number], scaleRoot: 'C', scaleMode: 'Major', swing: 0, humanize: 0 };
    const currentSlot = useGlobalPlaybackState(
        isPlaying && playbackMode === 'global',
        config.bpm,
        config.grid,
        config.timeSig
    );
    const playlistMetadata = useMemo(() => {
        if (!parsedTrack) return []; 

        let accumulatedSlots = 0;
        return parsedTrack.playlist.map(item => {
            let durationInSlots = 0;
            let maxLayers = 0;

            if (item.type === 'pattern') {
                maxLayers = item.layers.length;
                let maxLayerDuration = 0;
                item.layers.forEach(layer => {
                    const d = layer.items.reduce(
                        (sum, ci) => sum + (parsedTrack.patterns[ci.id]?.duration || 0),
                        0
                    );
                    maxLayerDuration = Math.max(maxLayerDuration, d);
                });
                durationInSlots = maxLayerDuration;
            }

            const startSlot = accumulatedSlots;
            accumulatedSlots += durationInSlots;

            return { startSlot, durationInSlots, maxLayers };
        });
    }, [parsedTrack]);
    const playheadLeftPx = useMemo(() => {
        if (!isPlaying && currentSlot === 0) return 0;
        
        let accumulated = 0;
        let slotsSoFar = 0;

        for (let i = 0; i < playlistMetadata.length; i++) {
            const meta = playlistMetadata[i];
            if (currentSlot < slotsSoFar + meta.durationInSlots) {
                const slotInBlock = currentSlot - slotsSoFar;
                return accumulated + slotInBlock * SLOT_WIDTH;
            }
            accumulated += meta.durationInSlots * SLOT_WIDTH + BLOCK_GAP;
            slotsSoFar += meta.durationInSlots;
        }
        return accumulated;
    }, [currentSlot, playlistMetadata, isPlaying]);
    useEffect(() => {
        if (isPlaying && playbackMode === 'global' && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const containerWidth = container.clientWidth;
            if (playheadLeftPx > containerWidth / 2) {
                container.scrollLeft = playheadLeftPx - containerWidth / 2;
            }
        }
    }, [playheadLeftPx, isPlaying, playbackMode]);

    if (!parsedTrack) return <div className="p-4 text-gray-500">No track data</div>;
    const updateConfig = (key: string, value: any) => {
        if (onConfigUpdate) onConfigUpdate(key, value);
    };

    const handleMove = (index: number, dir: 'left' | 'right') => {
        const target = dir === 'left' ? index - 1 : index + 1;
        if (target < 0 || target >= parsedTrack.playlist.length) return;

        const newPlaylist = [...parsedTrack.playlist];
        const [item] = newPlaylist.splice(index, 1);
        newPlaylist.splice(target, 0, item);

        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
        onSelectRow(target);
    };

    const handleDelete = (index: number) => {
        if (!confirm('Delete this section?')) return;
        const newPlaylist = [...parsedTrack.playlist];
        newPlaylist.splice(index, 1);
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
        if (activeIndex === index) onSelectRow(Math.max(0, index - 1));
    };

    const handleAddLayer = (rowIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const patId = prompt('Enter Pattern ID for new stack:', Object.keys(newTrack.patterns)[0] || 'Main');
        if (patId && newTrack.patterns[patId]) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers.push({ items: [{ id: patId, transposition: 0 }] });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleAddItem = (rowIndex: number, layerIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const patId = prompt('Enter Pattern ID to append:', Object.keys(newTrack.patterns)[0] || 'Main');
        if (patId && newTrack.patterns[patId]) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex].items.push({ id: patId, transposition: 0 });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleAddSection = () => {
        const firstPat = Object.keys(parsedTrack.patterns)[0] || 'Main';
        const newPlaylist = [
            ...parsedTrack.playlist,
            { type: 'pattern', layers: [{ items: [{ id: firstPat, transposition: 0 }] }] }
        ];
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
    };

    const handlePatternRightClick = (e: React.MouseEvent, patternId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, patternId });
    };

    const maxLayersInSong = Math.max(1, ...playlistMetadata.map(m => m.maxLayers));
    const totalTimelineHeight = (maxLayersInSong * (LAYER_HEIGHT + 2)) + 60;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#141414' }}>
            <div className="settings-bar">
                <div className="settings-group">
                    <span className="settings-label">BPM</span>
                    <input 
                        type="number" className="settings-input" 
                        value={config.bpm} 
                        onChange={e => updateConfig('bpm', parseFloat(e.target.value))} 
                    />
                </div>
                <div className="settings-group">
                    <span className="settings-label">Grid</span>
                    <select 
                        className="settings-select"
                        value={config.grid}
                        onChange={e => updateConfig('grid', parseInt(e.target.value))}
                    >
                        {[4, 6, 8, 12, 16, 24, 32].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="settings-group">
                    <span className="settings-label">Key</span>
                    <select 
                        className="settings-select"
                        value={config.scaleRoot}
                        onChange={e => updateConfig('scaleRoot', e.target.value)}
                    >
                        {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <select 
                        className="settings-select"
                        value={config.scaleMode}
                        onChange={e => updateConfig('scaleMode', e.target.value)}
                    >
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Dorian">Dorian</option>
                        <option value="Phrygian">Phrygian</option>
                        <option value="Lydian">Lydian</option>
                        <option value="Mixolydian">Mixolydian</option>
                    </select>
                </div>
                <div className="settings-group">
                    <span className="settings-label">Swing %</span>
                    <input 
                        type="number" className="settings-input" min="0" max="100"
                        value={Math.round((config.swing || 0) * 100)} 
                        onChange={e => updateConfig('swing', parseInt(e.target.value) / 100)} 
                    />
                </div>
                <div className="settings-group">
                    <span className="settings-label">Humanize %</span>
                    <input 
                        type="number" className="settings-input" min="0" max="100"
                        value={Math.round((config.humanize || 0) * 100)} 
                        onChange={e => updateConfig('humanize', parseInt(e.target.value) / 100)} 
                    />
                </div>
            </div>
            <div
                ref={scrollContainerRef}
                style={{
                    padding: '1rem',
                    overflowX: 'auto',
                    minHeight: '180px',
                    background: 'var(--tool-bg-input)',
                    position: 'relative'
                }}
            >
                {playbackMode === 'global' && isPlaying && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${playheadLeftPx + 16}px`, 
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: '#e06c75',
                            zIndex: 50,
                            pointerEvents: 'none'
                        }}
                    />
                )}

                <div style={{ display: 'flex', gap: BLOCK_GAP, alignItems: 'flex-start', minHeight: totalTimelineHeight }}>
                    {parsedTrack.playlist.map((item, index) => {
                        if (item.type === 'command') return null;
                        const meta = playlistMetadata[index];
                        const pItem = item as PatternPlaylistItem;
                        const blockWidth = meta.durationInSlots * SLOT_WIDTH;

                        return (
                            <div key={index} style={{ position: 'relative', flexShrink: 0 }}>
                                <div
                                    onClick={() => onSelectRow(index)}
                                    style={{
                                        width: blockWidth,
                                        background: '#1c1c1c',
                                        border: `1px solid ${activeIndex === index ? '#61afef' : '#333'}`,
                                        borderRadius: 4,
                                        padding: 4,
                                        cursor: 'pointer',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {pItem.layers.map((layer, lIdx) => (
                                        <div
                                            key={lIdx}
                                            style={{
                                                height: LAYER_HEIGHT,
                                                display: 'flex',
                                                background: 'var(--tool-bg-header)',
                                                marginBottom: 2,
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex' }}>
                                                {layer.items.map((ci, cIdx) => {
                                                    const pat = parsedTrack.patterns[ci.id];
                                                    if (!pat) return null;

                                                    return (
                                                        <div 
                                                            key={cIdx} 
                                                            style={{ width: pat.duration * SLOT_WIDTH, height: '100%' }}
                                                            onContextMenu={(e) => handlePatternRightClick(e, pat.id)}
                                                        >
                                                            <ArrangementClip
                                                                pattern={pat}
                                                                totalDuration={pat.duration}
                                                                slotWidth={SLOT_WIDTH}
                                                                color={LAYER_COLORS[lIdx % LAYER_COLORS.length]}
                                                                config={parsedTrack.config}
                                                                noteRange={{ min: 48, max: 84 }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAddItem(index, lIdx); }}
                                                style={{
                                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                                    border: 'none', background: 'rgba(0,0,0,0.3)', color: '#888',
                                                    borderRadius: '50%', width: 18, height: 18,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', zIndex: 10
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAddLayer(index); }}
                                        style={{
                                            width: '100%', height: 20, border: '1px dashed #444',
                                            background: 'transparent', color: '#666', fontSize: 10,
                                            cursor: 'pointer', marginTop: 4
                                        }}
                                    >
                                        + Stack Layer
                                    </button>
                                </div>

                                {activeIndex === index && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 4, padding: '0 4px' }}>
                                        <button onClick={e => { e.stopPropagation(); handleMove(index, 'left'); }} disabled={index === 0} style={{ padding: '2px 8px', background: '#333', color: 'var(--tool-text-header)', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: index === 0 ? 0.3 : 1 }}>←</button>
                                        <button onClick={e => { e.stopPropagation(); handleMove(index, 'right'); }} disabled={index === parsedTrack.playlist.length - 1} style={{ padding: '2px 8px', background: '#333', color: 'var(--tool-text-header)', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: index === parsedTrack.playlist.length - 1 ? 0.3 : 1 }}>→</button>
                                    </div>
                                )}

                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                    style={{
                                        position: 'absolute', top: -8, right: -8,
                                        background: '#e06c75', color: 'var(--tool-text-header)', border: 'none',
                                        borderRadius: '50%', width: 16, height: 16, fontSize: 10,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 20
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}

                    <button
                        onClick={handleAddSection}
                        style={{
                            width: 60, height: 120, border: '2px dashed #444',
                            background: 'transparent', color: '#666', cursor: 'pointer',
                            fontSize: 24, borderRadius: 4, flexShrink: 0
                        }}
                    >
                        +
                    </button>
                </div>
            </div>
            {contextMenu && (
                <AudioContextMenu 
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    options={[
                        { label: `Operations for: ${contextMenu.patternId}`, action: () => {} },
                        { label: 'x2 Speed (Double Tempo)', action: () => onPatternAction?.('double_speed', contextMenu.patternId) },
                        { label: '/2 Speed (Half Tempo)', action: () => onPatternAction?.('half_speed', contextMenu.patternId) },
                    ]}
                />
            )}
        </div>
    );
}