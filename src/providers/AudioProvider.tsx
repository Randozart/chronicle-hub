// src/providers/AudioProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition, NoteDef, PlaylistItem } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument, disposeInstruments, AnyInstrument } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';
import { TransportClass } from 'tone/build/esm/core/clock/Transport';

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
        const transport = Tone.getTransport();
        transport.stop();
        transport.cancel(); 
        
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];

        // Release all notes on active synths to prevent hanging
        activeSynthsRef.current.forEach(synth => {
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                synth.releaseAll();
            }
        });
        
        // Note: We do NOT dispose instruments here anymore. 
        // We let the cache persist to prevent reloading samples on every stop/play.
        // disposeInstruments() is only called on unmount.
        
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
        
        // --- OPTIMIZATION: PRE-LOAD INSTRUMENTS ---
        // Instead of doing this inside the loop, we map TrackName -> SynthInstance once.
        const trackSynthMap = new Map<string, AnyInstrument>();
        let hasSamplers = false;

        for (const [trackName, instConfig] of Object.entries(track.instruments)) {
            const baseDef = instruments.find(i => i.id === instConfig.id);
            if (!baseDef) continue;

            const mergedDef: InstrumentDefinition = {
                ...baseDef,
                config: {
                    ...baseDef.config,
                    volume: instConfig.overrides.volume ?? baseDef.config.volume,
                    envelope: {
                        ...baseDef.config.envelope,
                        attack: (instConfig.overrides.attack !== undefined ? instConfig.overrides.attack : baseDef.config.envelope?.attack) || 0.01,
                        decay: instConfig.overrides.decay ?? baseDef.config.envelope?.decay,
                        sustain: instConfig.overrides.sustain ?? baseDef.config.envelope?.sustain,
                        release: (instConfig.overrides.release !== undefined ? instConfig.overrides.release : baseDef.config.envelope?.release) || 1
                    }
                }
            };

            const synth = getOrMakeInstrument(mergedDef);
            if (baseDef.type === 'sampler') hasSamplers = true;

            // Connect once
            if (limiterRef.current) {
                try { synth.disconnect(); } catch(e) {} 
                synth.connect(limiterRef.current);
            }
            
            activeSynthsRef.current.add(synth);
            trackSynthMap.set(trackName, synth);
        }

        if (hasSamplers) {
            setIsLoadingSamples(true);
            try { await Tone.loaded(); } catch(e) { console.error("Failed to load samples:", e); }
            setIsLoadingSamples(false);
        }

        const transport = Tone.getTransport(); 
        transport.position = "0:0:0";
        transport.bpm.value = track.config.bpm;
        transport.swing = track.config.swing || 0;
        
        // Pass the pre-configured map to the scheduler
        playSequenceFrom(0, transport, trackSynthMap); 

        if (transport.state !== 'started') transport.start();
        setIsPlaying(true);
    };
    
    const playSequenceFrom = (
        playlistStartIndex: number, 
        transport: TransportClass, 
        trackSynthMap: Map<string, AnyInstrument>
    ) => {
        const track = currentTrackRef.current;
        if (!track) return;
        
        let totalBars = 0;
        let runningConfig = { ...track.config };

        for (const item of track.playlist) {
            if (item.type === 'command') {
                transport.scheduleOnce((time: number) => {
                    if (item.command === 'BPM') transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                    if (item.command === 'Scale') {
                        const [root, mode] = item.value.split(' ');
                        runningConfig.scaleRoot = root;
                        runningConfig.scaleMode = mode || 'Major';
                    }
                }, `${totalBars}:0:0`);
                continue;
            }

            const { grid, timeSig } = runningConfig;
            const slotsPerBar = grid * (4 / timeSig[1]) * timeSig[0];

            // 1. Calculate Chain Durations (in Bars)
            let maxChainBars = 0;
            const layerDurations: number[] = [];

            item.layers.forEach((layer, layerIndex) => {
                let chainSlots = 0;
                layer.items.forEach(chainItem => {
                    const pattern = track.patterns[chainItem.id];
                    if (pattern) chainSlots += pattern.duration;
                });
                // Fix: Ensure we don't divide by zero if something is malformed
                const safeSlotsPerBar = slotsPerBar || 16;
                const chainBars = Math.ceil(chainSlots / safeSlotsPerBar);
                layerDurations[layerIndex] = chainBars;
                maxChainBars = Math.max(maxChainBars, chainBars);
            });

            // Safeguard: If no duration, skip this playlist item
            if (maxChainBars === 0) continue;

            // 2. Schedule Each Layer (Looping if needed)
            item.layers.forEach((layer, layerIndex) => {
                let currentBarOffset = 0;
                
                // *** CRITICAL FIX: Loop Protection ***
                let loopGuard = 0;
                const MAX_LOOPS = 1000; // Hard limit to prevent browser crash

                // Keep repeating the chain until we cover the maxChainBars duration
                while (currentBarOffset < maxChainBars) {
                    
                    if (loopGuard++ > MAX_LOOPS) {
                        console.warn("Infinite Loop Detected in Ligature AudioProvider. Breaking.");
                        break;
                    }

                    // Track if we actually advanced time in this iteration
                    const startOffset = currentBarOffset;

                    for (const chainItem of layer.items) {
                        if (currentBarOffset >= maxChainBars) break;

                        const pattern = track.patterns[chainItem.id];
                        // If pattern missing, skip
                        if (!pattern) continue;

                        const patternBars = Math.ceil(pattern.duration / slotsPerBar);
                        
                        // If pattern has 0 duration (e.g. empty pattern), force it to 1 bar 
                        // or skip it to prevent infinite loop. 
                        // Standard Rest patterns should have duration.
                        if (patternBars === 0) continue; 

                        // Schedule events for this pattern instance
                        for (const [trackName, events] of Object.entries(pattern.tracks)) {
                            // OPTIMIZATION: Use the pre-connected synth
                            const synth = trackSynthMap.get(trackName);
                            if (synth) {
                                const trackMod = pattern.trackModifiers[trackName];
                                const playlistVolume = chainItem.volume || 0; 
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
                                            chainItem.transposition + (trackMod?.transpose || 0)
                                        )
                                    );
                                    
                                    const timeInSlots = event.time;
                                    const bar = Math.floor(timeInSlots / slotsPerBar);
                                    // Use safe math for beat/sixteenth calculation
                                    const beatDivisor = (grid * (4 / timeSig[1])) || 1;
                                    const beat = Math.floor((timeInSlots % slotsPerBar) / beatDivisor);
                                    const sixteenthDivisor = (grid / 4) || 1;
                                    const sixteenth = (timeInSlots % beatDivisor) / sixteenthDivisor;
                                    
                                    const durationSeconds = event.duration * (60 / runningConfig.bpm / sixteenthDivisor);
                                    
                                    return {
                                        time: `${totalBars + currentBarOffset + bar}:${beat}:${sixteenth}`,
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
                        
                        currentBarOffset += patternBars;
                    }

                    // *** CRITICAL FIX: If we didn't advance time at all in this loop iteration (e.g. empty chain), break to avoid freeze.
                    if (currentBarOffset === startOffset) {
                        break; 
                    }
                }
            });

            // Advance Global Cursor by the length of the longest chain
            totalBars += maxChainBars;
        }

        transport.loop = true;
        transport.loopEnd = `${totalBars}:0:0`;
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