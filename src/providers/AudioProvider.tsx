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
import { preprocessStrudelSource } from '@/engine/audio/strudelPreprocessor';
import { getStrudelEngine, StrudelEngine } from '@/engine/audio/strudelEngine';

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
    /** Play a Strudel code string via the embedded Strudel REPL iframe. */
    playStrudelTrack: (source: string, qualities?: PlayerQualities, sampleMap?: Record<string, string>) => void;
    /** Stop Strudel playback. */
    stopStrudelTrack: () => void;
    /** True while the Strudel iframe has an active track loaded. */
    isStrudelPlaying: boolean;
    /** Re-evaluate the current Strudel track's ScribeScript templates against new quality values.
     *  Attempts a live postMessage update first; falls back to an iframe src reload if the code changed. */
    updateStrudelQualities: (newQualities: PlayerQualities) => void;
    /** Play a one-shot audio sample by URL (for sound stings / UI effects). */
    playSample: (url: string, volume?: number) => void;
    /** Player audio preferences — persisted to localStorage. */
    musicMuted: boolean;
    setMusicMuted: (muted: boolean) => void;
    /** Music volume for Strudel playback, 0–1.  Default 1.  Persisted to localStorage. */
    musicVolume: number;
    setMusicVolume: (v: number) => void;
    sfxMuted: boolean;
    setSfxMuted: (muted: boolean) => void;
    sfxVolume: number;
    setSfxVolume: (v: number) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);
