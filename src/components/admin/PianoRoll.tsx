'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
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

export default function PianoRoll({ source, qualities, onChange, availableInstruments, playbackMode, onPlaybackModeChange }: Props) {
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [activeLane, setActiveLane] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const [height, setHeight] = useState(400); 
    
    // Virtualization State
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewWidth, setViewWidth] = useState(800); // Default, updated via ref
    const gridRef = useRef<HTMLDivElement>(null);
    const keysRef = useRef<HTMLDivElement>(null);
    const autoRef = useRef<HTMLDivElement>(null);

    // Automation State
    const [showAutomation, setShowAutomation] = useState(false);
    const [autoHeight, setAutoHeight] = useState(140);
    const [autoMode, setAutoMode] = useState<AutoMode>('volume');
    const { playTrack, stop: audioStop, isPlaying } = useAudio();

    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize' | 'automation';
        trackName: string;
        eventIndex: number;
        startX: number;
        startY: number;
        originalTime?: number;
        originalDuration?: number;
        originalVal?: number; 
        originalMidiBase?: number;
    } | null>(null);

    const [ghostState, setGhostState] = useState<{
        time: number;
        midiShift: number; 
        duration: number;
        val?: number; 
    } | null>(null);

    // Parsing Logic
    useEffect(() => {
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source, qualities);
            setParsedTrack(track);
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

    // Handle Scroll Sync & Virtualization
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollLeft(target.scrollLeft);
        setScrollTop(target.scrollTop);
        
        // Sync Keys (Vertical)
        if (keysRef.current) keysRef.current.scrollTop = target.scrollTop;
        // Sync Automation (Horizontal)
        if (autoRef.current) autoRef.current.scrollLeft = target.scrollLeft;
    };

    // Initial width measurement
    useEffect(() => {
        if (gridRef.current) setViewWidth(gridRef.current.clientWidth);
    }, []);

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

    // --- EVENT HANDLERS ---
    const handleGridMouseDown = (e: React.MouseEvent, midi: number) => {
        if (!parsedTrack || !selectedPatternId || !activeLane) return;
        if (e.button !== 0) return; 
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left; // relative to container
        // Account for scroll
        const absX = clickX + scrollLeft; 
        const clickedSlot = Math.floor(absX / SLOT_W);

        const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
        const pattern = newTrack.patterns[selectedPatternId];
        if (!pattern.tracks[activeLane]) pattern.tracks[activeLane] = [];
        const trackEvents = pattern.tracks[activeLane];

        // Hit detection margin
        const existingEvent = trackEvents.find((ev: SequenceEvent) => Math.abs(ev.time - clickedSlot) < 0.1);
        const noteDef = resolveScaleDegree(midi, config!.scaleRoot, config!.scaleMode);

        if (existingEvent) {
            existingEvent.notes.push(noteDef);
        } else {
            trackEvents.push({ time: clickedSlot, duration: 1, notes: [noteDef] });
        }
        
        trackEvents.sort((a: SequenceEvent, b: SequenceEvent) => a.time - b.time);
        onChange(serializeParsedTrack(newTrack));
    };

    const handleEventMouseDown = (e: React.MouseEvent, trackName: string, eventIndex: number, midiBase: number) => {
        e.stopPropagation();
        if (!parsedTrack || !selectedPatternId) return;

        // Right Click Delete
        if (e.button === 2) {
            e.preventDefault();
            const newTrack = JSON.parse(JSON.stringify(parsedTrack));
            newTrack.patterns[selectedPatternId].tracks[trackName].splice(eventIndex, 1);
            onChange(serializeParsedTrack(newTrack));
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isResize = clickX > rect.width - 10; 
        
        const pattern = parsedTrack.patterns[selectedPatternId];
        const event = pattern.tracks[trackName][eventIndex];

        setDragState({
            type: isResize ? 'resize' : 'move',
            trackName,
            eventIndex,
            startX: e.clientX,
            startY: e.clientY,
            originalTime: event.time,
            originalDuration: event.duration,
            originalMidiBase: midiBase
        });
        
        setGhostState({
            time: event.time,
            midiShift: 0,
            duration: event.duration
        });
    };

    const handleAutomationMouseDown = (e: React.MouseEvent, trackName: string, eventIndex: number, currentVal: number) => { 
        e.stopPropagation();
        setDragState({
            type: 'automation',
            trackName,
            eventIndex,
            startX: e.clientX,
            startY: e.clientY,
            originalVal: currentVal
        });
        setGhostState({ time: 0, midiShift: 0, duration: 0, val: currentVal });
    };

    // --- DRAG LOGIC ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState) return;
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;
            
            if (dragState.type === 'automation') {
                const deltaVal = -deltaY; 
                const newVal = (dragState.originalVal || 0) + (deltaVal * 0.5);
                let clamped = newVal;
                if (autoMode === 'volume') clamped = Math.min(6, Math.max(-60, newVal));
                else if (autoMode === 'pan') clamped = Math.min(100, Math.max(-100, newVal));
                else clamped = Math.min(100, Math.max(0, newVal));
                setGhostState({ time: 0, midiShift: 0, duration: 0, val: Math.round(clamped) });
            } else {
                const slotsDelta = Math.round(deltaX / SLOT_W);
                const rowsDelta = Math.round(deltaY / ROW_H);

                if (dragState.type === 'move') {
                    const newTime = Math.max(0, (dragState.originalTime || 0) + slotsDelta);
                    const midiShift = -rowsDelta; 
                    setGhostState({ time: newTime, midiShift, duration: dragState.originalDuration || 1 });
                } else {
                    const newDuration = Math.max(0.25, (dragState.originalDuration || 1) + slotsDelta * 0.25);
                    setGhostState({ time: dragState.originalTime || 0, midiShift: 0, duration: newDuration });
                }
            }
        };

        const handleMouseUp = () => {
            if (!dragState || !parsedTrack || !ghostState) {
                setDragState(null);
                setGhostState(null);
                return;
            }

            const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
            const pattern = newTrack.patterns[selectedPatternId];
            const event = pattern.tracks[dragState.trackName][dragState.eventIndex];

            if (dragState.type === 'automation') {
                const val = ghostState.val ?? 0;
                event.notes.forEach((n: NoteDef) => {
                    if (autoMode === 'volume') {
                        n.volume = val;
                    } else {
                        if (!n.effects) n.effects = [];
                        let code = 'P';
                        if (autoMode === 'fade') code = 'F';
                        if (autoMode === 'swell') code = 'S';
                        n.effects = n.effects.filter(e => e.code !== code);
                        if (val !== 0) n.effects.push({ code, value: val });
                    }
                });
            } else if (dragState.type === 'resize') {
                event.duration = ghostState.duration;
            } else {
                event.time = ghostState.time;
                if (ghostState.midiShift !== 0) {
                    event.notes.forEach((n: NoteDef) => {
                        const currentMidi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 60;
                        const newMidi = currentMidi + ghostState.midiShift;
                        const newDef = resolveScaleDegree(newMidi, config!.scaleRoot, config!.scaleMode);
                        Object.assign(n, newDef);
                    });
                }
            }
            
            if (dragState.type !== 'automation') {
                pattern.tracks[dragState.trackName].sort((a: SequenceEvent, b: SequenceEvent) => a.time - b.time);
            }
            
            onChange(serializeParsedTrack(newTrack));
            setDragState(null);
            setGhostState(null);
        };

        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, ghostState, parsedTrack, selectedPatternId, config, onChange, autoMode]);

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
    
    // Calculate total layout width based on duration + padding
    const totalSlots = Math.max(32, activePattern.duration + 4);
    const contentWidth = totalSlots * SLOT_W;
    const contentHeight = noteRange.length * ROW_H;
    const laneKeys = Object.keys(activePattern.tracks).sort();

    // Background Gradients (Computed JS for dynamic sizing)
    const beatW = SLOT_W * slotsPerBeat;
    const barW = SLOT_W * slotsPerBar;
    
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

            {/* MAIN CONTENT SPLIT */}
            <div className="pianoroll-main">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    {/* SCROLL AREA */}
                    <div style={{ display: 'flex', height: `${height}px`, position: 'relative' }}>
                        
                        {/* Keys Sidebar (Scroll Synced) */}
                        <div ref={keysRef} className="pianoroll-keys">
                            <div style={{ height: contentHeight }}>
                                {noteRange.slice().reverse().map(midi => (
                                    <div key={midi} className={`pianoroll-key ${Note.fromMidi(midi).includes('#') ? 'black' : ''}`} style={{ height: ROW_H }}>
                                        {Note.fromMidi(midi)}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Grid Container (Scroll Source) */}
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
                                onMouseDown={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const y = e.clientY - rect.top;
                                    const row = Math.floor(y / ROW_H);
                                    if(row >= 0 && row < noteRange.length) {
                                        handleGridMouseDown(e, noteRange[noteRange.length - 1 - row]);
                                    }
                                }}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {/* Playhead */}
                                {playbackMode === 'local' && isPlaying && (
                                    <div className="pianoroll-playhead" style={{ left: currentSlot * SLOT_W }} />
                                )}

                                {/* Background Rows (Visual Only) */}
                                {noteRange.slice().reverse().map((midi, rowIdx) => {
                                    // Optimization: Only render background row if visible vertically
                                    const rowTop = rowIdx * ROW_H;
                                    if (rowTop < scrollTop - ROW_H || rowTop > scrollTop + height) return null;
                                    
                                    const isScaleNote = scalePCs.includes(Note.pitchClass(Note.fromMidi(midi)));
                                    return isScaleNote ? (
                                        <div key={midi} style={{ position: 'absolute', top: rowTop, left: 0, right: 0, height: ROW_H, background: SCALE_BG, pointerEvents: 'none' }} />
                                    ) : null;
                                })}

                                {/* VIRTUALIZED EVENTS RENDER */}
                                {laneKeys.map(trackName => {
                                    const isActive = trackName === activeLane;
                                    
                                    return activePattern.tracks[trackName].map((event, eventIdx) => {
                                        // 1. Virtualization Check
                                        const leftPos = event.time * SLOT_W;
                                        const width = event.duration * SLOT_W;
                                        
                                        // Add buffer (100px) to prevent pop-in
                                        if (leftPos + width < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) {
                                            return null;
                                        }

                                        if (dragState && dragState.trackName === trackName && dragState.eventIndex === eventIdx && dragState.type !== 'automation') return null;
                                        
                                        const isChord = event.notes.length > 1;
                                        return event.notes.map((note, noteIdx) => {
                                            const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural));
                                            if (!midi || !noteRange.includes(midi)) return null;
                                            
                                            const topPos = midiToRow(midi) * ROW_H;
                                            // Vertical Virtualization Check
                                            if (topPos < scrollTop - ROW_H || topPos > scrollTop + height) return null;

                                            const hasMods = (note.volume !== undefined && note.volume !== 0) || (note.effects && note.effects.length > 0);
                                            let bgColor = isActive ? (isChord ? '#98c379' : '#61afef') : '#333';
                                            if (hasMods && isActive) bgColor = isChord ? '#b8e39a' : '#8ccceb'; 
                                            
                                            return (
                                                <div 
                                                    key={`${trackName}-${eventIdx}-${noteIdx}`} 
                                                    onMouseDown={(e) => handleEventMouseDown(e, trackName, eventIdx, midi)}
                                                    className="pianoroll-note"
                                                    style={{
                                                        left: leftPos + 1, top: topPos + 1, width: width - 2, height: ROW_H - 2,
                                                        background: bgColor, zIndex: isActive ? 10 : 2
                                                    }}>
                                                    {hasMods && (note.volume ? `v${note.volume}` : 'FX')}
                                                    <div className="pianoroll-note-handle" />
                                                </div>
                                            );
                                        });
                                    });
                                })}

                                {/* GHOST NOTE */}
                                {ghostState && dragState?.type !== 'automation' && (
                                    <div className="pianoroll-note-ghost" style={{
                                        left: ghostState.time * SLOT_W + 1,
                                        top: midiToRow((dragState?.originalMidiBase || 60) + ghostState.midiShift) * ROW_H + 1,
                                        width: (ghostState.duration * SLOT_W) - 2,
                                        height: ROW_H - 2
                                    }} />
                                )}
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
                                        // Virtualization for Automation
                                        const leftPos = event.time * SLOT_W;
                                        if (leftPos < scrollLeft - 100 || leftPos > scrollLeft + viewWidth + 100) return null;

                                        let val = 0;
                                        if (autoMode === 'volume') val = event.notes[0].volume || 0;
                                        else if (autoMode === 'pan') { const fx = event.notes[0].effects?.find(e => e.code === 'P'); val = fx ? fx.value : 0; }
                                        else if (autoMode === 'fade') { const fx = event.notes[0].effects?.find(e => e.code === 'F'); val = fx ? fx.value : 0; }
                                        else if (autoMode === 'swell') { const fx = event.notes[0].effects?.find(e => e.code === 'S'); val = fx ? fx.value : 0; }

                                        if (dragState?.type === 'automation' && dragState.eventIndex === i && ghostState?.val !== undefined) val = ghostState.val;

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