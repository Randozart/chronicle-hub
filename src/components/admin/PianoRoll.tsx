'use client';
import { useEffect, useState, useMemo } from 'react';
import { ParsedTrack, SequenceEvent, NoteDef } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { PlayerQualities } from '@/engine/models';
import { resolveNote } from '@/engine/audio/scales';
import { Note, Scale } from 'tonal';
import { LigatureParser } from '@/engine/audio/parser';

interface Props {
    source: string;
    qualities?: PlayerQualities;
    onChange: (newSource: string) => void;
}

const SLOT_W = 24;
const ROW_H = 16; 
const SCALE_BG = 'rgba(97, 175, 239, 0.08)'; 

export default function PianoRoll({ source, qualities = {}, onChange }: Props) {
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [activeLane, setActiveLane] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    
    // Default height 300px
    const [height, setHeight] = useState(300);

    // --- DRAG STATE ---
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize';
        trackName: string;
        eventIndex: number;
        startX: number;
        startY: number;
        originalTime: number;
        originalDuration: number;
        originalMidiBase: number;
    } | null>(null);

    const [ghostState, setGhostState] = useState<{
        time: number;
        midiShift: number; 
        duration: number;
    } | null>(null);

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
                } else if (selectedPatternId && (!activeLane || !track.patterns[selectedPatternId].tracks[activeLane])) {
                    const currentPattern = track.patterns[selectedPatternId];
                    if (currentPattern) {
                        const lanes = Object.keys(currentPattern.tracks);
                        if (lanes.length > 0) setActiveLane(lanes[0]);
                    }
                }
            }
        } catch (e) { }
    }, [source, qualities, selectedPatternId]);

    const activePattern = parsedTrack?.patterns[selectedPatternId];
    const config = parsedTrack?.config;

    const scalePCs = useMemo(() => {
        if(!config) return [];
        return Scale.get(`${config.scaleRoot} ${config.scaleMode.toLowerCase()}`).notes;
    }, [config]);

    const { noteRange, minMidi } = useMemo(() => {
        if (!activePattern || !config) return { noteRange: [], minMidi: 48 };
        const min = 36; 
        const max = 96; 
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return { noteRange: range, minMidi: min };
    }, [activePattern, config]);

    const midiToRow = (midi: number) => noteRange.length - 1 - (midi - minMidi);

    // --- HANDLERS ---

    const handleGridMouseDown = (e: React.MouseEvent, midi: number, time: number) => {
        if (!parsedTrack || !selectedPatternId || !activeLane) return;
        if (e.button !== 0) return; 

        const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
        const pattern = newTrack.patterns[selectedPatternId];
        if (!pattern.tracks[activeLane]) pattern.tracks[activeLane] = [];
        const trackEvents = pattern.tracks[activeLane];

        const existingEvent = trackEvents.find((ev: SequenceEvent) => Math.abs(ev.time - time) < 0.1);
        const noteDef = resolveScaleDegree(midi, config!.scaleRoot, config!.scaleMode);

        if (existingEvent) {
            existingEvent.notes.push(noteDef);
        } else {
            trackEvents.push({ time, duration: 1, notes: [noteDef] });
        }
        
        trackEvents.sort((a: SequenceEvent, b: SequenceEvent) => a.time - b.time);
        onChange(serializeParsedTrack(newTrack));
    };

    const handleEventMouseDown = (e: React.MouseEvent, trackName: string, eventIndex: number, midiBase: number) => {
        e.stopPropagation();
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
        
        const pattern = parsedTrack!.patterns[selectedPatternId];
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
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState) return;
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;
            
            const slotsDelta = Math.round(deltaX / SLOT_W);
            const rowsDelta = Math.round(deltaY / ROW_H);

            if (dragState.type === 'move') {
                const newTime = Math.max(0, dragState.originalTime + slotsDelta);
                const midiShift = -rowsDelta; 
                setGhostState({ time: newTime, midiShift, duration: dragState.originalDuration });
            } else {
                const newDuration = Math.max(0.25, dragState.originalDuration + slotsDelta);
                setGhostState({ time: dragState.originalTime, midiShift: 0, duration: newDuration });
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

            if (dragState.type === 'resize') {
                event.duration = ghostState.duration;
            } else {
                event.time = ghostState.time;
                event.notes.forEach((n: NoteDef) => {
                    const currentMidi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 60;
                    const newMidi = currentMidi + ghostState.midiShift;
                    const newDef = resolveScaleDegree(newMidi, config!.scaleRoot, config!.scaleMode);
                    Object.assign(n, newDef);
                });
            }
            
            pattern.tracks[dragState.trackName].sort((a: SequenceEvent, b: SequenceEvent) => a.time - b.time);
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
    }, [dragState, ghostState, parsedTrack, selectedPatternId, config, onChange]);

    if (!parsedTrack || !activePattern || !config) return null;

    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    const totalSlots = Math.max(32, activePattern.duration + 4);
    const laneKeys = Object.keys(activePattern.tracks).sort();

    const ddStyle = { background: '#21252b', color: '#dcdfe4', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#111', userSelect: 'none' }}>
            {/* TOOLBAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderBottom: '1px solid #333', background: '#181a1f' }}>
                <select 
                    value={selectedPatternId} 
                    onChange={e => { 
                        setSelectedPatternId(e.target.value); 
                        const p = parsedTrack.patterns[e.target.value];
                        if(p && Object.keys(p.tracks).length > 0) setActiveLane(Object.keys(p.tracks)[0]);
                    }} 
                    style={ddStyle}
                >
                    {Object.keys(parsedTrack.patterns).map(pid => <option key={pid} value={pid}>{pid}</option>)}
                </select>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                    <span style={{fontSize:'0.8rem', color:'#888'}}>Editing Lane:</span>
                    <select value={activeLane || ''} onChange={e => setActiveLane(e.target.value)} style={ddStyle}>
                        {laneKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        <option value="__NEW__">+ New Lane</option>
                    </select>
                </div>
            </div>

            {/* SCROLLABLE AREA - Height controlled by State */}
            <div style={{ display: 'flex', height: `${height}px`, overflow: 'auto', position: 'relative' }}>
                {/* KEYS */}
                <div style={{ width: '40px', flexShrink: 0, borderRight: '1px solid #333', background: '#181a1f', position: 'sticky', left: 0, zIndex: 20 }}>
                    {noteRange.slice().reverse().map(midi => {
                        const n = Note.fromMidi(midi);
                        const pc = Note.pitchClass(n);
                        const isBlack = n.includes('#');
                        const inScale = scalePCs.includes(pc);
                        return (
                            <div key={midi} style={{ 
                                height: ROW_H, 
                                background: isBlack ? '#000' : '#222', 
                                color: inScale ? '#61afef' : (isBlack ? '#444' : '#888'),
                                fontWeight: inScale ? 'bold' : 'normal',
                                fontSize: '9px', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:'4px',
                                borderBottom: '1px solid #111'
                            }}>
                                {n}
                            </div>
                        )
                    })}
                </div>

                {/* GRID */}
                <div style={{ flex: 1, position: 'relative', background: '#0d0d0d' }}>
                    <div style={{ width: totalSlots * SLOT_W, height: noteRange.length * ROW_H, position: 'relative' }}>
                        
                        {/* Background Rows */}
                        {noteRange.slice().reverse().map((midi, rowIdx) => {
                            const pc = Note.pitchClass(Note.fromMidi(midi));
                            const inScale = scalePCs.includes(pc);
                            return (
                                <div key={midi} style={{ 
                                    position: 'absolute', top: rowIdx * ROW_H, left: 0, right: 0, height: ROW_H, 
                                    background: inScale ? SCALE_BG : 'transparent', 
                                    pointerEvents: 'none' 
                                }} />
                            );
                        })}

                        {/* Grid Lines */}
                        {Array.from({ length: totalSlots + 1 }).map((_, t) => (
                            <div key={t} style={{
                                position: 'absolute', left: t * SLOT_W, top: 0, bottom: 0, width: 1,
                                background: t % slotsPerBar === 0 ? '#444' : t % slotsPerBeat === 0 ? '#222' : '#111'
                            }} />
                        ))}
                        
                        {/* Separators */}
                        {noteRange.slice().reverse().map((midi, rowIdx) => (
                            <div key={`sep-${midi}`} style={{ 
                                position: 'absolute', top: rowIdx * ROW_H, left: 0, right: 0, height: 1, 
                                background: '#1a1a1a', pointerEvents: 'none' 
                            }} />
                        ))}

                        {/* Click Zones */}
                        {noteRange.slice().reverse().map((midi) => (
                            <div key={`click-${midi}`} style={{ display: 'flex', height: ROW_H }}>
                                {Array.from({ length: totalSlots }).map((_, t) => (
                                    <div 
                                        key={t}
                                        onMouseDown={(e) => handleGridMouseDown(e, midi, t)}
                                        onContextMenu={(e) => e.preventDefault()}
                                        style={{ width: SLOT_W, height: ROW_H, zIndex: 1 }}
                                        className="hover:bg-white/5"
                                    />
                                ))}
                            </div>
                        ))}

                        {/* RENDER NOTES */}
                        {laneKeys.map(trackName => {
                            const isActive = trackName === activeLane;
                            return activePattern.tracks[trackName].map((event, eventIdx) => {
                                if (dragState && dragState.trackName === trackName && dragState.eventIndex === eventIdx) return null;

                                const isChord = event.notes.length > 1;
                                
                                return event.notes.map((note, noteIdx) => {
                                    const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural));
                                    if (!midi || !noteRange.includes(midi)) return null;
                                    
                                    const topPos = midiToRow(midi) * ROW_H;
                                    const bgColor = isActive ? (isChord ? '#98c379' : '#61afef') : '#333';

                                    return (
                                        <div 
                                            key={`${trackName}-${eventIdx}-${noteIdx}`}
                                            onMouseDown={(e) => isActive && handleEventMouseDown(e, trackName, eventIdx, midi)}
                                            onContextMenu={(e) => { e.preventDefault(); if(isActive) handleEventMouseDown(e, trackName, eventIdx, midi); }}
                                            style={{
                                                position: 'absolute',
                                                left: event.time * SLOT_W + 1,
                                                top: topPos + 1,
                                                width: (event.duration * SLOT_W) - 2,
                                                height: ROW_H - 2,
                                                background: bgColor,
                                                border: isActive ? '1px solid #fff' : '1px solid #555',
                                                borderRadius: '2px',
                                                zIndex: isActive ? 10 : 2,
                                                cursor: isActive ? 'move' : 'default',
                                                opacity: isActive ? 1 : 0.5
                                            }}
                                        >
                                            {isActive && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'e-resize' }} />}
                                        </div>
                                    );
                                });
                            });
                        })}

                        {/* GHOST NOTE */}
                        {ghostState && (
                            <div style={{
                                position: 'absolute',
                                left: ghostState.time * SLOT_W + 1,
                                top: midiToRow((dragState?.originalMidiBase || 60) + ghostState.midiShift) * ROW_H + 1,
                                width: (ghostState.duration * SLOT_W) - 2,
                                height: ROW_H - 2,
                                background: 'rgba(255, 255, 255, 0.5)',
                                border: '1px dashed white',
                                zIndex: 20,
                                pointerEvents: 'none'
                            }} />
                        )}
                    </div>
                </div>
            </div>
            
            {/* DRAG HANDLE */}
            <div 
                onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY; 
                    const startH = height;
                    const doDrag = (ev: MouseEvent) => setHeight(Math.max(150, startH + (ev.clientY - startY)));
                    const stopDrag = () => { 
                        window.removeEventListener('mousemove', doDrag); 
                        window.removeEventListener('mouseup', stopDrag); 
                    };
                    window.addEventListener('mousemove', doDrag); 
                    window.addEventListener('mouseup', stopDrag);
                }} 
                style={{ 
                    height: '12px', background: '#222', borderTop: '1px solid #444', 
                    cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                    flexShrink: 0 
                }}
            >
                <div style={{ width: '40px', height: '4px', background: '#666', borderRadius: '2px' }} />
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