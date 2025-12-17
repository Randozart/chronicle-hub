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
    
    // Replace this method in AudioProvider.tsx
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
        let maxChainBars = 0;
        
        item.layers.forEach(layer => {
            let chainSlots = 0;
            layer.items.forEach(chainItem => {
                const pattern = track.patterns[chainItem.id];
                if (pattern) chainSlots += pattern.duration;
            });
            const safeSlotsPerBar = slotsPerBar || 1;
            const chainBars = Math.ceil(chainSlots / safeSlotsPerBar);
            maxChainBars = Math.max(maxChainBars, chainBars);
        });

        if (maxChainBars === 0) continue;

        item.layers.forEach(layer => {
            let currentBarOffset = 0;
            let loopGuard = 0;
            const MAX_LOOPS = 1000;

            while (currentBarOffset < maxChainBars) {
                if (loopGuard++ > MAX_LOOPS) { console.warn("Infinite Loop Detected. Breaking."); break; }
                const startOffset = currentBarOffset;

                for (const chainItem of layer.items) {
                    if (currentBarOffset >= maxChainBars) break;
                    const pattern = track.patterns[chainItem.id];
                    if (!pattern) continue;
                    const patternBars = Math.ceil(pattern.duration / slotsPerBar) || 1;

                    for (const [trackName, events] of Object.entries(pattern.tracks)) {
                        const synth = trackSynthMap.get(trackName);
                        // Lookup Definition to check mapping
                        const instConfig = track.instruments[trackName];
                        // Note: instrumentDefsRef holds the definition list passed to playTrack
                        const baseDef = instrumentDefsRef.current.find(d => d.id === instConfig.id);
                        
                        if (synth && baseDef) {
                            // Default to 'diatonic' (scale-relative) if undefined
                            const mapping = baseDef.mapping || 'diatonic';

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
                                        chainItem.transposition + (trackMod?.transpose || 0),
                                        mapping // Pass mapping
                                    )
                                );
                                const timeInSlots = event.time;
                                const bar = Math.floor(timeInSlots / slotsPerBar);
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
                if (currentBarOffset === startOffset) break; 
            }
        });
        totalBars += maxChainBars;
    }

    transport.loop = true;
    transport.loopEnd = `${totalBars}:0:0`;
};

// Replace this method in AudioProvider.tsx
const resolveAndCacheNote = (
    noteDef: NoteDef, 
    root: string, 
    mode: string, 
    transpose: number, 
    mapping: 'diatonic' | 'chromatic' // New Param
): string => {
    
    // Unique cache key including mapping strategy
    const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift}-${noteDef.accidental}-${noteDef.isNatural}-${mapping}`;
    
    if (noteCacheRef.current.has(key)) {
        return noteCacheRef.current.get(key)!;
    }
    
    // LOGIC: If chromatic, we force isNatural=true.
    // In resolveNote(), isNatural=true forces the scale to 'Major'.
    // Since 'Major' is Chromatic relative to C (0, 2, 4...), 
    // this effectively maps 1->C, 2->D, 3->E... regardless of the song's actual Key (A Minor, etc).
    // This assumes the sampler is mapped to C Major keys (C4, D4, E4...).
    
    const forceNatural = mapping === 'chromatic';
    
    const resolved = resolveNote(
        noteDef.degree + transpose, 
        root, 
        mode, 
        noteDef.octaveShift, 
        noteDef.accidental, 
        noteDef.isNatural || forceNatural
    );
    
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