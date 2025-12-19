'use client';
import { ParsedTrack, PatternPlaylistItem } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import * as Tone from 'tone';
import { useGlobalPlaybackState } from '@/hooks/useGlobalPlaybackState';
import { useEffect, useMemo, useRef } from 'react';
import ArrangementClip from './ArrangementClip';

interface Props {
    parsedTrack: ParsedTrack | null;
    onChange: (source: string) => void;
    onSelectRow: (index: number) => void;
    activeIndex: number;
    onConfigUpdate?: (key: string, value: any) => void;
    isPlaying: boolean;
    playbackMode: 'global' | 'local' | 'stopped';
}

const SLOT_WIDTH = 4; // Using a smaller value as it scales better
const LAYER_HEIGHT = 48;
const BLOCK_GAP = 4;
const LAYER_COLORS = ['#61afef', '#c678dd', '#98c379', '#e5c07b', '#e06c75'];

export default function ArrangementView({
    parsedTrack,
    onChange,
    onSelectRow,
    activeIndex,
    onConfigUpdate, // Added onConfigUpdate to the destructuring
    isPlaying,
    playbackMode
}: Props) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    if (!parsedTrack) return <div className="p-4 text-gray-500">No track data</div>;

    const currentSlot = useGlobalPlaybackState(
        isPlaying && playbackMode === 'global',
        parsedTrack.config.bpm,
        parsedTrack.config.grid,
        parsedTrack.config.timeSig
    );

    const playlistMetadata = useMemo(() => {
        let accumulatedSlots = 0;
        return parsedTrack.playlist.map(item => {
            const startSlot = accumulatedSlots;
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

            accumulatedSlots += durationInSlots;
            return { startSlot, durationInSlots, maxLayers };
        });
    }, [parsedTrack]);

    useEffect(() => {
        if (isPlaying && playbackMode === 'global' && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const playheadLeftPx = currentSlot * SLOT_WIDTH;
            const containerWidth = container.clientWidth;
            const scrollLeft = container.scrollLeft;

            if (playheadLeftPx < scrollLeft + 50 || playheadLeftPx > scrollLeft + containerWidth - 50) {
                container.scrollTo({ left: playheadLeftPx - (containerWidth / 2), behavior: 'smooth' });
            }
        }
    }, [currentSlot, isPlaying, playbackMode]);

    // --- ALL ACTION HANDLERS ARE NOW FULLY IMPLEMENTED ---
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
        if (!confirm('Delete this entire section?')) return;
        const newPlaylist = [...parsedTrack.playlist];
        newPlaylist.splice(index, 1);
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist }));
        if (activeIndex === index) onSelectRow(Math.max(0, index - 1));
    };

    const handleAddLayer = (rowIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const patId = prompt("Enter Pattern ID for new stack:", Object.keys(newTrack.patterns)[0] || 'Main');
        if (patId && newTrack.patterns[patId]) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers.push({ items: [{ id: patId, transposition: 0 }] });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleAddItem = (rowIndex: number, layerIndex: number) => {
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const patId = prompt("Enter Pattern ID to append:", Object.keys(newTrack.patterns)[0] || 'Main');
        if (patId && newTrack.patterns[patId]) {
            (newTrack.playlist[rowIndex] as PatternPlaylistItem).layers[layerIndex].items.push({ id: patId, transposition: 0 });
            onChange(serializeParsedTrack(newTrack));
        }
    };

    const handleAddSection = () => {
        const firstPat = Object.keys(parsedTrack.patterns)[0] || 'Main';
        const newPlaylist = [...parsedTrack.playlist, { type: 'pattern', layers: [{ items: [{ id: firstPat, transposition: 0 }] }] }];
        onChange(serializeParsedTrack({ ...parsedTrack, playlist: newPlaylist as any }));
    };

    const maxLayersInSong = Math.max(1, ...playlistMetadata.map(m => m.maxLayers));
    const totalTimelineHeight = (maxLayersInSong * (LAYER_HEIGHT + 2)) + 60;

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
            <div
                ref={scrollContainerRef}
                style={{
                    padding: '1rem',
                    overflowX: 'auto',
                    minHeight: '180px',
                    background: '#181a1f',
                    position: 'relative'
                }}
            >
                {playbackMode === 'global' && isPlaying && Tone.getTransport().state === 'started' && (
                    <div style={{ position: 'absolute', left: `${currentSlot * SLOT_WIDTH + 16}px`, top: 0, bottom: 0, width: '2px', background: '#e06c75', zIndex: 50 }} />
                )}

                <div style={{ display: 'flex', gap: `${BLOCK_GAP}px`, alignItems: 'flex-start', minHeight: `${totalTimelineHeight}px` }}>
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
                                        border: `1px solid ${
                                            activeIndex === index ? '#61afef' : '#333'
                                        }`,
                                        borderRadius: '4px',
                                        padding: '4px',
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
                                                background: '#21252b',
                                                marginBottom: 2,
                                                position: 'relative' // Added for the + button positioning
                                            }}
                                        >
                                            <div style={{display: 'flex'}}>
                                                {layer.items.map((ci, cIdx) => {
                                                    const pat = parsedTrack.patterns[ci.id];
                                                    if (!pat) return null;

                                                    return (
                                                        <div
                                                            key={cIdx}
                                                            style={{
                                                                width: pat.duration * SLOT_WIDTH,
                                                                height: '100%'
                                                            }}
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
                                                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', border:'none', background:'rgba(0,0,0,0.3)', color:'#888', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor:'pointer', zIndex: 10 }}
                                            >+</button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleAddLayer(index); }}
                                        style={{
                                            width: '100%',
                                            height: 20,
                                            border: '1px dashed #444',
                                            background: 'transparent',
                                            color: '#666',
                                            fontSize: 10,
                                            cursor: 'pointer',
                                            marginTop: '4px'
                                        }}
                                    >
                                        + Stack Layer
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(index); }}
                                    style={{ position: 'absolute', top: -8, right: -8, background: '#e06c75', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}
                                >×</button>

                                {/* MOVE BUTTONS — ONLY SHOW FOR THE ACTIVE BLOCK */}
                                {activeIndex === index && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 6,
                                            marginTop: 4,
                                            padding: '0 4px'
                                        }}
                                    >
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleMove(index, 'left');
                                            }}
                                            disabled={index === 0}
                                            style={{
                                                padding: '2px 8px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: index === 0 ? 0.3 : 1
                                            }}
                                        >
                                            &lt;
                                        </button>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                handleMove(index, 'right');
                                            }}
                                            disabled={index === parsedTrack.playlist.length - 1}
                                            style={{
                                                padding: '2px 8px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: index === parsedTrack.playlist.length - 1 ? 0.3 : 1
                                            }}
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                     <button onClick={handleAddSection} style={{ width: '60px', height: '120px', border: '2px dashed #444', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: '24px', borderRadius: '4px', flexShrink: 0 }}>+</button>
                </div>
            </div>
        </div>
    );
}