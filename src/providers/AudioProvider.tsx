'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, SequenceEvent, InstrumentDefinition, NoteDef, PlaylistItem } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument, disposeInstruments, AnyInstrument } from '@/engine/audio/synth';
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
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    
    // Refs for state that shouldn't trigger re-renders or needs to be accessed inside callbacks
    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const noteCacheRef = useRef<Map<string, string>>(new Map());
    
    // We track active synths to force-stop them when switching tracks
    const activeSynthsRef = useRef<Set<AnyInstrument>>(new Set());
    
    // Master Output Nodes
    const limiterRef = useRef<Tone.Limiter | null>(null);

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            
            // Master Limiter: Prevents volume from ever exceeding -1dB (safety)
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
        // 1. Stop Transport
        Tone.Transport.stop();
        Tone.Transport.cancel(); 
        
        // 2. Dispose of scheduled Parts (the note events)
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];

        // 3. Silence all active Instruments immediately
        activeSynthsRef.current.forEach(synth => {
            if (synth instanceof Tone.PolySynth) {
                synth.releaseAll();
            } else if (synth instanceof Tone.Sampler) {
                synth.releaseAll();
            }
        });
        activeSynthsRef.current.clear();
        
        // 4. Clear Note Cache (Scales/Keys might change next track)
        noteCacheRef.current.clear(); 
        
        currentTrackRef.current = null;
        setIsPlaying(false);
    };

    const playTrack = async (ligatureSource: string, instruments: InstrumentDefinition[]) => {
        if (!isInitialized) await initializeAudio();
        
        // 1. Parse
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource);
        
        // 2. Cleanup Old Track
        stop(); 

        // 3. Update Refs
        currentTrackRef.current = track;
        instrumentDefsRef.current = instruments;
        
        // 4. PRE-LOAD SAMPLERS
        // We iterate through all instruments used in the track.
        // If any are Samplers, we instantiate them now so they start downloading.
        const instrumentsUsed = new Set(Object.values(track.instruments));
        const neededDefs = instruments.filter(i => instrumentsUsed.has(i.id));
        
        let hasSamplers = false;
        neededDefs.forEach(def => {
            // This factory function caches instances, so calling it here is safe/efficient
            getOrMakeInstrument(def); 
            if (def.type === 'sampler') hasSamplers = true;
        });

        // 5. WAIT FOR BUFFERS (If needed)
        if (hasSamplers) {
            setIsLoadingSamples(true);
            try {
                await Tone.loaded(); // Suspends execution until all buffers are ready
            } catch(e) {
                console.error("Failed to load samples:", e);
            }
            setIsLoadingSamples(false);
        }

        // 6. Reset Transport
        Tone.Transport.position = "0:0:0";
        Tone.Transport.bpm.value = track.config.bpm;
        Tone.Transport.swing = track.config.swing || 0;
        
        // 7. Schedule the Sequence
        playSequenceFrom(0); 

        // 8. Start
        if (Tone.Transport.state !== 'started') Tone.Transport.start();
        setIsPlaying(true);
    };
    
    const playSequenceFrom = (playlistStartIndex: number) => {
        const track = currentTrackRef.current;
        if (!track) return;

        let totalBars = 0;
        let runningConfig = { ...track.config };

        // --- PLAYLIST LOOP ---
        for (const item of track.playlist) {
            
            // A. COMMANDS (BPM/Scale changes)
            if (item.type === 'command') {
                Tone.Transport.scheduleOnce((time) => {
                    if (item.command === 'BPM') {
                        Tone.Transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                    }
                    if (item.command === 'Scale') {
                        const [root, mode] = item.value.split(' ');
                        runningConfig.scaleRoot = root;
                        runningConfig.scaleMode = mode || 'Major';
                    }
                }, `${totalBars}:0:0`);
                continue; // Commands take 0 time
            }

            // B. PATTERNS
            let longestPatternBars = 0;

            item.patterns.forEach((patRef) => {
                const pattern = track.patterns[patRef.id];
                if (!pattern) return;

                const { grid, timeSig } = runningConfig;
                // Calculate Bars duration for visual layout logic
                const quarterNotesPerBeat = 4 / timeSig[1];
                const slotsPerBeat = grid * quarterNotesPerBeat;
                const slotsPerBar = slotsPerBeat * timeSig[0];
                
                const patternBars = Math.ceil(pattern.duration / slotsPerBar);
                longestPatternBars = Math.max(longestPatternBars, patternBars);

                // Iterate Tracks in this Pattern
                for (const [trackName, events] of Object.entries(pattern.tracks)) {
                    const instId = track.instruments[trackName];
                    const instDef = instrumentDefsRef.current.find(d => d.id === instId);
                    
                    if (instDef) {
                        const synth = getOrMakeInstrument(instDef);
                        
                        // Connect to Limiter for Safety
                        if (limiterRef.current) {
                            try { synth.disconnect(); } catch(e) {} // Safety check if already disconnected
                            synth.connect(limiterRef.current);
                        }
                        
                        activeSynthsRef.current.add(synth);

                        // --- MIXING CALCULATION ---
                        // 1. Modifiers from Grid Header: "Bass(v:-5)"
                        const trackMod = pattern.trackModifiers[trackName];
                        
                        // 2. Modifiers from Playlist: "Theme(v:-2)" (Not yet in parser, but ready in logic)
                        const playlistVolume = patRef.volume || 0; 
                        const trackVolume = trackMod?.volume || 0;
                        const totalVolDb = playlistVolume + trackVolume;

                        // Convert dB to Velocity (0 to 1 scale)
                        // -6dB is roughly 0.5 velocity
                        const baseVelocity = Math.pow(10, totalVolDb / 20);
                        const clampedVelocity = Math.max(0, Math.min(1, baseVelocity));
                        // --------------------------

                        const toneEvents = events.map(event => {
                            const noteNames = event.notes.map(n => 
                                resolveAndCacheNote(
                                    n,
                                    runningConfig.scaleRoot,
                                    runningConfig.scaleMode,
                                    patRef.transposition + (trackMod?.transpose || 0)
                                )
                            );
                            
                            // Accurate Time Calculation
                            const timeInSlots = event.time;
                            const bar = Math.floor(timeInSlots / slotsPerBar);
                            const beat = Math.floor((timeInSlots % slotsPerBar) / slotsPerBeat);
                            const sixteenth = (timeInSlots % slotsPerBeat) / (grid / 4);
                            
                            // Accurate Duration (in Seconds to avoid quantization drift)
                            const durationSeconds = event.duration * (60 / runningConfig.bpm / (runningConfig.grid / 4));
                            
                            return {
                                time: `${totalBars + bar}:${beat}:${sixteenth}`,
                                duration: durationSeconds,
                                notes: noteNames,
                            };
                        });
                        
                        const part = new Tone.Part((time, value) => {
                            // --- HUMANIZATION ---
                            const humanizeAmt = runningConfig.humanize || 0;
                            let offset = 0;
                            let finalVel = clampedVelocity;

                            if (humanizeAmt > 0) {
                                // +/- 15ms random offset
                                offset = (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                // +/- 10% velocity variation
                                finalVel = clampedVelocity * (1 + (Math.random() - 0.5) * 0.2 * humanizeAmt);
                            }
                            
                            synth.triggerAttackRelease(value.notes, value.duration, time + offset, finalVel);
                        }, toneEvents).start(0);
                        
                        scheduledPartsRef.current.push(part);
                    }
                }
            });
            totalBars += longestPatternBars;
        }

        // --- ENDLESS LOOP ---
        Tone.Transport.loop = true;
        Tone.Transport.loopEnd = `${totalBars}:0:0`;
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
            {isLoadingSamples && (
                <div style={{
                    position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
                    background: '#111', color: '#61afef', padding: '10px 20px',
                    borderRadius: '4px', border: '1px solid #61afef', fontSize: '0.8rem',
                    boxShadow: '0 0 10px rgba(97, 175, 239, 0.2)'
                }}>
                    Loading Instruments...
                </div>
            )}
        </AudioContext.Provider>
    );
}