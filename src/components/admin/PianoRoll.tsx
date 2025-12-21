'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
// import '@/app/tools.css'; // Ensure this is imported in layout or parent

import { ParsedTrack, SequenceEvent, NoteDef, InstrumentDefinition } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { PlayerQualities } from '@/engine/models';
import { resolveNote } from '@/engine/audio/scales';
import { Note, Scale } from 'tonal';
import { LigatureParser } from '@/engine/audio/parser';
import * as Tone from 'tone';
import { usePlaybackState } from '@/hooks/usePlaybackState';
import { useAudio } from '@/providers/AudioProvider';

interface Props {
    source: string;
    qualities?: PlayerQualities;
    onChange: (newSource: string) => void;
    availableInstruments: InstrumentDefinition[]; 
    playbackMode: 'global' | 'local' | 'stopped';
    onPlaybackModeChange: (mode: 'global' | 'local' | 'stopped') => void;
}

const SLOT_W = 24;
const ROW_H = 16; 
const SCALE_BG = 'rgba(97, 175, 239, 0.08)'; 

type AutoMode = 'volume' | 'pan' | 'fade' | 'swell';

// Deterministic Random for Visuals
function pseudoRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Helper to generate unique IDs for notes in the selection Set
const getNoteId = (track: string, evtIdx: number, noteIdx: number) => `${track}:${evtIdx}:${noteIdx}`;

