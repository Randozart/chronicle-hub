import { useRef, useEffect } from 'react';
import { ParsedPattern, ParsedTrack, SequenceEvent, NoteDef } from '@/engine/audio/models';
import { Note, Scale } from 'tonal';
import { resolveNote } from '@/engine/audio/scales';

interface Props {
    gridRef: React.RefObject<HTMLDivElement | null>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onNoteMouseDown: (e: React.MouseEvent, trackName: string, evtIdx: number, noteIdx: number) => void;
    
    // Data
    pattern: ParsedPattern;
    config: ParsedTrack['config'];
    activeLane: string;
    noteRange: number[];
    minMidi: number;
    
    // Viewport
    width: number;
    height: number;
    slotW: number;
    rowH: number;
    scalePCs: string[];
    
    // State
    currentSlot: number;
    isPlaying: boolean;
    selectionRect: { startX: number, startY: number, currentX: number, currentY: number } | null;
    selectedNotes: Set<string>;
    dragState: any;
    dragDelta: { slots: number, rows: number };
    
    // Virtualization
    scrollLeft: number;
    scrollTop: number;
    viewWidth: number;
    viewHeight: number;
}

// Helper: Deterministic Random
function pseudoRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

const getNoteId = (track: string, evtIdx: number, noteIdx: number) => `${track}:${evtIdx}:${noteIdx}`;

