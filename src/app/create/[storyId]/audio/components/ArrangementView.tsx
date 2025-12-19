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

const SLOT_WIDTH = 6;
const LAYER_HEIGHT = 48;
const BLOCK_GAP = 4;
const LAYER_COLORS = ['#61afef', '#c678dd', '#98c379', '#e5c07b', '#e06c75'];

export default function ArrangementView({ parsedTrack, onChange, onSelectRow, activeIndex, onConfigUpdate, isPlaying, playbackMode }: Props) {
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
                item.layers.forEach(l => {
                    const layerDur = l.items.reduce((sum, ci) => sum + (parsedTrack.patterns[ci.id]?.duration || 0), 0);
                    if (layerDur > maxLayerDuration) maxLayerDuration = layerDur;
                });
                durationInSlots = maxLayerDuration;
            }
            accumulatedSlots += durationInSlots;
            return { startSlot, durationInSlots, maxLayers };
        });
    }, [parsedTrack]);
    
    // Auto-scroll logic
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

    const handleAddSection = () => { /* ... */ };
    const handleDelete = (index: number) => { /* ... */ };
    const handleAddLayer = (rowIndex: number) => { /* ... */ };
    const handleAddItem = (rowIndex: number, layerIndex: number) => { /* ... */ }; // Restored below

    const totalTimelineSlots = playlistMetadata.length > 0
        ? playlistMetadata[playlistMetadata.length - 1].startSlot + playlistMetadata[playlistMetadata.length - 1].durationInSlots
        : 0;

    const maxLayersInSong = Math.max(1, ...playlistMetadata.map(m => m.maxLayers));
    const totalTimelineHeight = (maxLayersInSong * LAYER_HEIGHT) + 40; // Add space for buttons

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#141414' }}>
            {/* CONFIG TOOLBAR */}
            <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem', background: '#111', borderBottom: '1px solid #333', alignItems: 'center' }}>
                {/* ... config inputs ... */}
            </div>

            {/* TIMELINE */}
            <div ref={scrollContainerRef} style={{ padding: '1rem', overflowX: 'auto', minHeight: '180px', background: '#181a1f', position: 'relative' }}>
                {/* Playhead is positioned relative to the scroll container */}
                {playbackMode === 'global' && isPlaying && Tone.getTransport().state === 'started' && (
                    <div style={{ position: 'absolute', left: `${(currentSlot * SLOT_WIDTH) + 16}px`, top: 0, bottom: 0, width: '2px', background: '#e06c75', zIndex: 50 }} />
                )}

                {/* This flex container handles the layout of blocks and gaps */}
                <div style={{ display: 'flex', gap: `${BLOCK_GAP}px`, alignItems: 'flex-start', minHeight: `${totalTimelineHeight}px` }}>
                    {parsedTrack.playlist.map((item, index) => {
                        const meta = playlistMetadata[index];
                        if (item.type === 'command') return null;

                        const pItem = item as PatternPlaylistItem;
                        const blockWidth = meta.durationInSlots * SLOT_WIDTH;

                        return (
                            <div 
                                key={index}
                                onClick={() => onSelectRow(index)}
                                style={{
                                    position: 'relative',
                                    width: `${blockWidth}px`,
                                    minHeight: '120px',
                                    background: '#1c1c1c',
                                    border: `1px solid ${activeIndex === index ? '#61afef' : '#333'}`,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    overflow: 'hidden' // Prevents clips from drawing outside the block
                                }}
                            >
                                {pItem.layers.map((layer, lIdx) => (
                                    <div 
                                        key={lIdx} 
                                        style={{ 
                                            position: 'relative', 
                                            height: `${LAYER_HEIGHT}px`,
                                            display: 'flex',
                                            borderBottom: lIdx < pItem.layers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                            background: '#21252b',
                                            borderRadius: '2px',
                                            marginBottom: '2px'
                                        }}
                                    >
                                        {layer.items.map((ci, cIdx) => {
                                            const pat = parsedTrack.patterns[ci.id];
                                            if (!pat) return null;
                                            return (
                                                <div key={cIdx} title={`${ci.id} (+${ci.transposition})`}>
                                                    <ArrangementClip 
                                                        pattern={pat}
                                                        totalDuration={pat.duration}
                                                        color={LAYER_COLORS[lIdx % LAYER_COLORS.length]}
                                                        slotWidth={SLOT_WIDTH}
                                                        config={parsedTrack.config}
                                                        noteRange={{min: 48, max: 84}}
                                                    />
                                                </div>
                                            );
                                        })}
                                        {/* RESTORED "ADD ITEM" BUTTON */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAddItem(index, lIdx); }} 
                                            style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', border:'none', background:'rgba(0,0,0,0.3)', color:'#888', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor:'pointer' }}
                                        >+</button>
                                    </div>
                                ))}
                                <button onClick={(e) => { e.stopPropagation(); handleAddLayer(index); }} style={{ width: '100%', height: '20px', border: '1px dashed #444', background: 'transparent', color: '#666', fontSize: '10px', cursor: 'pointer', marginTop: '4px' }}>+ Stack Layer</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(index); }} style={{ position: 'absolute', top: -8, right: -8, background: '#e06c75', color: '#fff', border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>×</button>
                            </div>
                        );
                    })}
                    
                    <button onClick={handleAddSection} style={{ width: '60px', height: '120px', border: '2px dashed #444', background: 'transparent', color: '#666', cursor: 'pointer', fontSize: '24px', borderRadius: '4px', flexShrink: 0 }}>+</button>
                </div>
            </div>
        </div>
    );
}