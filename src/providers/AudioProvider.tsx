'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, SequenceEvent, InstrumentDefinition } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument } from '@/engine/audio/synth';
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
    
    // --- REFS FOR PERSISTENT STATE ---
    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    
    // --- NEW REFS TO FIX SCOPE ERROR ---
    const currentSourceRef = useRef<string>('');
    const currentInstrumentsRef = useRef<InstrumentDefinition[]>([]);

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
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
        Tone.Transport.cancel(); 
        
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];

        currentTrackRef.current = null;
        setIsPlaying(false);
    };

    const playTrack = async (ligatureSource: string, instruments: InstrumentDefinition[]) => {
        if (!isInitialized) await initializeAudio();
        
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource);
        
        stop(); 

        // --- STORE SOURCE FOR THE LOOP ---
        currentSourceRef.current = ligatureSource;
        currentInstrumentsRef.current = instruments;

        currentTrackRef.current = track;
        instrumentDefsRef.current = instruments;
        
        Tone.Transport.position = "0:0:0";
        if (Tone.Transport.state !== 'started') {
            Tone.Transport.start();
        }
        
        Tone.Transport.bpm.value = track.config.bpm;
        
        playSequenceFrom(0); 
        setIsPlaying(true);
    };
    
    const playSequenceFrom = (playlistStartIndex: number) => {
        const track = currentTrackRef.current;
        if (!track) return;

        let currentBar = 0;

        for (let i = playlistStartIndex; i < track.playlist.length; i++) {
            const item = track.playlist[i];
            let longestPatternBars = 0;

            item.patternIds.forEach(patId => {
                const pattern = track.patterns[patId];
                if (!pattern) return;

                const { grid, timeSig } = track.config;
                const quarterNotesPerBeat = 4 / timeSig[1];
                const slotsPerBeat = grid * quarterNotesPerBeat;
                const slotsPerBar = slotsPerBeat * timeSig[0];
                const patternBars = pattern.duration / slotsPerBar;
                longestPatternBars = Math.max(longestPatternBars, patternBars);

                for (const [trackName, events] of Object.entries(pattern.tracks)) {
                    const instId = track.instruments[trackName];
                    const instDef = instrumentDefsRef.current.find(d => d.id === instId);
                    
                    if (instDef) {
                        const synth = getOrMakeInstrument(instDef);
                        const toneEvents = events.map(event => {
                            const noteNames = event.notes.map(n => 
                                resolveNote(
                                    n.degree + item.transposition,
                                    track.config.scaleRoot,
                                    track.config.scaleMode,
                                    n.octaveShift,
                                    n.accidental,
                                    n.isNatural
                                )
                            );
                            
                            const timeInSlots = event.time;
                            const bar = currentBar + Math.floor(timeInSlots / slotsPerBar);
                            const beat = Math.floor((timeInSlots % slotsPerBar) / slotsPerBeat);
                            const sixteenth = (timeInSlots % slotsPerBeat) / (grid / 4);
                            const durationInSixteenths = (event.duration * (4 / grid));
                            
                            return {
                                time: `${bar}:${beat}:${sixteenth}`,
                                duration: `${durationInSixteenths}n`,
                                notes: noteNames,
                            };
                        });
                        
                        const part = new Tone.Part((time, value) => {
                            synth.triggerAttackRelease(value.notes, value.duration, time);
                        }, toneEvents).start(0);

                        scheduledPartsRef.current.push(part);
                    }
                }
            });
            currentBar += longestPatternBars;
        }

        // Schedule the loop to happen at the end of the entire sequence
        Tone.Transport.scheduleOnce(() => {
            // Use the refs to get the original source and instruments for a clean restart
            playTrack(currentSourceRef.current, currentInstrumentsRef.current);
        }, `${currentBar}:0:0`);
    };

    return (
        <AudioContext.Provider value={{ playTrack, stop, isPlaying, initializeAudio }}>
            {children}
        </AudioContext.Provider>
    );
}