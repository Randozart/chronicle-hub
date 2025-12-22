'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition, NoteDef } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument, disposeInstruments, AnySoundSource } from '@/engine/audio/synth';
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
    limiterSettings: LimiterSettings;
    setLimiterSettings: (settings: LimiterSettings) => void;
    masterVolume: number;
    setMasterVolume: (db: number) => void;
    playPreviewNote: (instrumentDef: InstrumentDefinition, note: string, duration?: Tone.Unit.Time) => void;
    startPreviewNote: (instrumentDef: InstrumentDefinition, note: string) => void;
    stopPreviewNote: (note?: string) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);
export const useAudio = () => useContext(AudioContext)!;

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    
    const playbackRequestIdRef = useRef(0);
    const previewSynthRef = useRef<AnySoundSource | null>(null);
    const currentPreviewIdRef = useRef<string>('');

    const [limiterSettings, setLimiterSettings] = useState<LimiterSettings>({ enabled: true, threshold: -1 });
    const [masterVolume, setMasterVolume] = useState(0);

    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const scheduledEventsRef = useRef<number[]>([]); 
    const activeNotesPerPartRef = useRef<Map<Tone.Part, string[]>>(new Map());
    const activeSynthsRef = useRef<Set<AnySoundSource>>(new Set());
    
    const limiterRef = useRef<Tone.Limiter | null>(null);
    const masterGainRef = useRef<Tone.Gain | null>(null);
    const noteCacheRef = useRef<Map<string, string>>(new Map());

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            masterGainRef.current = new Tone.Gain(0);
            limiterRef.current = new Tone.Limiter(-1);
            masterGainRef.current.connect(limiterRef.current);
            limiterRef.current.toDestination();
            setIsInitialized(true);
        } catch (e) {
            console.error("Failed to start audio context:", e);
        }
    };

    const startPreviewNote = async (instrumentDef: InstrumentDefinition, note: string) => {
        if (!isInitialized) await initializeAudio();
        const newId = instrumentDef.id + JSON.stringify(instrumentDef.config);
        if (!previewSynthRef.current || currentPreviewIdRef.current !== newId) {
            if (previewSynthRef.current) previewSynthRef.current.dispose();
            try {
                const newSynth = await getOrMakeInstrument({ ...instrumentDef, id: `__preview_${instrumentDef.id}` });
                if (masterGainRef.current) newSynth.connect(masterGainRef.current);
                else newSynth.toDestination();
                previewSynthRef.current = newSynth;
                currentPreviewIdRef.current = newId;
            } catch (e) {
                return;
            }
        }
        previewSynthRef.current?.triggerAttack(note, Tone.now());
    };
    const stopPreviewNote = (note?: string) => {
        if (previewSynthRef.current) {
            if (note) previewSynthRef.current.triggerRelease(note, Tone.now());
            else previewSynthRef.current.releaseAll();
        }
    };

    const playPreviewNote = async (instrumentDef: InstrumentDefinition, note: string, duration: Tone.Unit.Time = '8n') => {
        if (!isInitialized) await initializeAudio();
        stopPreviewNote(); 
        try {
            const tempSynth = await getOrMakeInstrument({ ...instrumentDef, id: `__preview_oneshot_${Math.random()}` });
            if (masterGainRef.current) tempSynth.connect(masterGainRef.current);
            tempSynth.triggerAttackRelease(note, duration, Tone.now());
            const releaseTime = instrumentDef.config.envelope?.release ?? 1.0;
            setTimeout(() => { tempSynth.dispose(); }, (Tone.Time(duration).toSeconds() + releaseTime) * 1000 + 200);
        } catch (e) {
            console.error("Error playing one-shot preview:", e);
        }
    };

    useEffect(() => {
        if (!masterGainRef.current || !limiterRef.current) return;
        masterGainRef.current.gain.value = Tone.dbToGain(masterVolume);
        limiterRef.current.threshold.value = limiterSettings.enabled ? limiterSettings.threshold : 0;
    }, [masterVolume, limiterSettings, isInitialized]);

    const stop = () => {
        const transport = Tone.getTransport();
        if(masterGainRef.current) {
            masterGainRef.current.gain.cancelScheduledValues(0);
            masterGainRef.current.gain.value = 0; 
            setTimeout(() => { 
                if(masterGainRef.current) masterGainRef.current.gain.rampTo(Tone.dbToGain(masterVolume), 0.1); 
            }, 50);
        }
        transport.stop();
        transport.cancel(); 
        scheduledPartsRef.current.forEach(part => part.dispose());
        scheduledPartsRef.current = [];
        scheduledEventsRef.current.forEach(id => transport.clear(id));
        scheduledEventsRef.current = [];
        activeNotesPerPartRef.current.clear();
        noteCacheRef.current.clear();
        activeSynthsRef.current.forEach(synth => {
            synth.releaseAll();
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) synth.volume.cancelScheduledValues(0);
            if (synth._panner) {
                synth._panner.pan.cancelScheduledValues(0);
                synth._panner.pan.value = 0;
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
        const requestId = ++playbackRequestIdRef.current;
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource, mockQualities);
        
        stop(); 
        disposeInstruments();
        
        currentTrackRef.current = track; 
        instrumentDefsRef.current = instruments;
        
        const trackSynthMap = new Map<string, AnySoundSource>();
        setIsLoadingSamples(true);
        
        for (const [trackName, instConfig] of Object.entries(track.instruments)) {
            if (playbackRequestIdRef.current !== requestId) return;
            const baseDef = instruments.find(i => i.id === instConfig.id);
            if (!baseDef) continue;
            const mergedDef: InstrumentDefinition = {
                ...baseDef,
                config: {
                    ...baseDef.config,
                    volume: instConfig.overrides.volume ?? baseDef.config.volume,
                    envelope: {
                        ...baseDef.config.envelope,
                        attack: instConfig.overrides.attack ?? baseDef.config.envelope?.attack,
                        decay: instConfig.overrides.decay ?? baseDef.config.envelope?.decay,
                        sustain: instConfig.overrides.sustain ?? baseDef.config.envelope?.sustain,
                        release: instConfig.overrides.release ?? baseDef.config.envelope?.release
                    }
                }
            };
            const synth = await getOrMakeInstrument(mergedDef);
            if (playbackRequestIdRef.current !== requestId) return;

            if (masterGainRef.current) {
                if (synth._panner) {
                    synth._panner.disconnect();
                    synth._panner.connect(masterGainRef.current);
                } else {
                    synth.disconnect();
                    synth.connect(masterGainRef.current);
                }
            }
            activeSynthsRef.current.add(synth);
            trackSynthMap.set(trackName, synth);
        }
        setIsLoadingSamples(false);
        if (playbackRequestIdRef.current !== requestId) return;

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
        trackSynthMap: Map<string, AnySoundSource>
    ) => {
        const track = currentTrackRef.current;
        if (!track) return;
        
        let totalBars = 0;
        let runningConfig = { ...track.config };

        for (const item of track.playlist) {
            if (item.type === 'command') {
                const eventId = transport.scheduleOnce((time: number) => {
                    if (item.command === 'BPM') transport.bpm.rampTo(parseFloat(item.value), 0.1, time);
                    if (item.command === 'Scale') {
                        const [root, mode] = item.value.split(' ');
                        runningConfig.scaleRoot = root;
                        runningConfig.scaleMode = mode || 'Major';
                    }
                }, `${totalBars}:0:0`);
                scheduledEventsRef.current.push(eventId);
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
                maxChainBars = Math.max(maxChainBars, Math.ceil(chainSlots / (slotsPerBar || 16)));
            });

            if (maxChainBars === 0) continue;

            item.layers.forEach(layer => {
                let currentBarOffset = 0;
                let loopGuard = 0;
                while (currentBarOffset < maxChainBars && loopGuard++ < 1000) {
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
                            if (!instConfig) continue;

                            const baseDef = instrumentDefsRef.current.find(d => d.id === instConfig.id);
                            const mapping = baseDef?.mapping || 'diatonic';
                            const instEffects = instConfig.overrides.effects || [];
                            const trackMod = pattern.trackModifiers[trackName];
                            const trackEffects = trackMod?.effects || [];
                            
                            // FIX: Get global octave offset from instrument config
                            const instOctaveOffset = instConfig.overrides.octaveOffset ?? baseDef?.config.octaveOffset ?? 0;

                            const toneEvents = events.map(event => {
                                const totalVolDb = (chainItem.volume || 0) + (trackMod?.volume || 0);
                                let velocity = Math.pow(10, totalVolDb / 20);
                                const noteVol = event.notes[0]?.volume || 0;
                                if (noteVol !== 0) velocity = Math.pow(10, (totalVolDb + noteVol) / 20);
                                
                                const timeInSlots = event.time;
                                const bar = Math.floor(timeInSlots / slotsPerBar);
                                const beatDivisor = (grid * (4 / timeSig[1]));
                                const beat = Math.floor((timeInSlots % slotsPerBar) / beatDivisor);
                                const sixteenthDivisor = grid / 4;
                                const sixteenth = (timeInSlots % beatDivisor) / sixteenthDivisor;
                                const durationSeconds = event.duration * (60 / runningConfig.bpm / sixteenthDivisor);

                                const noteNames = event.notes.map(n => 
                                    resolveAndCacheNote(
                                        n, 
                                        runningConfig.scaleRoot, 
                                        runningConfig.scaleMode, 
                                        (chainItem.transposition || 0) + (trackMod?.transpose || 0), 
                                        mapping,
                                        instOctaveOffset // Pass octave offset
                                    )
                                );

                                return {
                                    time: `${totalBars + currentBarOffset + bar}:${beat}:${sixteenth}`,
                                    duration: durationSeconds,
                                    notes: noteNames,
                                    velocity,
                                    noteDefs: event.notes,
                                    pan: (trackMod?.pan || 0) / 100 
                                };
                            });

                             if (synth) {
                                const part = new Tone.Part((time, value) => {
                                    const baseVolume = instConfig.overrides.volume ?? baseDef?.config.volume ?? -10;
                                    let finalVel = value.velocity;
                                    
                                    const humanizeAmt = runningConfig.humanize || 0;
                                    if (humanizeAmt > 0) {
                                        time += (Math.random() - 0.5) * 0.03 * humanizeAmt; 
                                        finalVel = finalVel * (1 + (Math.random() - 0.5) * 0.2 * humanizeAmt);
                                    }
                                    finalVel = Math.max(0, Math.min(1, finalVel));

                                    if (synth._panner) {
                                        let panVal = value.pan;
                                        const noteEffects = value.noteDefs[0]?.effects || [];
                                        const panFx = noteEffects.find(fx => fx.code === 'P');
                                        if (panFx) panVal = panFx.value / 100;
                                        synth._panner.pan.setValueAtTime(panVal, time);
                                    }

                                    synth.volume.cancelScheduledValues(time);
                                    synth.volume.setValueAtTime(baseVolume, time);

                                    const noteEffects = value.noteDefs[0]?.effects || [];
                                    [...instEffects, ...trackEffects, ...noteEffects].forEach(fx => {
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

                                     if (baseDef?.config.noteCut) {
                                        const previousNotes = activeNotesPerPartRef.current.get(part);
                                        if (previousNotes) synth.triggerRelease(previousNotes, time);
                                        synth.triggerAttack(value.notes, time, finalVel);
                                        transport.scheduleOnce((releaseTime) => {
                                            synth.triggerRelease(value.notes, releaseTime);
                                            activeNotesPerPartRef.current.delete(part);
                                        }, time + value.duration);
                                        activeNotesPerPartRef.current.set(part, value.notes);
                                    } else {
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

    const resolveAndCacheNote = (
        noteDef: NoteDef, 
        root: string, 
        mode: string, 
        transpose: number, 
        mapping: 'diatonic' | 'chromatic',
        extraOctave: number = 0
    ): string => {
        const key = `${noteDef.degree + transpose}-${root}-${mode}-${noteDef.octaveShift + extraOctave}-${noteDef.accidental}-${noteDef.isNatural}-${mapping}`;
        if (noteCacheRef.current.has(key)) return noteCacheRef.current.get(key)!;
        
        const resolved = resolveNote(
            noteDef.degree + transpose, 
            root, 
            mode, 
            noteDef.octaveShift + extraOctave, 
            noteDef.accidental, 
            noteDef.isNatural || mapping === 'chromatic'
        );
        noteCacheRef.current.set(key, resolved);
        return resolved;
    };

    useEffect(() => { 
        return () => { 
            stop(); 
            if (previewSynthRef.current) previewSynthRef.current.dispose();
            disposeInstruments(); 
        } 
    }, []);

    return (
        <AudioContext.Provider value={{ 
            playTrack, stop, isPlaying, initializeAudio, 
            limiterSettings, setLimiterSettings, masterVolume, setMasterVolume,
            playPreviewNote, startPreviewNote, stopPreviewNote 
        }}>
            {children}
            {isLoadingSamples && (
                <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: '#111', color: '#61afef', padding: '10px 20px', borderRadius: '4px', border: '1px solid #61afef', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(97, 175, 239, 0.2)' }}>
                    Loading Instruments...
                </div>
            )}
        </AudioContext.Provider>
    );
}