export const useAudio = () => useContext(AudioContext)!;

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoadingSamples, setIsLoadingSamples] = useState(false);
    const [isStrudelPlaying, setIsStrudelPlaying] = useState(false);
    /** Shared @strudel/web engine — null until the dynamic import resolves. */
    const strudelEngineRef = useRef<StrudelEngine | null>(null);
    /** Raw (unprocessed) Strudel source last passed to playStrudelTrack. */
    const currentStrudelSourceRef = useRef<string>('');
    /** Last fully-evaluated code sent to Strudel (used by updateStrudelQualities). */
    const lastStrudelCodeRef = useRef<string>('');
    /** Code queued while the engine is still initialising. Played as soon as it's ready. */
    const pendingStrudelCodeRef = useRef<string>('');
    /** Processed code without the .gain() suffix — used to quickly re-apply a new volume level. */
    const preGainCodeRef = useRef<string>('');

    const playbackRequestIdRef = useRef(0);
    const previewSynthRef = useRef<AnySoundSource | null>(null);
    const currentPreviewIdRef = useRef<string>('');

    const activePreviewNoteRef = useRef<string | null>(null);

    const [limiterSettings, setLimiterSettings] = useState<LimiterSettings>({ enabled: true, threshold: -1 });
    const [masterVolume, setMasterVolumeState] = useState(0);

    // Player audio preferences — loaded from localStorage on first render
    const [musicMuted, setMusicMutedState] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('chronicle-audio-musicMuted') === 'true';
    });
    const [musicVolume, setMusicVolumeState] = useState<number>(() => {
        if (typeof window === 'undefined') return 1;
        const stored = localStorage.getItem('chronicle-audio-musicVolume');
        return stored !== null ? parseFloat(stored) : 1;
    });
    const [sfxMuted, setSfxMutedState] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('chronicle-audio-sfxMuted') === 'true';
    });
    const [sfxVolume, setSfxVolumeState] = useState<number>(() => {
        if (typeof window === 'undefined') return 0.8;
        const stored = localStorage.getItem('chronicle-audio-sfxVolume');
        return stored !== null ? parseFloat(stored) : 0.8;
    });

    const setMusicMuted = (muted: boolean) => {
        setMusicMutedState(muted);
        localStorage.setItem('chronicle-audio-musicMuted', String(muted));
        if (muted) {
            strudelEngineRef.current?.hush();
            pendingStrudelCodeRef.current = '';
            setIsStrudelPlaying(false);
        }
    };
    const setSfxMuted = (muted: boolean) => {
        setSfxMutedState(muted);
        localStorage.setItem('chronicle-audio-sfxMuted', String(muted));
    };
    const setSfxVolume = (v: number) => {
        const clamped = Math.max(0, Math.min(1, v));
        setSfxVolumeState(clamped);
        localStorage.setItem('chronicle-audio-sfxVolume', String(clamped));
    };

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
    const getPreviewSynth = async (def: InstrumentDefinition) => {
        const previewId = `__preview_editor_${def.id}`;
        const configStr = JSON.stringify(def.config);
        if (previewSynthRef.current && currentPreviewIdRef.current === (def.id + configStr)) {
            return previewSynthRef.current;
        }
        const synth = await getOrMakeInstrument({ ...def, id: previewId });
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
            if (activePreviewNoteRef.current === note) {
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
        
        stopPreviewNote();

        try {
            const synth = await getPreviewSynth(instrumentDef);
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

    // ------------------------------------------------------------------
    // Strudel playback via @strudel/web
    // ------------------------------------------------------------------

    // Initialise the shared Strudel engine on mount.
    // getStrudelEngine() is idempotent — safe to call from multiple components.
    // initStrudel() registers initAudioOnFirstClick() internally, so the
    // AudioContext will be resumed automatically on the first user interaction
    // anywhere on the page (no dedicated "unlock" button needed).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const origin = window.location.origin;
        getStrudelEngine(origin).then(engine => {
            strudelEngineRef.current = engine;
            // Play any track that was requested before the engine finished loading.
            const pending = pendingStrudelCodeRef.current;
            if (pending) {
                pendingStrudelCodeRef.current = '';
                engine.evaluate(pending).catch(e =>
                    console.warn('[AudioProvider] Strudel evaluate error:', e)
                );
                setIsStrudelPlaying(true);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const buildFinalCode = (source: string, qualities: PlayerQualities, sampleMap: Record<string, string>, vol?: number): string => {
        const processed = preprocessStrudelSource(source, qualities);
        const lines: string[] = [];
        // Cloud-uploaded samples declared inline (only when present).
        if (Object.keys(sampleMap).length > 0) {
            const entries = Object.entries(sampleMap)
                .map(([name, url]) => `  "${name}": "${url}"`)
                .join(',\n');
            lines.push(`samples({\n${entries}\n});`);
        }
        const preGain = lines.length > 0 ? `${lines.join('\n')}\n\n${processed}` : processed;
        preGainCodeRef.current = preGain;
        const effectiveVol = vol ?? musicVolume;
        return effectiveVol < 0.999 ? `${preGain}\n.postgain(${effectiveVol.toFixed(3)})` : preGain;
    };

    const setMusicVolume = (v: number) => {
        const clamped = Math.max(0, Math.min(1, v));
        setMusicVolumeState(clamped);
        localStorage.setItem('chronicle-audio-musicVolume', String(clamped));
        // Re-evaluate the current track immediately with the new gain level.
        const preGain = preGainCodeRef.current;
        if (preGain && strudelEngineRef.current && isStrudelPlaying) {
            const code = clamped < 0.999 ? `${preGain}\n.postgain(${clamped.toFixed(3)})` : preGain;
            lastStrudelCodeRef.current = code;
            strudelEngineRef.current.evaluate(code).catch(() => {});
        }
    };

    const playStrudelTrack = (
        source: string,
        qualities: PlayerQualities = {},
        sampleMap: Record<string, string> = {}
    ) => {
        if (musicMuted) return;
        const finalCode = buildFinalCode(source, qualities, sampleMap);
        currentStrudelSourceRef.current = source;
        lastStrudelCodeRef.current = finalCode;

        if (strudelEngineRef.current) {
            strudelEngineRef.current.evaluate(finalCode).catch(e =>
                console.warn('[AudioProvider] Strudel evaluate error:', e)
            );
            setIsStrudelPlaying(true);
        } else {
            // Engine still loading — queue the code; the init useEffect will play it.
            pendingStrudelCodeRef.current = finalCode;
        }
    };

    /**
     * Re-evaluates the current Strudel track's ScribeScript templates against
     * new quality values. Skipped when nothing has changed.
     */
    const updateStrudelQualities = (newQualities: PlayerQualities) => {
        const source = currentStrudelSourceRef.current;
        if (!source || !isStrudelPlaying) return;
        const newCode = buildFinalCode(source, newQualities, {});
        if (newCode === lastStrudelCodeRef.current) return;
        lastStrudelCodeRef.current = newCode;
        strudelEngineRef.current?.evaluate(newCode).catch(() => {});
    };

    const stopStrudelTrack = () => {
        strudelEngineRef.current?.hush();
        pendingStrudelCodeRef.current = '';
        currentStrudelSourceRef.current = '';
        lastStrudelCodeRef.current = '';
        setIsStrudelPlaying(false);
    };

    // ------------------------------------------------------------------
    // One-shot sample playback (sound stings / UI effects)
    // ------------------------------------------------------------------

    /** Play an audio file by URL once. Uses HTMLAudioElement — independent of
     *  Tone.js, so it works even before the audio graph is initialised. */
    const playSample = (url: string, volume: number = 1) => {
        if (sfxMuted) return;
        try {
            const audio = new Audio(url);
            audio.volume = Math.max(0, Math.min(1, volume * sfxVolume));
            audio.play().catch(e => console.warn('[AudioProvider] Sample playback failed:', e));
        } catch (e) {
            console.warn('[AudioProvider] playSample error:', e);
        }
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
                    delay: instConfig.overrides.delay,
                    distortion: instConfig.overrides.distortion,
                    bitcrush: instConfig.overrides.bitcrush,
                    filter: instConfig.overrides.filter ? instConfig.overrides.filter : baseDef.config.filter,
                    eq: instConfig.overrides.eq ? instConfig.overrides.eq : baseDef.config.eq,
                    embellishments: baseDef.config.embellishments,
                    portamento: baseDef.config.portamento,
                    noteCut: baseDef.config.noteCut, 
                    noteCutBleed: baseDef.config.noteCutBleed,
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
            masterVolume,
            setMasterVolume: (db) => { setMasterVolumeState(db); setMasterVolume(db); },
            playPreviewNote, startPreviewNote, stopPreviewNote,
            playStrudelTrack, stopStrudelTrack, isStrudelPlaying, updateStrudelQualities,
            playSample,
            musicMuted, setMusicMuted,
            musicVolume, setMusicVolume,
            sfxMuted, setSfxMuted,
            sfxVolume, setSfxVolume,
        }}>
            {children}

            {/* @strudel/web runs entirely in-page — no iframe required. */}

            {isLoadingSamples && (
                <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: '#111', color: '#61afef', padding: '10px 20px', borderRadius: '4px', border: '1px solid #61afef', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(97, 175, 239, 0.2)' }}>
                    Loading Instruments...
                </div>
            )}
        </AudioContext.Provider>
    );
}