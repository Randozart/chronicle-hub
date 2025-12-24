'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, InstrumentDefinition } from '@/engine/audio/models';
import { getOrMakeInstrument, disposeInstruments, AnySoundSource } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { PlayerQualities } from '@/engine/models';
import { AudioGraph, initializeAudioGraph, stopAllSound, setMasterVolume } from '@/engine/audio/graph';
import { scheduleSequence } from '@/engine/audio/scheduler'; 

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
    const [masterVolume, setMasterVolumeState] = useState(0);

    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]);
    
    const scheduledPartsRef = useRef<Tone.Part[]>([]);
    const scheduledEventsRef = useRef<number[]>([]); 
    const activeNotesPerPartRef = useRef<Map<Tone.Part, string[]>>(new Map());
    const activeSynthsRef = useRef<Set<AnySoundSource>>(new Set());

    const initializeAudio = async () => {
        if (isInitialized) return;
        await initializeAudioGraph(); 
        setIsInitialized(true);
    };

    const startPreviewNote = async (instrumentDef: InstrumentDefinition, note: string) => {
        if (!isInitialized) await initializeAudio();

        const newId = instrumentDef.id + JSON.stringify(instrumentDef.config);

        if (!previewSynthRef.current || currentPreviewIdRef.current !== newId) {
            if (previewSynthRef.current) previewSynthRef.current.dispose();
            try {
                const newSynth = await getOrMakeInstrument({ ...instrumentDef, id: `__preview_${instrumentDef.id}` });
                const output = (newSynth as any)._outputNode || newSynth;
                output.disconnect();
                if (AudioGraph.masterGain) output.connect(AudioGraph.masterGain);
                else output.toDestination();
                
                previewSynthRef.current = newSynth;
                currentPreviewIdRef.current = newId;
            } catch (e) {
                return;
            }
        }
        
        if (previewSynthRef.current instanceof Tone.PolySynth || previewSynthRef.current instanceof Tone.Sampler) {
            previewSynthRef.current.triggerAttack(note, Tone.now());
        } else {
            previewSynthRef.current.triggerAttack(note, Tone.now());
        }
    };

    const stopPreviewNote = (note?: string) => {
        if (previewSynthRef.current) {
            const synth = previewSynthRef.current;
            if (note) {
                if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                    synth.triggerRelease(note, Tone.now());
                } else {
                    synth.triggerRelease(Tone.now()); 
                }
            } else {
                if ('releaseAll' in synth) (synth as any).releaseAll();
                else synth.triggerRelease(Tone.now());
            }
        }
    };

    const playPreviewNote = async (instrumentDef: InstrumentDefinition, note: string, duration: Tone.Unit.Time = '8n') => {
        if (!isInitialized) await initializeAudio();
        stopPreviewNote(); 

        try {
            const tempSynth = await getOrMakeInstrument({ ...instrumentDef, id: `__preview_oneshot_${Math.random()}` });
            const output = (tempSynth as any)._outputNode || tempSynth;
            output.disconnect();
            
            if (AudioGraph.masterGain) output.connect(AudioGraph.masterGain);

            if (tempSynth instanceof Tone.PolySynth || tempSynth instanceof Tone.Sampler) {
                tempSynth.triggerAttackRelease(note, duration, Tone.now());
            } else {
                 tempSynth.triggerAttackRelease(note, duration, Tone.now());
            }
            const releaseTime = instrumentDef.config.envelope?.release ?? 1.0;
            setTimeout(() => { tempSynth.dispose(); }, (Tone.Time(duration).toSeconds() + releaseTime) * 1000 + 200);
        } catch (e) {
            console.error("Error playing one-shot preview:", e);
        }
    };

    useEffect(() => {
        if (!AudioGraph.masterGain || !AudioGraph.limiter) return;
        
        setMasterVolume(masterVolume); // Updates graph
        
        if (AudioGraph.limiter) {
             AudioGraph.limiter.threshold.value = limiterSettings.enabled ? limiterSettings.threshold : 0;
        }
    }, [masterVolume, limiterSettings, isInitialized]);

    const stop = () => {
        stopAllSound(); // Mutes master

        scheduledPartsRef.current.forEach(part => part.dispose());
        scheduledPartsRef.current = [];
        
        const transport = Tone.getTransport();
        scheduledEventsRef.current.forEach(id => transport.clear(id));
        scheduledEventsRef.current = [];

        activeNotesPerPartRef.current.clear();
        
        activeSynthsRef.current.forEach(synth => {
            if ('stopAll' in synth) {
                (synth as any).stopAll(Tone.now());
            } else if ('releaseAll' in synth) {
                (synth as any).releaseAll();
            } else {
                synth.triggerRelease(Tone.now());
            }
            
            // Cancel internal volume automation
            if (synth instanceof Tone.PolySynth || synth instanceof Tone.Sampler) {
                synth.volume.cancelScheduledValues(0);
            } else {
                synth.volume.cancelScheduledValues(0);
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
                    noteCut: baseDef.config.noteCut, // Ensure noteCut is passed
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
            scheduledEventsRef.current
        );
        
        // --- FIX: Restore Master Volume after Stop mute ---
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