export default function PianoRollGrid({
    gridRef, onScroll, onMouseDown, onNoteMouseDown,
    pattern, config, activeLane, noteRange, minMidi,
    width, height, slotW, rowH, scalePCs,
    currentSlot, isPlaying, selectionRect, selectedNotes, dragState, dragDelta,
    scrollLeft, scrollTop, viewWidth, viewHeight
}: Props) {

    const midiToRow = (midi: number) => noteRange.length - 1 - (midi - minMidi);
    
    const isTrackInActiveGroup = (trackName: string) => {
        return trackName === activeLane || trackName.startsWith(`${activeLane}_#`);
    };

    const getPerformanceTime = (time: number, swing: number, humanize: number, seed: number) => {
        let shift = 0;
        if (swing > 0 && Math.floor(time) % 2 !== 0) shift += swing * 0.33;
        if (humanize > 0) shift += (pseudoRandom(seed) - 0.5) * 0.1 * humanize;
        return time + shift;
    };

    const slotsPerBeat = config.grid * (4 / config.timeSig[1]);
    const barW = slotW * slotsPerBeat * config.timeSig[0];

    const allTrackKeys = Object.keys(pattern.tracks);

    return (
        <div 
            ref={gridRef}
            className="pianoroll-grid-viewport" 
            onScroll={onScroll}
        >
            <div 
                className="pianoroll-grid-content"
                style={{ 
                    width: width, 
                    height: height,
                    backgroundSize: `${slotW}px ${rowH}px, ${barW}px ${rowH}px`
                }}
                onMouseDown={onMouseDown}
                onContextMenu={(e) => e.preventDefault()}
            >
                {/* Selection Marquee */}
                {selectionRect && (
                    <div className="pianoroll-selection-marquee" style={{
                        left: Math.min(selectionRect.startX, selectionRect.currentX),
                        top: Math.min(selectionRect.startY, selectionRect.currentY),
                        width: Math.abs(selectionRect.currentX - selectionRect.startX),
                        height: Math.abs(selectionRect.currentY - selectionRect.startY)
                    }} />
                )}

                {/* Playhead */}
                {isPlaying && (
                    <div className="pianoroll-playhead" style={{ left: currentSlot * slotW }} />
                )}

                {/* Background Rows */}
                {noteRange.slice().reverse().map((midi, rowIdx) => {
                    const rowTop = rowIdx * rowH;
                    if (rowTop < scrollTop - rowH || rowTop > scrollTop + viewHeight) return null;
                    return scalePCs.includes(Note.pitchClass(Note.fromMidi(midi))) ? (
                        <div key={midi} style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: rowH, background: 'rgba(97, 175, 239, 0.08)', pointerEvents: 'none' }} />
                    ) : null;
                })}

                {/* Events */}
                {allTrackKeys.map(trackName => {
                    const isInActiveGroup = isTrackInActiveGroup(trackName);
                    
                    return pattern.tracks[trackName].map((event, eventIdx) => {
                        const leftPos = event.time * slotW;
                        const widthPx = event.duration * slotW;
                        
                        // Virtualization
                        if (leftPos + widthPx < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) return null;

                        const isChord = event.notes.length > 1;
                        const swingAmount = config.swing || 0;
                        const humanizeAmount = config.humanize || 0;
                        const hasPerf = isInActiveGroup && (swingAmount > 0 || humanizeAmount > 0);

                        return event.notes.map((note, noteIdx) => {
                            const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural));
                            if (!midi || !noteRange.includes(midi)) return null;
                            
                            const topPos = midiToRow(midi) * rowH;
                            if (topPos < scrollTop - rowH || topPos > scrollTop + viewHeight) return null;

                            const id = getNoteId(trackName, eventIdx, noteIdx);
                            const isSelected = selectedNotes.has(id);
                            
                            const showGhost = dragState && isSelected && dragState.type !== 'automation';
                            
                            const hasMods = (note.volume !== undefined && note.volume !== 0);
                            let bgColor = '#444'; 
                            let zIndex = 1;
                            let pointerEvents: 'auto' | 'none' = 'none';

                            if (isInActiveGroup) {
                                pointerEvents = 'auto';
                                zIndex = 10;
                                bgColor = isChord ? '#98c379' : '#61afef';
                                if (hasMods) bgColor = isChord ? '#b8e39a' : '#8ccceb';
                                if (isSelected) { bgColor = '#fff'; zIndex = 20; }
                            }

                            // Shadow Logic
                            let shadowLeft = 0, showShadow = false;
                            if (hasPerf) {
                                const seed = event.time + midi + (noteIdx * 50);
                                const perfTime = getPerformanceTime(event.time, swingAmount, humanizeAmount, seed);
                                shadowLeft = perfTime * slotW;
                                if (Math.abs(shadowLeft - leftPos) > 1) showShadow = true;
                            }

                            return (
                                <div key={id}>
                                    {showGhost && (
                                        <div className="pianoroll-note-ghost" style={{
                                            left: (event.time + dragDelta.slots) * slotW + 1,
                                            top: (midiToRow(midi + dragDelta.rows)) * rowH + 1,
                                            width: (dragState.type === 'resize' ? Math.max(0.25, event.duration + dragDelta.slots) : event.duration) * slotW - 2,
                                            height: rowH - 2
                                        }} />
                                    )}
                                    
                                    {showShadow && !showGhost && (
                                        <div className="pianoroll-note-performance-shadow" style={{
                                            left: shadowLeft + 1, top: topPos + 1, width: widthPx - 2, height: rowH - 2,
                                            borderColor: bgColor 
                                        }} />
                                    )}

                                    <div 
                                        onMouseDown={(e) => isInActiveGroup && onNoteMouseDown(e, trackName, eventIdx, noteIdx)}
                                        className={`pianoroll-note ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            left: leftPos + 1, top: topPos + 1, width: widthPx - 2, height: rowH - 2,
                                            background: bgColor, zIndex, pointerEvents,
                                            opacity: showGhost ? 0.3 : (isInActiveGroup ? 1 : 0.4)
                                        }}>
                                        {hasMods && isInActiveGroup && (note.volume ? `v${note.volume}` : 'FX')}
                                        {isInActiveGroup && <div className="pianoroll-note-handle" />}
                                    </div>
                                </div>
                            );
                        });
                    });
                })}
            </div>
        </div>
    );
}