export default function PianoRoll({ source, qualities, onChange, availableInstruments, playbackMode, onPlaybackModeChange }: Props) {
    // --- STATE ---
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [activeLane, setActiveLane] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const [height, setHeight] = useState(400); 
    
    // Virtualization State
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewWidth, setViewWidth] = useState(800);
    const gridRef = useRef<HTMLDivElement>(null);
    const keysRef = useRef<HTMLDivElement>(null);
    const autoRef = useRef<HTMLDivElement>(null);

    // Selection & Editing State
    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
    
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize' | 'automation';
        startX: number;
        startY: number;
        // For automation (single target only)
        trackName?: string;
        eventIndex?: number;
        originalVal?: number;
    } | null>(null);

    // Global Delta for Ghost Rendering (applied to all selected notes)
    const [dragDelta, setDragDelta] = useState<{ slots: number, rows: number }>({ slots: 0, rows: 0 });

    // Automation State
    const [showAutomation, setShowAutomation] = useState(false);
    const [autoHeight, setAutoHeight] = useState(140);
    const [autoMode, setAutoMode] = useState<AutoMode>('volume');
    const { playTrack, stop: audioStop, isPlaying } = useAudio();

    // --- PARSING ---
    useEffect(() => {
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source, qualities);
            setParsedTrack(track);
            
            // Auto-select first pattern if none selected
            const patternKeys = Object.keys(track.patterns);
            if (patternKeys.length > 0) {
                if (!selectedPatternId || !track.patterns[selectedPatternId]) {
                    const firstPat = patternKeys[0];
                    setSelectedPatternId(firstPat);
                    const lanes = Object.keys(track.patterns[firstPat].tracks);
                    if (lanes.length > 0) setActiveLane(lanes[0]);
                }
            }
        } catch (e) { }
    }, [source, qualities]);

    // --- CALCULATIONS ---
    const activePattern = parsedTrack?.patterns[selectedPatternId];
    const config = parsedTrack?.config;
    const currentSlot = usePlaybackState(isPlaying, activePattern?.duration || 0, config?.bpm || 120, config?.grid || 4, config?.timeSig || [4,4]);

    const scalePCs = useMemo(() => config ? Scale.get(`${config.scaleRoot} ${config.scaleMode.toLowerCase()}`).notes : [], [config]);
    const { noteRange, minMidi } = useMemo(() => {
        if (!activePattern || !config) return { noteRange: [], minMidi: 48 };
        const min = 36; const max = 96; 
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return { noteRange: range, minMidi: min };
    }, [activePattern, config]);
    const midiToRow = (midi: number) => noteRange.length - 1 - (midi - minMidi);

    // --- HANDLERS ---

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollLeft(target.scrollLeft);
        setScrollTop(target.scrollTop);
        if (keysRef.current) keysRef.current.scrollTop = target.scrollTop;
        if (autoRef.current) autoRef.current.scrollLeft = target.scrollLeft;
    };

    // Initial width measurement
    useEffect(() => {
        if (gridRef.current) setViewWidth(gridRef.current.clientWidth);
    }, []);

    // 1. Grid Interaction (Place Note / Start Selection)
    const handleGridMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (!parsedTrack || !selectedPatternId || !activeLane) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const localX = e.clientX - rect.left; 
        const localY = e.clientY - rect.top;
        const absX = localX + scrollLeft; // Account for scroll
        
        // If clicking empty space:
        // A) If Shift held: Add note
        // B) If no modifier: Clear selection + Start Marquee
        
        if (e.shiftKey) {
            // Add Note Logic
            const clickedSlot = Math.floor(absX / SLOT_W);
            const row = Math.floor(localY / ROW_H);
            if(row < 0 || row >= noteRange.length) return;
            const midi = noteRange[noteRange.length - 1 - row];

            const newTrack = JSON.parse(JSON.stringify(parsedTrack));
            const pattern = newTrack.patterns[selectedPatternId];
            if (!pattern.tracks[activeLane]) pattern.tracks[activeLane] = [];
            
            const noteDef = resolveScaleDegree(midi, config!.scaleRoot, config!.scaleMode);
            pattern.tracks[activeLane].push({ time: clickedSlot, duration: 1, notes: [noteDef] });
            pattern.tracks[activeLane].sort((a: SequenceEvent, b: SequenceEvent) => a.time - b.time);
            
            onChange(serializeParsedTrack(newTrack));
        } else {
            // Marquee Logic
            setSelectedNotes(new Set()); // Deselect all
            setSelectionRect({ 
                startX: localX + scrollLeft, 
                startY: localY + scrollTop, 
                currentX: localX + scrollLeft, 
                currentY: localY + scrollTop 
            });
        }
    };

    // 2. Note Interaction (Select / Drag)
    const handleNoteMouseDown = (e: React.MouseEvent, trackName: string, evtIdx: number, noteIdx: number) => {
        e.stopPropagation();
        
        // Right Click: Delete
        if (e.button === 2) {
            e.preventDefault();
            const newTrack = JSON.parse(JSON.stringify(parsedTrack));
            const ev = newTrack.patterns[selectedPatternId].tracks[trackName][evtIdx];
            if (ev.notes.length > 1) ev.notes.splice(noteIdx, 1);
            else newTrack.patterns[selectedPatternId].tracks[trackName].splice(evtIdx, 1);
            
            onChange(serializeParsedTrack(newTrack));
            return;
        }

        const id = getNoteId(trackName, evtIdx, noteIdx);
        const isSelected = selectedNotes.has(id);
        const newSelection = new Set(e.shiftKey || e.ctrlKey ? selectedNotes : []);

        if (!isSelected && !e.shiftKey && !e.ctrlKey) {
            // Clicked unselected note without modifier -> Select ONLY this
            newSelection.clear();
            newSelection.add(id);
        } else {
            newSelection.add(id);
        }
        setSelectedNotes(newSelection);

        // Setup Drag
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isResize = (e.clientX - rect.left) > rect.width - 10;
        
        setDragState({
            type: isResize ? 'resize' : 'move',
            startX: e.clientX,
            startY: e.clientY
        });
        setDragDelta({ slots: 0, rows: 0 });
    };

    const handleAutomationMouseDown = (e: React.MouseEvent, trackName: string, eventIndex: number, currentVal: number) => { 
        e.stopPropagation();
        setDragState({
            type: 'automation',
            startX: e.clientX,
            startY: e.clientY,
            trackName,
            eventIndex,
            originalVal: currentVal
        });
        // We use Ghost State for Automation just like before, but simplified
        // Actually, let's reuse dragDelta logic for visual consistency if possible, 
        // but automation is a different beast (value vs time/pitch).
        // Let's stick to using dragDelta.rows as a proxy for value change?
        setDragDelta({ slots: 0, rows: 0 }); 
    };

    // --- GLOBAL MOUSE LISTENERS (Drag & Marquee) ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // 1. Marquee Update
            if (selectionRect) {
                if (!gridRef.current) return;
                const rect = gridRef.current.getBoundingClientRect();
                const scrollX = gridRef.current.scrollLeft;
                const scrollY = gridRef.current.scrollTop;
                
                setSelectionRect(prev => prev ? { 
                    ...prev, 
                    currentX: (e.clientX - rect.left) + scrollX, 
                    currentY: (e.clientY - rect.top) + scrollY 
                } : null);
                return;
            }

            // 2. Drag Update
            if (!dragState) return;
            
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            if (dragState.type === 'automation') {
                // Automation uses pixel delta directly for value
                const dVal = -deltaY * 0.5; // Sensitivity
                // Store in rows for simplicity, though semantically wrong
                setDragDelta({ slots: 0, rows: dVal }); 
            } else {
                const dSlots = Math.round(deltaX / SLOT_W);
                const dRows = Math.round(deltaY / ROW_H);
                setDragDelta({ slots: dSlots, rows: -dRows }); // -rows because Y grows down, Pitch grows up
            }
        };

        const handleMouseUp = () => {
            // 1. Finalize Marquee Selection
            if (selectionRect && parsedTrack && selectedPatternId) {
                const x1 = Math.min(selectionRect.startX, selectionRect.currentX);
                const x2 = Math.max(selectionRect.startX, selectionRect.currentX);
                const y1 = Math.min(selectionRect.startY, selectionRect.currentY);
                const y2 = Math.max(selectionRect.startY, selectionRect.currentY);

                const newSet = new Set<string>();
                const pattern = parsedTrack.patterns[selectedPatternId];
                
                Object.keys(pattern.tracks).forEach(trackName => {
                    pattern.tracks[trackName].forEach((ev, eIdx) => {
                        const noteLeft = ev.time * SLOT_W;
                        const noteWidth = ev.duration * SLOT_W;
                        
                        // Check Overlap
                        if (noteLeft < x2 && (noteLeft + noteWidth) > x1) {
                            ev.notes.forEach((n, nIdx) => {
                                const midi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 0;
                                const top = midiToRow(midi) * ROW_H;
                                if (top < y2 && (top + ROW_H) > y1) {
                                    newSet.add(getNoteId(trackName, eIdx, nIdx));
                                }
                            });
                        }
                    });
                });
                setSelectedNotes(newSet);
                setSelectionRect(null);
                return;
            }

            // 2. Finalize Drag
            if (dragState && parsedTrack && activePattern) {
                const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
                const pattern = newTrack.patterns[selectedPatternId];

                if (dragState.type === 'automation' && dragState.trackName !== undefined && dragState.eventIndex !== undefined) {
                    const event = pattern.tracks[dragState.trackName][dragState.eventIndex];
                    const valChange = dragDelta.rows; // Stored here
                    const newVal = (dragState.originalVal || 0) + valChange;
                    
                    let clamped = newVal;
                    if (autoMode === 'volume') clamped = Math.min(6, Math.max(-60, newVal));
                    else if (autoMode === 'pan') clamped = Math.min(100, Math.max(-100, newVal));
                    else clamped = Math.min(100, Math.max(0, newVal));
                    
                    const rounded = Math.round(clamped);

                    event.notes.forEach((n: NoteDef) => {
                        if (autoMode === 'volume') {
                            n.volume = rounded;
                        } else {
                            if (!n.effects) n.effects = [];
                            let code = 'P';
                            if (autoMode === 'fade') code = 'F';
                            if (autoMode === 'swell') code = 'S';
                            n.effects = n.effects.filter(e => e.code !== code);
                            if (rounded !== 0) n.effects.push({ code, value: rounded });
                        }
                    });
                    onChange(serializeParsedTrack(newTrack));

                } else if (dragDelta.slots !== 0 || dragDelta.rows !== 0) {
                    // Commit Move/Resize to ALL selected notes
                    const processedEvents = new Set<SequenceEvent>();

                    Object.keys(pattern.tracks).forEach(trackName => {
                        pattern.tracks[trackName].forEach((ev, eIdx) => {
                            ev.notes.forEach((n, nIdx) => {
                                if (selectedNotes.has(getNoteId(trackName, eIdx, nIdx))) {
                                    if (dragState.type === 'move') {
                                        if (!processedEvents.has(ev)) {
                                            ev.time = Math.max(0, ev.time + dragDelta.slots);
                                            processedEvents.add(ev);
                                        }
                                        if (dragDelta.rows !== 0) {
                                            const currentMidi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 60;
                                            const newMidi = currentMidi + dragDelta.rows;
                                            const newDef = resolveScaleDegree(newMidi, config!.scaleRoot, config!.scaleMode);
                                            Object.assign(n, newDef);
                                        }
                                    } else if (dragState.type === 'resize') {
                                        if (!processedEvents.has(ev)) {
                                            ev.duration = Math.max(0.25, ev.duration + dragDelta.slots);
                                            processedEvents.add(ev);
                                        }
                                    }
                                }
                            });
                        });
                        pattern.tracks[trackName].sort((a,b) => a.time - b.time);
                    });
                    
                    onChange(serializeParsedTrack(newTrack));
                }
                setDragState(null);
                setDragDelta({ slots: 0, rows: 0 });
            }
        };

        if (dragState || selectionRect) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, selectionRect, parsedTrack, selectedNotes, dragDelta, config, autoMode]);

    const toggleLocalPlay = () => {
        if (playbackMode === 'local') {
            audioStop();
            onPlaybackModeChange('stopped');
        } else {
            if (!parsedTrack || !selectedPatternId) return;
            audioStop(); 
            const soloTrack = JSON.parse(JSON.stringify(parsedTrack));
            soloTrack.playlist = [{ type: 'pattern', layers: [{ items: [{ id: selectedPatternId, transposition: 0 }] }] }];
            const soloSource = serializeParsedTrack(soloTrack);
            playTrack(soloSource, availableInstruments, qualities);
            onPlaybackModeChange('local');
        }
    };

    if (!parsedTrack || !activePattern || !config) return null;

    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    const totalSlots = Math.max(32, activePattern.duration + 4);
    const contentWidth = totalSlots * SLOT_W;
    const contentHeight = noteRange.length * ROW_H;
    const laneKeys = Object.keys(activePattern.tracks).sort();
    const beatW = SLOT_W * slotsPerBeat;
    const barW = SLOT_W * slotsPerBar;

    const getPerformanceTime = (time: number, swing: number, humanize: number, seed: number) => {
        let shift = 0;
        if (swing > 0) {
            const intTime = Math.floor(time);
            if (intTime % 2 !== 0) shift += swing * 0.33; 
        }
        if (humanize > 0) {
            const jitter = (pseudoRandom(seed) - 0.5) * 0.1 * humanize; 
            shift += jitter;
        }
        return time + shift;
    };

    return (
        <div className="pianoroll-container">
            {/* TOOLBAR */}
            <div className="pianoroll-toolbar">
                <select value={selectedPatternId} onChange={e => { setSelectedPatternId(e.target.value); const p = parsedTrack.patterns[e.target.value]; if(p && Object.keys(p.tracks).length > 0) setActiveLane(Object.keys(p.tracks)[0]); }} className="pianoroll-select">
                    {Object.keys(parsedTrack.patterns).map(pid => <option key={pid} value={pid}>{pid}</option>)}
                </select>
                <div className="pianoroll-toolbar-section">
                    <span className="pianoroll-label">Editing Lane:</span>
                    <select value={activeLane || ''} onChange={e => setActiveLane(e.target.value)} className="pianoroll-select">
                        {laneKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        <option value="__NEW__">+ New Lane</option>
                    </select>
                </div>
                <div className="pianoroll-toolbar-section" style={{ borderLeft:'1px solid #444', paddingLeft:'1rem' }}>
                    <button onClick={toggleLocalPlay} className="pianoroll-select" style={{ color: playbackMode === 'local' ? '#98c379' : '#fff', cursor:'pointer' }}>
                        {playbackMode === 'local' ? '■ Stop' : '▶ Ptn'}
                    </button>                    
                    <label style={{ display:'flex', alignItems:'center', gap:'4px', color: showAutomation ? '#61afef' : '#ccc', fontSize:'11px', cursor:'pointer' }}>
                        <input type="checkbox" checked={showAutomation} onChange={e => setShowAutomation(e.target.checked)} />
                        Mods/FX
                    </label>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="pianoroll-main">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    <div style={{ display: 'flex', height: `${height}px`, position: 'relative' }}>
                        
                        {/* Keys Sidebar */}
                        <div ref={keysRef} className="pianoroll-keys">
                            <div style={{ height: contentHeight }}>
                                {noteRange.slice().reverse().map(midi => (
                                    <div key={midi} className={`pianoroll-key ${Note.fromMidi(midi).includes('#') ? 'black' : ''}`} style={{ height: ROW_H }}>
                                        {Note.fromMidi(midi)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Grid Container */}
                        <div 
                            ref={gridRef}
                            className="pianoroll-grid-viewport" 
                            onScroll={handleScroll}
                        >
                            <div 
                                className="pianoroll-grid-content"
                                style={{ 
                                    width: contentWidth, 
                                    height: contentHeight,
                                    backgroundSize: `${SLOT_W}px ${ROW_H}px, ${barW}px ${ROW_H}px`
                                }}
                                onMouseDown={handleGridMouseDown}
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
                                {playbackMode === 'local' && isPlaying && (
                                    <div className="pianoroll-playhead" style={{ left: currentSlot * SLOT_W }} />
                                )}

                                {/* Background Rows */}
                                {noteRange.slice().reverse().map((midi, rowIdx) => {
                                    const rowTop = rowIdx * ROW_H;
                                    if (rowTop < scrollTop - ROW_H || rowTop > scrollTop + height) return null;
                                    
                                    const isScaleNote = scalePCs.includes(Note.pitchClass(Note.fromMidi(midi)));
                                    return isScaleNote ? (
                                        <div key={midi} style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_H, background: SCALE_BG, pointerEvents: 'none' }} />
                                    ) : null;
                                })}

                                {/* EVENTS */}
                                {laneKeys.map(trackName => {
                                    const isActive = trackName === activeLane;
                                    
                                    return activePattern.tracks[trackName].map((event, eventIdx) => {
                                        const leftPos = event.time * SLOT_W;
                                        const width = event.duration * SLOT_W;
                                        if (leftPos + width < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) return null;

                                        const isChord = event.notes.length > 1;
                                        
                                        // Performance Visuals
                                        const swingAmount = config.swing || 0;
                                        const humanizeAmount = config.humanize || 0;
                                        const hasPerf = swingAmount > 0 || humanizeAmount > 0;

                                        return event.notes.map((note, noteIdx) => {
                                            const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural));
                                            if (!midi || !noteRange.includes(midi)) return null;
                                            
                                            const topPos = midiToRow(midi) * ROW_H;
                                            if (topPos < scrollTop - ROW_H || topPos > scrollTop + height) return null;

                                            const id = getNoteId(trackName, eventIdx, noteIdx);
                                            const isSelected = selectedNotes.has(id);
                                            
                                            // Show Ghost if dragging THIS selection
                                            const showGhost = dragState && isSelected && dragState.type !== 'automation';
                                            
                                            const hasMods = (note.volume !== undefined && note.volume !== 0);
                                            let bgColor = isActive ? (isChord ? '#98c379' : '#61afef') : '#333';
                                            if (isSelected) bgColor = '#fff'; 
                                            else if (hasMods && isActive) bgColor = isChord ? '#b8e39a' : '#8ccceb'; 

                                            // Shadow Logic
                                            let shadowLeft = 0;
                                            let showShadow = false;
                                            if (hasPerf) {
                                                const seed = event.time + midi + (noteIdx * 50);
                                                const perfTime = getPerformanceTime(event.time, swingAmount, humanizeAmount, seed);
                                                shadowLeft = perfTime * SLOT_W;
                                                if (Math.abs(shadowLeft - leftPos) > 1) showShadow = true;
                                            }

                                            return (
                                                <div key={id}>
                                                    {/* Ghost (Drag Preview) */}
                                                    {showGhost && (
                                                        <div 
                                                            className="pianoroll-note-ghost"
                                                            style={{
                                                                left: (event.time + dragDelta.slots) * SLOT_W + 1,
                                                                top: (midiToRow(midi + dragDelta.rows)) * ROW_H + 1,
                                                                width: (dragState.type === 'resize' ? Math.max(0.25, event.duration + dragDelta.slots) : event.duration) * SLOT_W - 2,
                                                                height: ROW_H - 2
                                                            }}
                                                        />
                                                    )}
                                                    
                                                    {/* Shadow (Performance Preview) */}
                                                    {showShadow && !showGhost && (
                                                        <div 
                                                            className="pianoroll-note-performance-shadow"
                                                            style={{
                                                                left: shadowLeft + 1, top: topPos + 1,
                                                                width: width - 2, height: ROW_H - 2,
                                                                borderColor: bgColor // Inherit color for dashed border
                                                            }}
                                                        />
                                                    )}

                                                    {/* Main Note */}
                                                    <div 
                                                        onMouseDown={(e) => handleNoteMouseDown(e, trackName, eventIdx, noteIdx)}
                                                        className={`pianoroll-note ${isSelected ? 'selected' : ''}`}
                                                        style={{
                                                            left: leftPos + 1, top: topPos + 1, width: width - 2, height: ROW_H - 2,
                                                            background: isSelected ? '#61afef' : bgColor,
                                                            zIndex: isActive ? 10 : 2,
                                                            opacity: showGhost ? 0.3 : 1
                                                        }}>
                                                        {hasMods && (note.volume ? `v${note.volume}` : 'FX')}
                                                        <div className="pianoroll-note-handle" />
                                                    </div>
                                                </div>
                                            );
                                        });
                                    });
                                })}
                            </div>
                        </div>
                    </div>

                    {/* RESIZE HANDLE */}
                    <div 
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startY = e.clientY; const startH = height;
                            const doDrag = (ev: MouseEvent) => setHeight(Math.max(200, startH + (ev.clientY - startY)));
                            const stopDrag = () => { window.removeEventListener('mousemove', doDrag); window.removeEventListener('mouseup', stopDrag); };
                            window.addEventListener('mousemove', doDrag); window.addEventListener('mouseup', stopDrag);
                        }} 
                        className="pianoroll-resize-handle"
                    >
                        <div className="pianoroll-resize-handle-bar" />
                    </div>

                    {/* AUTOMATION DRAWER */}
                    {showAutomation && (
                        <div className="automation-drawer" style={{ height: `${autoHeight}px` }}>
                            <div className="automation-header">
                                <button onClick={() => setAutoMode('volume')} className={`automation-tab ${autoMode === 'volume' ? 'active' : ''}`}>Volume</button>
                                <button onClick={() => setAutoMode('pan')} className={`automation-tab ${autoMode === 'pan' ? 'active' : ''}`}>Pan</button>
                                <button onClick={() => setAutoMode('fade')} className={`automation-tab ${autoMode === 'fade' ? 'active' : ''}`}>Fade Out</button>
                                <button onClick={() => setAutoMode('swell')} className={`automation-tab ${autoMode === 'swell' ? 'active' : ''}`}>Swell In</button>
                            </div>
                            <div className="automation-lane" ref={autoRef}>
                                <div style={{ width: contentWidth, height: '100%', position: 'relative', marginLeft: '40px' }}>
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#333' }} />
                                    
                                    {activePattern && activePattern.tracks[activeLane]?.map((event, i) => {
                                        const leftPos = event.time * SLOT_W;
                                        if (leftPos < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) return null;

                                        let val = 0;
                                        if (autoMode === 'volume') val = event.notes[0].volume || 0;
                                        else if (autoMode === 'pan') { const fx = event.notes[0].effects?.find(e => e.code === 'P'); val = fx ? fx.value : 0; }
                                        else if (autoMode === 'fade') { const fx = event.notes[0].effects?.find(e => e.code === 'F'); val = fx ? fx.value : 0; }
                                        else if (autoMode === 'swell') { const fx = event.notes[0].effects?.find(e => e.code === 'S'); val = fx ? fx.value : 0; }

                                        if (dragState?.type === 'automation' && dragState.eventIndex === i && dragState.originalVal !== undefined) {
                                            val = dragState.originalVal + dragDelta.rows; 
                                        }

                                        let hPercent = 0;
                                        let color = '#61afef';
                                        if (autoMode === 'volume') hPercent = Math.max(0, Math.min(100, 50 + (val * 2))); 
                                        else if (autoMode === 'pan') { hPercent = 50 + (val / 2); color = '#d19a66'; } 
                                        else { hPercent = Math.min(100, Math.max(0, val)); color = autoMode === 'fade' ? '#e06c75' : '#c678dd'; }

                                        return (
                                            <div key={i} onMouseDown={(e) => handleAutomationMouseDown(e, activeLane, i, val)}
                                                className="automation-point"
                                                style={{ left: leftPos, width: Math.max(4, SLOT_W - 4), height: `${hPercent}%`, background: color }}>
                                                {dragState?.type === 'automation' && dragState.eventIndex === i && (
                                                    <span style={{ fontSize: '9px', color: '#fff', position: 'absolute', top: '-15px', background: '#000', padding: '2px 4px', borderRadius:'2px', pointerEvents:'none', zIndex: 100, whiteSpace:'nowrap' }}>
                                                        {autoMode}: {val}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function resolveScaleDegree(midi: number, root: string, mode: string): NoteDef {
    const scale = Scale.get(`${root} ${mode.toLowerCase()}`);
    const pc = Note.pitchClass(Note.fromMidi(midi));
    let degree = scale.notes.indexOf(pc) + 1;
    let accidental = 0;
    if (degree === 0) { degree = 1; accidental = 1; }
    const octave = Note.octave(Note.fromMidi(midi)) || 4;
    return { degree, octaveShift: octave - 4, accidental, isNatural: false };
}