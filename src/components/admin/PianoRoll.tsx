'use client';
import { useEffect, useState, useMemo } from 'react';
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
    
    // Automation State
    const [showAutomation, setShowAutomation] = useState(false);
    const [autoHeight, setAutoHeight] = useState(140);
    const [autoMode, setAutoMode] = useState<AutoMode>('volume');
    const [isLocalPlaying, setIsLocalPlaying] = useState(false);
    const { playTrack, stop: audioStop, isPlaying } = useAudio(); // <-- Make sure isPlaying is destructured here

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
    const currentSlot = usePlaybackState(Tone.Transport.state === 'started', activePattern?.duration || 0, config?.bpm || 120, config?.grid || 4, config?.timeSig || [4,4]);

    const scalePCs = useMemo(() => config ? Scale.get(`${config.scaleRoot} ${config.scaleMode.toLowerCase()}`).notes : [], [config]);
    const { noteRange, minMidi } = useMemo(() => {
        if (!activePattern || !config) return { noteRange: [], minMidi: 48 };
        const min = 36; const max = 96; 
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return { noteRange: range, minMidi: min };
    }, [activePattern, config]);
    const midiToRow = (midi: number) => noteRange.length - 1 - (midi - minMidi);

    // --- EVENT HANDLERS ---

    const handleGridMouseDown = (e: React.MouseEvent, midi: number, time: number) => {
        if (!parsedTrack || !selectedPatternId || !activeLane) return;
        if (e.button !== 0) return; 

        const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
        const pattern = newTrack.patterns[selectedPatternId];
        if (!pattern.tracks[activeLane]) pattern.tracks[activeLane] = [];
        const trackEvents = pattern.tracks[activeLane];

        // Hit detection margin
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
        
        // Initial Ghost
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
                if (autoMode === 'volume') {
                    clamped = Math.min(6, Math.max(-60, newVal));
                } else if (autoMode === 'pan') {
                    clamped = Math.min(100, Math.max(-100, newVal));
                } else {
                    // Effects (Fade/Swell) are usually 0-100 magnitude
                    clamped = Math.min(100, Math.max(0, newVal));
                }
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
                        // Handle Effects: P (Pan), F (Fade), S (Swell)
                        if (!n.effects) n.effects = [];
                        let code = 'P';
                        if (autoMode === 'fade') code = 'F';
                        if (autoMode === 'swell') code = 'S';

                        // Remove existing matching effect to replace it
                        n.effects = n.effects.filter(e => e.code !== code);
                        
                        // Push new if not default/zero
                        if (val !== 0) n.effects.push({ code, value: val });
                    }
                });
            } else if (dragState.type === 'resize') {
                event.duration = ghostState.duration;
            } else {
                // Moving Logic
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
            onPlaybackModeChange('stopped'); // Tell parent we stopped
        } else {
            if (!parsedTrack || !selectedPatternId) return;
            audioStop(); // Stop any global play first

            const soloTrack = JSON.parse(JSON.stringify(parsedTrack));
            soloTrack.playlist = [{ type: 'pattern', layers: [{ items: [{ id: selectedPatternId, transposition: 0 }] }] }];
            const soloSource = serializeParsedTrack(soloTrack);
            
            playTrack(soloSource, availableInstruments, qualities);
            onPlaybackModeChange('local'); // Tell parent we are in local mode
        }
    };

    useEffect(() => {
        if (Tone.Transport.state !== 'started') setIsLocalPlaying(false);
    }, [source]); 

    if (!parsedTrack || !activePattern || !config) return null;

    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0];
    const totalSlots = Math.max(32, activePattern.duration + 4);
    const laneKeys = Object.keys(activePattern.tracks).sort();

    const ddStyle = { background: '#21252b', color: '#dcdfe4', border: '1px solid #444', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' };
    const tabStyle = (active: boolean) => ({
        padding: '4px 12px', cursor: 'pointer', border: 'none', fontSize: '11px',
        background: active ? '#333' : 'transparent', color: active ? '#fff' : '#666',
        borderBottom: active ? '2px solid #61afef' : '2px solid transparent',
        transition: 'all 0.2s'
    });

    // CSS Gradient for Grid Lines
    // beatW = pixels per beat. barW = pixels per bar.
    // We want 1px lines.
    // background-size must match the repeat interval.
    
    // Beat Line (Faint)
    const beatW = SLOT_W * slotsPerBeat;
    // Bar Line (Strong)
    const barW = SLOT_W * slotsPerBar;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#111', height: '100%', userSelect: 'none' }}>
            {/* TOOLBAR */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderBottom: '1px solid #333', background: '#181a1f' }}>
                <select value={selectedPatternId} onChange={e => { setSelectedPatternId(e.target.value); const p = parsedTrack.patterns[e.target.value]; if(p && Object.keys(p.tracks).length > 0) setActiveLane(Object.keys(p.tracks)[0]); }} style={ddStyle}>
                    {Object.keys(parsedTrack.patterns).map(pid => <option key={pid} value={pid}>{pid}</option>)}
                </select>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                    <span style={{fontSize:'0.8rem', color:'#888'}}>Editing Lane:</span>
                    <select value={activeLane || ''} onChange={e => setActiveLane(e.target.value)} style={ddStyle}>
                        {laneKeys.map(k => <option key={k} value={k}>{k}</option>)}
                        <option value="__NEW__">+ New Lane</option>
                    </select>
                </div>
                <div style={{ borderLeft:'1px solid #444', paddingLeft:'1rem', display:'flex', gap:'8px' }}>
                <button onClick={toggleLocalPlay} style={{ ...ddStyle, color: playbackMode === 'local' ? '#98c379' : '#fff', cursor:'pointer' }}>
                            {playbackMode === 'local' ? '■ Stop' : '▶ Ptn'}
                        </button>                    
                        <label style={{ display:'flex', alignItems:'center', gap:'4px', color: showAutomation ? '#61afef' : '#ccc', fontSize:'11px', cursor:'pointer' }}>
                        <input type="checkbox" checked={showAutomation} onChange={e => setShowAutomation(e.target.checked)} />
                        Mods/FX
                    </label>
                </div>
            </div>

            {/* MAIN CONTENT SPLIT */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                
                {/* 1. GRID SCROLL AREA */}
                <div style={{ display: 'flex', height: `${height}px`, overflow: 'auto', position: 'relative' }}>
                    
                    {/* Keys Sidebar */}
                    <div style={{ width: '40px', flexShrink: 0, borderRight: '1px solid #333', background: '#181a1f', position: 'sticky', left: 0, zIndex: 20 }}>
                        {noteRange.slice().reverse().map(midi => (
                            <div key={midi} style={{ height: ROW_H, background: Note.fromMidi(midi).includes('#') ? '#000' : '#222', color: '#888', fontSize: '9px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px' }}>
                                {Note.fromMidi(midi)}
                            </div>
                        ))}
                        {/* Filler to match grid height if few keys */}
                        <div style={{ flex: 1, minHeight: '100%', background: '#181a1f' }} />
                    </div>
                    
                    {/* Grid Container */}
                    <div style={{ 
                        flex: 1, position: 'relative', background: '#0d0d0d', minWidth: totalSlots * SLOT_W, 
                        minHeight: '100%', // FORCE FULL HEIGHT
                        // CSS Grid Lines
                        backgroundImage: `
                            linear-gradient(to right, #222 1px, transparent 1px),
                            linear-gradient(to right, #444 1px, transparent 1px)
                        `,
                        backgroundSize: `${SLOT_W}px 100%, ${barW}px 100%`, // Beat lines every slot, Bar lines every bar
                        backgroundAttachment: 'local'
                    }}>
                        
                        {/* Playhead */}
                        {playbackMode === 'local' && isPlaying && (
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: '#e06c75', left: currentSlot * SLOT_W, zIndex: 30, pointerEvents: 'none' }} />
                                )}
                        {/* Content Wrapper */}
                        <div style={{ position: 'relative', height: noteRange.length * ROW_H, zIndex: 10 }}>
                            {/* Background Rows */}
                            {noteRange.slice().reverse().map((midi, rowIdx) => (
                                <div key={midi} style={{ position: 'absolute', top: rowIdx * ROW_H, left: 0, right: 0, height: ROW_H, background: scalePCs.includes(Note.pitchClass(Note.fromMidi(midi))) ? SCALE_BG : 'transparent', pointerEvents: 'none' }} />
                            ))}
                            
                            {/* Click Layer */}
                            {noteRange.slice().reverse().map((midi) => (
                                <div key={`c-${midi}`} style={{ display: 'flex', height: ROW_H }}>
                                    {Array.from({ length: totalSlots }).map((_, t) => (
                                        <div key={t} onMouseDown={(e) => handleGridMouseDown(e, midi, t)} onContextMenu={(e) => e.preventDefault()} style={{ width: SLOT_W, height: ROW_H, zIndex: 1 }} className="hover:bg-white/5" />
                                    ))}
                                </div>
                            ))}

                            {/* Events */}
                            {laneKeys.map(trackName => {
                                const isActive = trackName === activeLane;
                                return activePattern.tracks[trackName].map((event, eventIdx) => {
                                    if (dragState && dragState.trackName === trackName && dragState.eventIndex === eventIdx && dragState.type !== 'automation') return null;
                                    
                                    const isChord = event.notes.length > 1;
                                    return event.notes.map((note, noteIdx) => {
                                        const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural));
                                        if (!midi || !noteRange.includes(midi)) return null;
                                        
                                        const topPos = midiToRow(midi) * ROW_H;
                                        const hasMods = (note.volume !== undefined && note.volume !== 0) || (note.effects && note.effects.length > 0);
                                        let bgColor = isActive ? (isChord ? '#98c379' : '#61afef') : '#333';
                                        if (hasMods && isActive) bgColor = isChord ? '#b8e39a' : '#8ccceb'; 

                                        return (
                                            <div 
                                                key={`${trackName}-${eventIdx}-${noteIdx}`} 
                                                onMouseDown={(e) => handleEventMouseDown(e, trackName, eventIdx, midi)}
                                                style={{
                                                    position: 'absolute', left: event.time * SLOT_W + 1, top: topPos + 1, width: (event.duration * SLOT_W) - 2, height: ROW_H - 2,
                                                    background: bgColor, borderRadius: '2px', zIndex: isActive ? 10 : 2,
                                                    fontSize: '9px', color: '#000', overflow: 'hidden', paddingLeft: '2px', cursor: 'move'
                                                }}>
                                                {hasMods && (note.volume ? `v${note.volume}` : 'FX')}
                                                <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'e-resize', zIndex: 11 }} />
                                            </div>
                                        );
                                    });
                                });
                            })}

                            {/* GHOST NOTE */}
                            {ghostState && dragState?.type !== 'automation' && (
                                <div style={{
                                    position: 'absolute',
                                    left: ghostState.time * SLOT_W + 1,
                                    top: midiToRow((dragState?.originalMidiBase || 60) + ghostState.midiShift) * ROW_H + 1,
                                    width: (ghostState.duration * SLOT_W) - 2,
                                    height: ROW_H - 2,
                                    background: 'rgba(255, 255, 255, 0.3)',
                                    border: '1px dashed white',
                                    zIndex: 20,
                                    pointerEvents: 'none'
                                }} />
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. AUTOMATION DRAWER */}
                {showAutomation && (
                    <div style={{ height: `${autoHeight}px`, background: '#141414', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ display: 'flex', height: '24px', background: '#1c1c1c', borderBottom: '1px solid #333', alignItems: 'center', paddingLeft: '40px' }}>
                            <button onClick={() => setAutoMode('volume')} style={tabStyle(autoMode === 'volume')}>Volume</button>
                            <button onClick={() => setAutoMode('pan')} style={tabStyle(autoMode === 'pan')}>Pan</button>
                            <button onClick={() => setAutoMode('fade')} style={tabStyle(autoMode === 'fade')}>Fade Out (To 0)</button>
                            <button onClick={() => setAutoMode('swell')} style={tabStyle(autoMode === 'swell')}>Swell In (From 0)</button>
                        </div>
                        <div style={{ flex: 1, position: 'relative', overflowX: 'auto', overflowY: 'hidden' }}>
                            <div style={{ width: totalSlots * SLOT_W, height: '100%', position: 'relative', marginLeft: '40px' }}>
                                {/* Center Line for Pan/Vol */}
                                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#333' }} />
                                
                                {activePattern && activePattern.tracks[activeLane]?.map((event, i) => {
                                    let val = 0;
                                    
                                    if (autoMode === 'volume') {
                                        val = event.notes[0].volume || 0;
                                    } else if (autoMode === 'pan') {
                                        const fx = event.notes[0].effects?.find(e => e.code === 'P');
                                        val = fx ? fx.value : 0;
                                    } else if (autoMode === 'fade') {
                                        const fx = event.notes[0].effects?.find(e => e.code === 'F');
                                        val = fx ? fx.value : 0;
                                    } else if (autoMode === 'swell') {
                                        const fx = event.notes[0].effects?.find(e => e.code === 'S');
                                        val = fx ? fx.value : 0;
                                    }

                                    if (dragState?.type === 'automation' && dragState.eventIndex === i && ghostState?.val !== undefined) {
                                        val = ghostState.val;
                                    }

                                    let hPercent = 0;
                                    let color = '#61afef';

                                    if (autoMode === 'volume') {
                                        hPercent = Math.max(0, Math.min(100, 50 + (val * 2))); 
                                    } else if (autoMode === 'pan') {
                                        hPercent = 50 + (val / 2); // -100=0%, 0=50%, 100=100%
                                        color = '#d19a66'; 
                                    } else {
                                        // Fade / Swell (0 to 100)
                                        hPercent = Math.min(100, Math.max(0, val));
                                        color = autoMode === 'fade' ? '#e06c75' : '#c678dd';
                                    }

                                    return (
                                        <div key={i} onMouseDown={(e) => handleAutomationMouseDown(e, activeLane, i, val)}
                                            style={{
                                                position: 'absolute', left: event.time * SLOT_W, bottom: 0,
                                                width: Math.max(4, SLOT_W - 4), height: `${hPercent}%`,
                                                background: color, opacity: 0.6, borderTop: '2px solid #fff', cursor: 'ns-resize',
                                                display: 'flex', alignItems: 'flex-start', justifyContent: 'center'
                                            }}
                                        >
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

            {/* RESIZE HANDLE */}
            <div 
                onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY; const startH = height;
                    const doDrag = (ev: MouseEvent) => setHeight(Math.max(200, startH + (ev.clientY - startY)));
                    const stopDrag = () => { window.removeEventListener('mousemove', doDrag); window.removeEventListener('mouseup', stopDrag); };
                    window.addEventListener('mousemove', doDrag); window.addEventListener('mouseup', stopDrag);
                }} 
                style={{ height: '8px', background: '#222', borderTop: '1px solid #444', cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
            >
                <div style={{ width: '40px', height: '2px', background: '#555' }} />
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