// src/providers/AudioProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition } from '@/engine/audio/models';
import { getOrMakeInstrument, disposeInstruments, AnyInstrument } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';
import { TransportClass } from 'tone/build/esm/core/clock/Transport';

interface LimiterSettings {
    enabled: boolean;
    threshold: number;
}

interface AudioContextType {
    playTrack: (source: string, instruments: InstrumentDefinition[], qualities?: PlayerQualities) => void;
    stop: () => void;
    isPlaying: boolean;
    initializeAudio: () => Promise<void>;
    
    // --- NEW: Master Controls ---
    limiterSettings: LimiterSettings;
    setLimiterSettings: (settings: LimiterSettings) => void;
    masterVolume: number;
    setMasterVolume: (db: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);
export const useAudio = () => useContext(AudioContext)!;

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    
    // --- NEW: Audio Graph State ---
    const [limiterSettings, setLimiterSettings] = useState<LimiterSettings>({ enabled: true, threshold: -1 });
    const [masterVolume, setMasterVolume] = useState(0); // 0 dB default

    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    const scheduledPartsRef = useRef<Tone.Part[]>([]);

    const activeNotesPerPartRef = useRef<Map<Tone.Part, string[]>>(new Map());
    
    const activeSynthsRef = useRef<Set<AnyInstrument>>(new Set());
    
    // Audio Nodes
    const limiterRef = useRef<Tone.Limiter | null>(null);
    const masterGainRef = useRef<Tone.Gain | null>(null);

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            
            // Create Master Bus chain
            masterGainRef.current = new Tone.Gain(1); // 0 dB
            limiterRef.current = new Tone.Limiter(limiterSettings.threshold);
            
            // Initial Routing: Master -> Limiter -> Out
            masterGainRef.current.connect(limiterRef.current);
            limiterRef.current.toDestination();
            
