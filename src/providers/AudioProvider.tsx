// src/providers/AudioProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition, NoteDef, PlaylistItem, EffectCommand } from '@/engine/audio/models';
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

        activeSynthsRef.current.forEach(synth => {
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                synth.releaseAll();
                // Reset volume and frequency to defaults to prevent effects from bleeding
                synth.volume.value = -10; // Default fallback
                // synth.detune.value = 0;
            }
        });
        
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
        
        const trackSynthMap = new Map<string, AnyInstrument>();
        let hasSamplers = false;

        for (const [trackName, instConfig] of Object.entries(track.instruments)) {
            const baseDef = instruments.find(i => i.id === instConfig.id);
            if (!baseDef) continue;

            // Merging Instrument Config
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
            
            // Pass instrument-level effects if any
            if (instConfig.overrides.effects) {
                // We don't store them in the Definition object used for caching, 
                // but we need to access them during playback.
                // We'll retrieve them from the ParsedTrack object later.
            }

            const synth = getOrMakeInstrument(mergedDef);
            if (baseDef.type === 'sampler') hasSamplers = true;

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
                            
                            // Base volume for this instrument (used for resets and relative calcs)
                            const baseVolume = instConfig?.overrides.volume ?? baseDef?.config.volume ?? -10;

                             if (synth) {
                                const playlistVolume = chainItem.volume || 0; 
                                const trackVolume = trackMod?.volume || 0;
                                const totalVolDb = playlistVolume + trackVolume;
                                
                                // Base velocity from Track/Playlist levels
                                let baseVelocity = Math.pow(10, totalVolDb / 20);
                                baseVelocity = Math.max(0, Math.min(1, baseVelocity));

                                const toneEvents = events.map(event => {
                                    const noteNames = event.notes.map(n => 
                                        resolveAndCacheNote(
                                            n,
                                            runningConfig.scaleRoot,
                                            runningConfig.scaleMode,
                                            chainItem.transposition + (trackMod?.transpose || 0),
                                            mapping
                                        )
                                    );
                                    
                                    // NEW: Calculate Event Velocity including Note-Level Volume Modifiers (v:10)
                                    let eventVelocity = baseVelocity;
                                    // Use the first note's volume as the event volume (polyphony limitation)
                                    const noteVol = event.notes[0]?.volume || 0;
                                    
                                    if (noteVol !== 0) {
                                        const combinedDb = totalVolDb + noteVol;
                                        eventVelocity = Math.pow(10, combinedDb / 20);
                                    }
                                    eventVelocity = Math.max(0, Math.min(1, eventVelocity));
                                    
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
                                        velocity: eventVelocity, // PASS VELOCITY
                                        noteDefs: event.notes
                                    };
                                });

                                const part = new Tone.Part((time, value) => {
                                    synth.volume.cancelScheduledValues(time);
                                    synth.volume.setValueAtTime(baseVolume, time);

                                    // Humanize applied to the calculated velocity
                                    let finalVel = value.velocity;
                                    const humanizeAmt = runningConfig.humanize || 0;
                                    let offset = 0;
                                    
                                    if (humanizeAmt > 0) {
                                        offset = (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                        finalVel = finalVel * (1 + (Math.random() - 0.5) * 0.2 * humanizeAmt);
                                        // Update time for humanize offset
                                        time += offset;
                                    }
                                    finalVel = Math.max(0, Math.min(1, finalVel));

                                    synth.triggerAttackRelease(value.notes, value.duration, time, finalVel);

                                    // Effects Logic (Already provided in previous step, ensuring consistency)
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

    const resolveAndCacheNote = (noteDef: NoteDef, root: string, mode: string, transpose: number, mapping: 'diatonic' | 'chromatic'): string => {
        const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift}-${noteDef.accidental}-${noteDef.isNatural}-${mapping}`;
        if (noteCacheRef.current.has(key)) {
            return noteCacheRef.current.get(key)!;
        }
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