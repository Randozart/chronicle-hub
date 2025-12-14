'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition, NoteDef } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument, disposeInstruments, AnyInstrument } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';

interface AudioContextType {
    playTrack: (source: string, instruments: InstrumentDefinition[], qualities?: PlayerQualities) => void;
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
    
    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const currentSourceRef = useRef<string>('');
    const currentInstrumentsRef = useRef<InstrumentDefinition[]>([]);
    const currentMockQualitiesRef = useRef<PlayerQualities>({}); 
    const noteCacheRef = useRef<Map<string, string>>(new Map());
    
    const activeSynthsRef = useRef<Set<AnyInstrument>>(new Set());
    const limiterRef = useRef<Tone.Limiter | null>(null);

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            limiterRef.current = new Tone.Limiter(-1).toDestination();
            
            // --- FIX: Use getTransport() ---
            if (Tone.getTransport().state !== 'started') {
                Tone.getTransport().start();
            }
            setIsInitialized(true);
            console.log("Audio Engine Started");
        } catch (e) {
            console.error("Failed to start audio context:", e);
        }
    };

    const stop = () => {
        const transport = Tone.getTransport(); // --- FIX: Get instance
        
        transport.stop();
        transport.cancel(); 
        
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];

        activeSynthsRef.current.forEach(synth => {
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                synth.releaseAll();
            }
        });
        activeSynthsRef.current.clear();
        noteCacheRef.current.clear(); 
        currentTrackRef.current = null;
        setIsPlaying(false);
    };

    const playTrack = async (
        ligatureSource: string, 
        instruments: InstrumentDefinition[],
        mockQualities: PlayerQualities = {}
    ) => {
        if (!isInitialized) await initializeAudio();
        
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource, mockQualities);
        
        stop(); 

        currentSourceRef.current = ligatureSource;
        currentInstrumentsRef.current = instruments;
        currentMockQualitiesRef.current = mockQualities;
        
        currentTrackRef.current = track;
        instrumentDefsRef.current = instruments;
        
        const instrumentsUsed = new Set(Object.values(track.instruments));
        const neededDefs = instruments.filter(i => instrumentsUsed.has(i.id));
        
        let hasSamplers = false;
        neededDefs.forEach(def => {
            getOrMakeInstrument(def); 
            if (def.type === 'sampler') hasSamplers = true;
        });

        if (hasSamplers) {
            setIsLoadingSamples(true);
            try {
                await Tone.loaded(); 
            } catch(e) {
                console.error("Failed to load samples:", e);
            }
            setIsLoadingSamples(false);
        }

        const transport = Tone.getTransport(); // --- FIX: Get instance

        transport.position = "0:0:0";
        transport.bpm.value = track.config.bpm;
        transport.swing = track.config.swing || 0;
        
        playSequenceFrom(0); 

        if (transport.state !== 'started') transport.start();
        setIsPlaying(true);
    };
    
    const playSequenceFrom = (playlistStartIndex: number) => {
        const track = currentTrackRef.current;
        if (!track) return;
        
        const transport = Tone.getTransport(); // --- FIX: Get instance for scheduling

        let totalBars = 0;
        let runningConfig = { ...track.config };

        for (const item of track.playlist) {
            if (item.type === 'command') {
                transport.scheduleOnce((time) => { // --- FIX: Use instance
                    if (item.command === 'BPM') transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                    if (item.command === 'Scale') {
                        const [root, mode] = item.value.split(' ');
                        runningConfig.scaleRoot = root;
                        runningConfig.scaleMode = mode || 'Major';
                    }
                }, `${totalBars}:0:0`);
                continue;
            }

            let longestPatternBars = 0;

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
                            try { synth.disconnect(); } catch(e) {} 
                            synth.connect(limiterRef.current);
                        }
                        
                        activeSynthsRef.current.add(synth);

                        const trackMod = pattern.trackModifiers[trackName];
                        const playlistVolume = patData.volume || 0; 
                        const trackVolume = trackMod?.volume || 0;
                        const totalVolDb = playlistVolume + trackVolume;

                        let baseVelocity = Math.pow(10, totalVolDb / 20);
                        baseVelocity = Math.max(0, Math.min(1, baseVelocity));

                        const toneEvents = events.map(event => {
                            const noteNames = event.notes.map(n => 
                                resolveAndCacheNote(
                                    n,
                                    runningConfig.scaleRoot,
                                    runningConfig.scaleMode,
                                    patData.transposition + (trackMod?.transpose || 0)
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
                            const humanizeAmt = runningConfig.humanize || 0;
                            let offset = 0;
                            let finalVel = baseVelocity;

                            if (humanizeAmt > 0) {
                                offset = (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                finalVel = baseVelocity * (1 + (Math.random() - 0.5) * 0.2 * humanizeAmt);
                            }
                            
                            finalVel = Math.max(0, Math.min(1, finalVel));
                            synth.triggerAttackRelease(value.notes, value.duration, time + offset, finalVel);
                        }, toneEvents).start(0);
                        
                        scheduledPartsRef.current.push(part);
                    }
                }
            });
            totalBars += longestPatternBars;
        }

        transport.loop = true;
        transport.loopEnd = `${totalBars}:0:0`;
        transport.start();
        setIsPlaying(true);
    };

    const resolveAndCacheNote = (noteDef: NoteDef, root: string, mode: string, transpose: number): string => {
        const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift}-${noteDef.accidental}-${noteDef.isNatural}`;
        if (noteCacheRef.current.has(key)) return noteCacheRef.current.get(key)!;
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