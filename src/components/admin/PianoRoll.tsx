'use client';
import { useEffect, useState, useMemo } from 'react';
import { ParsedTrack, NoteDef } from '@/engine/audio/models';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';
import { resolveNote } from '@/engine/audio/scales';
import { Note, Scale } from 'tonal';

interface Props {
    source: string;
    qualities?: PlayerQualities;
    onChange: (newSource: string) => void;
}

const SLOT_W = 20;
const ROW_H = 14; 
const HEADER_W = 100;

export default function PianoRoll({ source, qualities = {}, onChange }: Props) {
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);

    useEffect(() => {
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source, qualities);
            setParsedTrack(track);
            
            const patternKeys = Object.keys(track.patterns);
            if (patternKeys.length > 0 && (!selectedPatternId || !track.patterns[selectedPatternId])) {
                setSelectedPatternId(patternKeys[0]);
            }
        } catch (e) {}
    }, [source, qualities, selectedPatternId]);

    const activePattern = parsedTrack?.patterns[selectedPatternId];
    const config = parsedTrack?.config;

    const { noteRange, scaleNotesWithOctaves } = useMemo(() => {
        if (!activePattern || !config) {
            return { noteRange: [], scaleNotesWithOctaves: [] };
        }

        const notesInPattern = Object.values(activePattern.tracks).flat().flatMap(e => e.notes);
        const midiNotes = notesInPattern.map(n => 
            Note.midi(resolveNote(n.degree, config.scaleRoot, config.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 0
        ).filter(m => m > 0);
        
        const minMidi = Math.min(48, ...midiNotes);
        const maxMidi = Math.max(84, ...midiNotes);
        const range = Array.from({ length: maxMidi - minMidi + 1 }, (_, i) => minMidi + i);
        const scale = Scale.get(`${config.scaleRoot} ${config.scaleMode.toLowerCase()}`);
        
        return { noteRange: range, scaleNotesWithOctaves: scale.notes };
    }, [activePattern, config]);

    const handleCellClick = (trackName: string, time: number, noteDef: NoteDef) => {
        if (!parsedTrack || !selectedPatternId) return;
        
        const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
        const pattern = newTrack.patterns[selectedPatternId];
        const trackEvents = pattern.tracks[trackName] || [];

        // Find an event that starts at this time
        const eventAtTime = trackEvents.find(e => Math.round(e.time) === time);
        
        if (eventAtTime) {
            // Event exists, check if this specific note is in it
            const noteIndex = eventAtTime.notes.findIndex(n => 
                n.degree === noteDef.degree && n.octaveShift === noteDef.octaveShift
            );

            if (noteIndex > -1) {
                // Note exists in the chord, remove it
                eventAtTime.notes.splice(noteIndex, 1);
                // If the chord is now empty, remove the whole event
                if (eventAtTime.notes.length === 0) {
                    pattern.tracks[trackName] = trackEvents.filter(e => e !== eventAtTime);
                }
            } else {
                // Event exists, but this note isn't in it. Add it to the chord.
                eventAtTime.notes.push(noteDef);
            }
        } else {
            // No event at this time, create a new one with just this note
            trackEvents.push({ time, duration: 1, notes: [noteDef] });
        }
        
        trackEvents.sort((a, b) => a.time - b.time);
        pattern.tracks[trackName] = trackEvents;
        
        const parser = new LigatureParser();
        onChange(parser.stringify(newTrack));
    };

    if (!parsedTrack || !activePattern || !config) return null;
    
    const { grid, timeSig } = config;
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const slotsPerBar = slotsPerBeat * timeSig[0]; // <-- This was the missing variable
    const totalSlots = activePattern.duration;
    const trackNames = Object.keys(activePattern.tracks);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#111', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>VISUAL EDITOR:</span>
                <select 
                    value={selectedPatternId} 
                    onChange={e => setSelectedPatternId(e.target.value)}
                    className="form-select"
                    style={{ width: 'auto', padding: '0.2rem 1rem', fontSize: '0.8rem' }}
                >
                    {Object.keys(parsedTrack.patterns).map(pid => (
                        <option key={pid} value={pid}>{pid}</option>
                    ))}
                </select>
            </div>

            <div style={{ width: '100%', overflow: 'auto', border: '1px solid #333', background: '#181a1f', display: 'flex' }}>
                {/* KEYBOARD (Y-AXIS) */}
                <div style={{ flexShrink: 0 }}>
                    {noteRange.slice().reverse().map(midi => {
                        const noteName = Note.fromMidi(midi);
                        const isScaleNote = scaleNotesWithOctaves.includes(Note.pitchClass(noteName));
                        const isBlackKey = noteName.includes('#');
                        return (
                            <div key={midi} style={{ 
                                height: `${ROW_H}px`, width: '50px',
                                background: isBlackKey ? '#111' : '#333',
                                color: isScaleNote ? '#fff' : '#777',
                                borderTop: isScaleNote ? `1px solid #555` : 'none',
                                fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '5px', boxSizing: 'border-box'
                            }}>
                                {noteName}
                            </div>
                        );
                    })}
                </div>

                {/* GRID AREA */}
                <div style={{ flexShrink: 0, position: 'relative' }}>
                    {trackNames.map((name) => (
                        <div key={name} style={{ position: 'relative', height: `${noteRange.length * ROW_H}px`, width: `${totalSlots * SLOT_W}px`}}>
                            {/* Grid Lines */}
                            {Array.from({ length: totalSlots }).map((_, time) => {
                                const isBar = time % slotsPerBar === 0;
                                const isBeat = time % slotsPerBeat === 0;
                                return <div key={time} style={{ position: 'absolute', top: 0, left: time * SLOT_W, width: '1px', height: '100%', background: isBar ? '#555' : isBeat ? '#333' : '#222' }} />;
                            })}
                            
                            {/* --- CORRECTED: NOTE BLOCK RENDERING --- */}
                            {activePattern.tracks[name]?.map((event, eventIdx) => (
                                // Iterate over EVERY note in the event
                                event.notes.map((noteDef, noteIdx) => {
                                    const midi = Note.midi(resolveNote(noteDef.degree, config.scaleRoot, config.scaleMode, noteDef.octaveShift, noteDef.accidental, noteDef.isNatural));
                                    if (midi === null || !noteRange.includes(midi)) return null;

                                    const yIndex = noteRange.length - 1 - (midi - noteRange[0]);

                                    return (
                                        <div key={`${eventIdx}-${noteIdx}`} style={{
                                            position: 'absolute',
                                            top: `${yIndex * ROW_H + 1}px`, // +1 for visual spacing
                                            left: `${event.time * SLOT_W}px`,
                                            width: `${event.duration * SLOT_W - 1}px`,
                                            height: `${ROW_H - 2}px`,
                                            background: '#61afef',
                                            borderRadius: '2px',
                                            border: '1px solid #98c379',
                                            zIndex: 5,
                                            pointerEvents: 'none'
                                        }} />
                                    );
                                })
                            ))}

                            {/* Clickable Cells Overlay */}
                              {noteRange.slice().reverse().map((midi) => (
                                <div key={midi} style={{ display: 'flex', height: `${ROW_H}px` }}>
                                    {Array.from({ length: totalSlots }).map((_, time) => {
                                        const noteName = Note.fromMidi(midi);
                                        const degreeIndex = scaleNotesWithOctaves.indexOf(Note.pitchClass(noteName));
                                        
                                        // --- FIX: Use Note.accidental ---
                                        const accidentalStr = Note.accidentals(noteName);
                                        const accidentalVal = accidentalStr === '#' ? 1 : accidentalStr === 'b' ? -1 : 0;
                                        // ------------------------------
                                        
                                        const cellNoteDef: NoteDef = {
                                            degree: degreeIndex + 1,
                                            octaveShift: (Note.octave(noteName) || 4) - 4,
                                            accidental: accidentalVal,
                                            isNatural: false
                                        };
                                        
                                        return (
                                            <div 
                                                key={time}
                                                onClick={() => handleCellClick(name, time, cellNoteDef)}
                                                style={{ width: `${SLOT_W}px`, height: `${ROW_H}px`, cursor: 'pointer' }}
                                                className="piano-roll-cell"
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
             <style jsx>{`
                .piano-roll-cell:hover {
                    background-color: rgba(152, 195, 121, 0.2) !important;
                }
            `}</style>
        </div>
    );
}