            if (Tone.getTransport().state !== 'started') {
                Tone.getTransport().start();
            }
            setIsInitialized(true);
            console.log("Audio Engine Started");
        } catch (e) {
            console.error("Failed to start audio context:", e);
        }
    };

    // --- Dynamic Audio Graph Updates ---
    useEffect(() => {
        if (!masterGainRef.current || !limiterRef.current) return;

        // update volume
        masterGainRef.current.gain.value = Math.pow(10, masterVolume / 20);

        // update limiter
        limiterRef.current.threshold.value = limiterSettings.threshold;

        // update routing
        masterGainRef.current.disconnect();
        if (limiterSettings.enabled) {
            masterGainRef.current.connect(limiterRef.current);
        } else {
            masterGainRef.current.toDestination(); // Bypass limiter completely
        }
    }, [masterVolume, limiterSettings, isInitialized]);

    const stop = () => {
        const transport = Tone.getTransport();
        transport.stop();
        transport.cancel(); 
        
        scheduledPartsRef.current.forEach(part => {
            part.stop(0);
            part.dispose();
        });
        scheduledPartsRef.current = [];
        activeNotesPerPartRef.current.clear();

        // NEW: Clear the note resolution cache
        noteCacheRef.current.clear();
        
        activeSynthsRef.current.forEach(synth => {
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                synth.releaseAll();
                synth.volume.value = -10; 
            }
        });
        
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
        
        currentTrackRef.current = track; 
        instrumentDefsRef.current = instruments;
        
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

            // Route to Master Bus instead of Destination directly
            try { synth.disconnect(); } catch(e) {} 
            if (masterGainRef.current) {
                synth.connect(masterGainRef.current);
            } else {
                synth.toDestination(); // Fallback
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
            let maxChainBars = 0;

            item.layers.forEach(layer => {
                let chainSlots = 0;
                layer.items.forEach(chainItem => {
                    const pattern = track.patterns[chainItem.id];
                    if (pattern) chainSlots += pattern.duration;
                });
                const safeSlotsPerBar = slotsPerBar || 16;
                const chainBars = Math.ceil(chainSlots / safeSlotsPerBar);
                maxChainBars = Math.max(maxChainBars, chainBars);
            });

            if (maxChainBars === 0) continue;

            item.layers.forEach(layer => {
                let currentBarOffset = 0;
                let loopGuard = 0;
                const MAX_LOOPS = 1000;

                while (currentBarOffset < maxChainBars) {
                    if (loopGuard++ > MAX_LOOPS) break;
                    const startOffset = currentBarOffset;

                    for (const chainItem of layer.items) {
                        if (currentBarOffset >= maxChainBars) break;
                        const pattern = track.patterns[chainItem.id];
                        if (!pattern) continue;

                        const patternBars = Math.ceil(pattern.duration / slotsPerBar);
                        if (patternBars === 0) continue; 

                        for (const [trackName, events] of Object.entries(pattern.tracks)) {
                            const synth = trackSynthMap.get(trackName);
                            const instConfig = track.instruments[trackName];
                            const baseDef = instrumentDefsRef.current.find(d => d.id === instConfig.id);
                            const mapping = baseDef?.mapping || 'diatonic';

                            const instEffects = instConfig?.overrides.effects || [];
                            const trackMod = pattern.trackModifiers[trackName];
                            const trackEffects = trackMod?.effects || [];
                            
                            const baseVolume = instConfig?.overrides.volume ?? baseDef?.config.volume ?? -10;

                             if (synth) {
                                const playlistVolume = chainItem.volume || 0; 
                                const trackVolume = trackMod?.volume || 0;
                                const totalVolDb = playlistVolume + trackVolume;
                                
                                let baseVelocity = Math.pow(10, totalVolDb / 20);
                                baseVelocity = Math.max(0, Math.min(1, baseVelocity));

                                const toneEvents = events.map(event => {
                                    // Use Resolve Note helper from engine/scales here if available, or duplicate logic
                                    // Simplified for brevity, assume resolveAndCacheNote exists below
                                    return {
                                        time: event.time, // raw slot
                                        duration: event.duration,
                                        notes: event.notes,
                                        velocity: baseVelocity
                                    };
                                }).map(e => {
                                    // Convert slot time to bars:beats:sixteenths
                                    const timeInSlots = e.time;
                                    const bar = Math.floor(timeInSlots / slotsPerBar);
                                    const beatDivisor = (grid * (4 / timeSig[1])) || 1;
                                    const beat = Math.floor((timeInSlots % slotsPerBar) / beatDivisor);
                                    const sixteenthDivisor = (grid / 4) || 1;
                                    const sixteenth = (timeInSlots % beatDivisor) / sixteenthDivisor;
                                    const durationSeconds = e.duration * (60 / runningConfig.bpm / sixteenthDivisor);

                                    // Calc velocity per note
                                    const noteVol = e.notes[0]?.volume || 0;
                                    let eventVelocity = e.velocity;
                                    if(noteVol !== 0) {
                                        eventVelocity = Math.pow(10, (totalVolDb + noteVol) / 20);
                                    }
                                    
                                    // Resolve pitches
                                    const noteNames = e.notes.map(n => 
                                        resolveAndCacheNote(
                                            n, runningConfig.scaleRoot, runningConfig.scaleMode, 
                                            chainItem.transposition + (trackMod?.transpose || 0), mapping
                                        )
                                    );

                                    return {
                                        time: `${totalBars + currentBarOffset + bar}:${beat}:${sixteenth}`,
                                        duration: durationSeconds,
                                        notes: noteNames,
                                        velocity: eventVelocity,
                                        noteDefs: e.notes
                                    };
                                });

                                const part = new Tone.Part((time, value) => {
                                    const instConfig = track.instruments[trackName];
                                    const baseDef = instrumentDefsRef.current.find(d => d.id === instConfig.id);
                                    
                                    // --- 1. Common Logic (run for every note) ---
                                    
                                    // Humanize velocity and time
                                    let finalVel = value.velocity;
                                    const humanizeAmt = runningConfig.humanize || 0;
                                    if (humanizeAmt > 0) {
                                        time += (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                        finalVel = finalVel * (1 + (Math.random() - 0.5) * 0.2 * humanizeAmt);
                                    }
                                    finalVel = Math.max(0, Math.min(1, finalVel));

                                    // Reset volume and apply effects for this note event
                                    const baseVolume = instConfig?.overrides.volume ?? baseDef?.config.volume ?? -10;
                                    synth.volume.cancelScheduledValues(time);
                                    synth.volume.setValueAtTime(baseVolume, time);

                                    const instEffects = instConfig?.overrides.effects || [];
                                    const trackMod = pattern.trackModifiers[trackName];
                                    const trackEffects = trackMod?.effects || [];
                                    const noteEffects = value.noteDefs[0]?.effects || [];
                                    const activeEffects = [...instEffects, ...trackEffects, ...noteEffects];
                                    
                                    activeEffects.forEach(fx => {
                                        if (fx.code === 'F') {
                                            const range = (fx.value === 0) ? 100 : Math.abs(fx.value);
                                            const targetVol = baseVolume - range;
                                            synth.volume.setValueAtTime(baseVolume, time);
                                            synth.volume.rampTo(targetVol, value.duration - 0.1, time);
                                        } else if (fx.code === 'S') {
                                            const range = (fx.value === 0) ? 100 : Math.abs(fx.value);
                                            const startVol = baseVolume - range;
                                            synth.volume.setValueAtTime(startVol, time);
                                            synth.volume.rampTo(baseVolume, value.duration - 0.1, time);
                                        }
                                    });

                                    // --- 2. Playback Logic (Mutually Exclusive) ---

                                    if (baseDef?.config.noteCut) {
                                        // --- A) NOTE CUT LOGIC (Monophonic) ---
                                        
                                        // Cut off the previously playing note on this part/track
                                        const previousNotes = activeNotesPerPartRef.current.get(part);
                                        if (previousNotes) {
                                            synth.triggerRelease(previousNotes, time);
                                        }

                                        // Start the new note
                                        synth.triggerAttack(value.notes, time, finalVel);
                                        
                                        // Schedule its release for the future
                                        transport.scheduleOnce((releaseTime) => {
                                            synth.triggerRelease(value.notes, releaseTime);
                                            activeNotesPerPartRef.current.delete(part);
                                        }, time + value.duration);

                                        // Store this new note as the "active" one
                                        activeNotesPerPartRef.current.set(part, value.notes);

                                    } else {
                                        // --- B) STANDARD LOGIC (Polyphonic) ---
                                        // This is the ONLY place this function should be called.
                                        synth.triggerAttackRelease(value.notes, value.duration, time, finalVel);
                                    }

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

    // Re-implemented helper locally to avoid missing ref
    const noteCacheRef = useRef<Map<string, string>>(new Map());
    
    // Import resolveNote from scales if not available in closure, assumed imported
    const resolveAndCacheNote = (noteDef: any, root: string, mode: string, transpose: number, mapping: any): string => {
        // We use the imported helper
        // Assuming resolveNote is imported at top
        const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift}-${noteDef.accidental}-${noteDef.isNatural}-${mapping}`;
        if (noteCacheRef.current.has(key)) return noteCacheRef.current.get(key)!;
        
        // This relies on your existing resolveNote function
        // For self-containment here:
        const { resolveNote } = require('@/engine/audio/scales'); 
        const forceNatural = mapping === 'chromatic';
        const resolved = resolveNote(noteDef.degree + transpose, root, mode, noteDef.octaveShift, noteDef.accidental, noteDef.isNatural || forceNatural);
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
        <AudioContext.Provider value={{ 
            playTrack, stop, isPlaying, initializeAudio, 
            limiterSettings, setLimiterSettings,
            masterVolume, setMasterVolume
        }}>
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