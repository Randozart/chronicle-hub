'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, SequenceEvent, InstrumentDefinition, NoteDef, PlaylistItem } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument, disposeInstruments } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';

interface AudioContextType {
    playTrack: (source: string, instruments: InstrumentDefinition[]) => void;
    stop: () => void;
    isPlaying: boolean;
    initializeAudio: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);
export const useAudio = () => useContext(AudioContext)!;

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const currentSourceRef = useRef<string>('');
    const currentInstrumentsRef = useRef<InstrumentDefinition[]>([]);
    const noteCacheRef = useRef<Map<string, string>>(new Map());
    const activeSynthsRef = useRef<Set<Tone.PolySynth>>(new Set());
    const limiterRef = useRef<Tone.Limiter | null>(null);

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            limiterRef.current = new Tone.Limiter(-1).toDestination();
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
            setIsInitialized(true);
            console.log("Audio Engine Started");
        } catch (e) {
            console.error("Failed to start audio context:", e);
        }
    };

    const stop = () => {
        Tone.Transport.stop();
        Tone.Transport.cancel(); 
        
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];

        activeSynthsRef.current.forEach(synth => {
            synth.releaseAll();
        });
        activeSynthsRef.current.clear();
        
        noteCacheRef.current.clear(); 
        setIsPlaying(false);
    };

    const playTrack = async (ligatureSource: string, instruments: InstrumentDefinition[]) => {
        if (!isInitialized) await initializeAudio();
        
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource);
        
        stop(); 

        currentSourceRef.current = ligatureSource;
        currentInstrumentsRef.current = instruments;
        currentTrackRef.current = track;
        instrumentDefsRef.current = instruments;
        
        Tone.Transport.position = "0:0:0";
        
        Tone.Transport.bpm.value = track.config.bpm;
        Tone.Transport.swing = track.config.swing || 0;
        
        let totalBars = 0;
        let runningConfig = { ...track.config };

        for (const item of track.playlist) {
            if (item.type === 'command') {
                Tone.Transport.scheduleOnce((time) => {
                    if (item.command === 'BPM') Tone.Transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                    if (item.command === 'Scale') {
                        const [root, mode] = item.value.split(' ');
                        runningConfig.scaleRoot = root;
                        runningConfig.scaleMode = mode || 'Major';
                    }
                }, `${totalBars}:0:0`);
                continue;
            }

            let longestPatternBars = 0;

            // --- FIX IS HERE: Use item.patterns instead of item.patternIds ---
            item.patterns.forEach((patData) => {
                const pattern = track.patterns[patData.id];
                if (!pattern) return;

                const { grid, timeSig } = runningConfig;
                const quarterNotesPerBeat = 4 / timeSig[1];
                const slotsPerBeat = grid * quarterNotesPerBeat;
                const slotsPerBar = slotsPerBeat * timeSig[0];
                const patternBars = Math.ceil(pattern.duration / slotsPerBar);
                longestPatternBars = Math.max(longestPatternBars, patternBars);

                for (const [trackName, events] of Object.entries(pattern.tracks)) {
                    const instId = track.instruments[trackName];
                    const instDef = instrumentDefsRef.current.find(d => d.id === instId);
                    
                    if (instDef) {
                        const synth = getOrMakeInstrument(instDef);
                        if (limiterRef.current) {
                            synth.disconnect();
                            synth.connect(limiterRef.current);
                        }
                        activeSynthsRef.current.add(synth);

                        const toneEvents = events.map(event => {
                            const noteNames = event.notes.map(n => 
                                resolveAndCacheNote(
                                    n,
                                    runningConfig.scaleRoot,
                                    runningConfig.scaleMode,
                                    patData.transposition // <-- Use per-pattern transposition
                                )
                            );
                            
                            const timeInSlots = event.time;
                            const bar = Math.floor(timeInSlots / slotsPerBar);
                            const beat = Math.floor((timeInSlots % slotsPerBar) / slotsPerBeat);
                            const sixteenth = (timeInSlots % slotsPerBeat) / (grid / 4);
                            
                            const durationSeconds = event.duration * (60 / runningConfig.bpm / (runningConfig.grid / 4));
                            
                            return {
                                time: `${totalBars + bar}:${beat}:${sixteenth}`,
                                duration: durationSeconds,
                                notes: noteNames,
                            };
                        });
                        
                        const part = new Tone.Part((time, value) => {
                            // Simple Humanization Logic
                            const humanizeAmt = runningConfig.humanize || 0;
                            let offset = 0;
                            let velocity = 1;

                            if (humanizeAmt > 0) {
                                offset = (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                velocity = 1 - (Math.random() * 0.2 * humanizeAmt);
                            }
                            
                            synth.triggerAttackRelease(value.notes, value.duration, time + offset, velocity);
                        }, toneEvents).start(0);
                        
                        scheduledPartsRef.current.push(part);
                    }
                }
            });
            totalBars += longestPatternBars;
        }

        Tone.Transport.loop = true;
        Tone.Transport.loopEnd = `${totalBars}:0:0`;
        Tone.Transport.start();
        setIsPlaying(true);
    };

    const resolveAndCacheNote = (noteDef: NoteDef, root: string, mode: string, transpose: number): string => {
        const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift}-${noteDef.accidental}-${noteDef.isNatural}`;
        if (noteCacheRef.current.has(key)) {
            return noteCacheRef.current.get(key)!;
        }
        const resolved = resolveNote(noteDef.degree + transpose, root, mode, noteDef.octaveShift, noteDef.accidental, noteDef.isNatural);
        noteCacheRef.current.set(key, resolved);
        return resolved;
    };

    useEffect(() => {
        return () => {
            stop();
            disposeInstruments();
        }
    }, []);

    return (
        <AudioContext.Provider value={{ playTrack, stop, isPlaying, initializeAudio }}>
            {children}
        </AudioContext.Provider>
    );
}