'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition } from '@/engine/audio/models';
import { getOrMakeInstrument, disposeInstruments, AnySoundSource } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';
import { AudioGraph, initializeAudioGraph, stopAllSound, setMasterVolume } from '@/engine/audio/graph';
import { scheduleSequence } from '@/engine/audio/scheduler'; 
import { PolySampler } from '@/engine/audio/polySampler';

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

    const activePreviewNoteRef = useRef<string | null>(null);

    const [limiterSettings, setLimiterSettings] = useState<LimiterSettings>({ enabled: true, threshold: -1 });
    const [masterVolume, setMasterVolumeState] = useState(0);

    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const scheduledEventsRef = useRef<number[]>([]); 
    const activeNotesPerPartRef = useRef<Map<Tone.Part, string[]>>(new Map());
    const activeSynthsRef = useRef<Set<AnySoundSource>>(new Set());
    
    const noteCacheRef = useRef<Map<string, string>>(new Map());

    const initializeAudio = async () => {
        if (isInitialized) return;
        await initializeAudioGraph(); 
        setIsInitialized(true);
    };

    // --- SHARED PREVIEW LOGIC ---
    const getPreviewSynth = async (def: InstrumentDefinition) => {
        // Use a stable ID for the preview instrument based on the Editor context
        const previewId = `__preview_editor_${def.id}`;
        const configStr = JSON.stringify(def.config);
        
        // If we already have this synth loaded and config hasn't changed, reuse it immediately
        if (previewSynthRef.current && currentPreviewIdRef.current === (def.id + configStr)) {
            return previewSynthRef.current;
        }

        // Create or Update the instrument
        const synth = await getOrMakeInstrument({ ...def, id: previewId });
        
        // Route to Master
        const output = (synth as any)._outputNode || synth;
        output.disconnect();
        if (AudioGraph.masterGain) {
            output.connect(AudioGraph.masterGain);
        } else {
            output.toDestination();
        }

        previewSynthRef.current = synth;
        currentPreviewIdRef.current = def.id + configStr;
        return synth;
    };

    const startPreviewNote = async (instrumentDef: InstrumentDefinition, note: string) => {
        if (Tone.context.state !== 'running') await Tone.context.resume();
        if (!isInitialized) await initializeAudio();

        activePreviewNoteRef.current = note;

        try {
            const synth = await getPreviewSynth(instrumentDef);
            
            // Safety check: is user still holding the button?
            if (activePreviewNoteRef.current === note) {
                // Pass undefined for time to default to "now"
                if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler || synth instanceof PolySampler) {
                    synth.triggerAttack(note);
                } else if ('triggerAttack' in synth) {
                    (synth as any).triggerAttack(note);
                }
            }
        } catch (e) {
            console.error("Preview error:", e);
        }
    };

    const stopPreviewNote = (note?: string) => {
        activePreviewNoteRef.current = null;

        if (previewSynthRef.current) {
            const synth = previewSynthRef.current;
            
            if (note) {
                if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler || synth instanceof PolySampler) {
                    synth.triggerRelease(note);
                } else if ('triggerRelease' in synth) {
                    (synth as any).triggerRelease(); 
                }
            } else {
                // Hard stop / Release All
                if ('stopAll' in synth) {
                    (synth as any).stopAll();
                } else if ('releaseAll' in synth) {
                    (synth as any).releaseAll();
                } else if ('triggerRelease' in synth) {
                    (synth as any).triggerRelease();
                }
            }
        }
    };

    const playPreviewNote = async (instrumentDef: InstrumentDefinition, note: string, duration: Tone.Unit.Time = '8n') => {
        if (Tone.context.state !== 'running') await Tone.context.resume();
        if (!isInitialized) await initializeAudio();
        
        stopPreviewNote(); // Stop any currently holding notes

        try {
            const synth = await getPreviewSynth(instrumentDef);
            
            // Pass undefined for time to default to "now"
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler || synth instanceof PolySampler) {
                synth.triggerAttackRelease(note, duration);
            } else if ('triggerAttackRelease' in synth) {
                 (synth as any).triggerAttackRelease(note, duration);
            }
        } catch (e) {
            console.error("One-shot error:", e);
        }
    };

    useEffect(() => {
        if (!AudioGraph.masterGain || !AudioGraph.limiter) return;
        setMasterVolume(masterVolume);
        if (AudioGraph.limiter) {
             AudioGraph.limiter.threshold.value = limiterSettings.enabled ? limiterSettings.threshold : 0;
        }
    }, [masterVolume, limiterSettings, isInitialized]);

    const stop = () => {
        stopAllSound(); 

        scheduledPartsRef.current.forEach(part => part.dispose());
        scheduledPartsRef.current = [];
        
        const transport = Tone.getTransport();
        scheduledEventsRef.current.forEach(id => transport.clear(id));
        scheduledEventsRef.current = [];

        activeNotesPerPartRef.current.clear();
        noteCacheRef.current.clear();
        
        activeSynthsRef.current.forEach(synth => {
            if ('stopAll' in synth) {
                (synth as any).stopAll();
            } else if ('releaseAll' in synth) {
                (synth as any).releaseAll();
            } else {
                synth.triggerRelease();
            }
            
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler || synth instanceof PolySampler) {
                if(synth.volume) synth.volume.cancelScheduledValues(0);
            } else {
                if((synth as any).volume) (synth as any).volume.cancelScheduledValues(0);
            }

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
                    },
                    // @ts-ignore
                    reverb: instConfig.overrides.reverb,
                    // @ts-ignore
                    delay: instConfig.overrides.delay,
                    // @ts-ignore
                    distortion: instConfig.overrides.distortion,
                    // @ts-ignore
                    bitcrush: instConfig.overrides.bitcrush,
                    // @ts-ignore
                    filter: instConfig.overrides.filter ? instConfig.overrides.filter : baseDef.config.filter,
                    // @ts-ignore
                    eq: instConfig.overrides.eq ? instConfig.overrides.eq : baseDef.config.eq,
                    // @ts-ignore
                    embellishments: baseDef.config.embellishments,
                    // @ts-ignore
                    portamento: baseDef.config.portamento,
                    // @ts-ignore
                    noteCut: baseDef.config.noteCut, 
                    // @ts-ignore
                    noteCutBleed: baseDef.config.noteCutBleed,
                    // @ts-ignore
                    vibrato: baseDef.config.vibrato
                }
            };
            
            const synth = await getOrMakeInstrument(mergedDef);
            if (playbackRequestIdRef.current !== requestId) return;

            const output = (synth as any)._outputNode || synth;
            output.disconnect(); 
            if (AudioGraph.masterGain) output.connect(AudioGraph.masterGain);
            
            activeSynthsRef.current.add(synth);
            trackSynthMap.set(trackName, synth);
        }
        setIsLoadingSamples(false);
        if (playbackRequestIdRef.current !== requestId) return;

        const transport = Tone.getTransport(); 
        transport.position = "0:0:0";
        transport.bpm.value = track.config.bpm;
        transport.swing = track.config.swing || 0;
        
        scheduleSequence(
            track,
            trackSynthMap,
            instruments,
            activeNotesPerPartRef.current,
            scheduledPartsRef.current,
            scheduledEventsRef.current,
            noteCacheRef.current
        );
        
        setMasterVolume(masterVolume);

        if (transport.state !== 'started') transport.start();
        setIsPlaying(true);
    };

    return (
        <AudioContext.Provider value={{ 
            playTrack, stop, isPlaying, initializeAudio, 
            limiterSettings, setLimiterSettings, 
            masterVolume: masterVolume, 
            setMasterVolume: (db) => { setMasterVolumeState(db); setMasterVolume(db); },
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