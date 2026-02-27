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
    const strudelIframeRef = useRef<HTMLIFrameElement | null>(null);
    /** Raw (unprocessed) Strudel source last passed to playStrudelTrack. */
    const currentStrudelSourceRef = useRef<string>('');
    /** Last fully-evaluated code sent to the Strudel iframe. */
    const lastStrudelCodeRef = useRef<string>('');
    
    /** True once the Strudel iframe has finished loading a real Strudel URL (not about:blank). */
    const strudelIframeReadyRef = useRef(false);

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
            if (strudelIframeRef.current) strudelIframeRef.current.src = 'about:blank';
            strudelIframeReadyRef.current = false;
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
    // Strudel iframe-based playback
    // ------------------------------------------------------------------

    /** Build a Strudel embed URL. Evaluation is triggered via postMessage after load. */
    const buildStrudelUrl = (code: string): string => {
        try {
            return `https://strudel.cc/?embed#${btoa(code)}`;
        } catch {
            return 'about:blank';
        }
    };

    const buildFinalCode = (source: string, qualities: PlayerQualities, sampleMap: Record<string, string>): string => {
        const processed = preprocessStrudelSource(source, qualities);
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const lines: string[] = [];
        // Load local sample banks from the game server — mirrors creator studio behaviour.
        // The /strudel-samples endpoint has CORS headers so the cross-origin strudel.cc
        // iframe can fetch it.
        lines.push(`samples('${origin}/strudel-samples');`);
        if (Object.keys(sampleMap).length > 0) {
            const entries = Object.entries(sampleMap)
                .map(([name, url]) => `  "${name}": "${url}"`)
                .join(',\n');
            lines.push(`samples({\n${entries}\n});`);
        }
        return `${lines.join('\n')}\n\n${processed}`;
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

        if (strudelIframeRef.current) {
            if (strudelIframeReadyRef.current) {
                // Strudel is already loaded and the AudioContext is running (the user has
                // already clicked ▶ at least once this session). Send the new code directly
                // via postMessage — stays in any current user-gesture context and avoids a
                // full page reload that would expire the gesture before Strudel re-initialises.
                try {
                    strudelIframeRef.current.contentWindow?.postMessage(
                        { type: 'strudel-eval', code: finalCode },
                        '*'
                    );
                } catch { /* cross-origin postMessage blocked */ }
                // Mark as playing immediately — AudioContext is already running.
                setIsStrudelPlaying(true);
            } else {
                // iframe is at about:blank (first play or after stop) — do a full src load so
                // Strudel initialises. We do NOT set isStrudelPlaying here because the
                // browser's autoplay policy will block the AudioContext until the user clicks
                // the ▶ button. The onLoad handler marks the iframe as ready; the ▶ click
                // then sends strudel-eval within the user gesture to actually start audio.
                strudelIframeRef.current.src = buildStrudelUrl(finalCode);
                // Keep isStrudelPlaying = false so the ▶ button is visible.
            }
        }
    };

    /**
     * Re-evaluates the currently playing Strudel track's ScribeScript templates
     * against new player qualities. Attempts a live postMessage update so the
     * pattern keeps playing without restarting; falls back to an iframe src
     * reload only if the evaluated code actually changed.
     */
    const updateStrudelQualities = (newQualities: PlayerQualities) => {
        const source = currentStrudelSourceRef.current;
        if (!source || !isStrudelPlaying) return;

        const newCode = buildFinalCode(source, newQualities, {});
        if (newCode === lastStrudelCodeRef.current) return; // no change

        lastStrudelCodeRef.current = newCode;

        // Attempt a seamless live-code update via postMessage.
        // Strudel's REPL listens for { type: 'strudel-eval', code } messages —
        // this works with self-hosted Strudel and may work with strudel.cc.
        if (strudelIframeRef.current?.contentWindow) {
            try {
                strudelIframeRef.current.contentWindow.postMessage(
                    { type: 'strudel-eval', code: newCode },
                    '*'
                );
            } catch {
                // postMessage failed — fall through to src reload
            }
        }

        // Reload the iframe as a reliable fallback (restarts the track with new values).
        if (strudelIframeRef.current) {
            strudelIframeRef.current.src = buildStrudelUrl(newCode);
        }
    };

    const stopStrudelTrack = () => {
        if (strudelIframeRef.current) {
            strudelIframeRef.current.src = 'about:blank';
        }
        strudelIframeReadyRef.current = false;
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
            sfxMuted, setSfxMuted,
            sfxVolume, setSfxVolume,
        }}>
            {children}

            {/* Hidden Strudel REPL iframe for in-game music playback.
                Positioned off-screen so it stays in the DOM (display:none
                prevents iframe scripts from running in some browsers).
                allow="autoplay" delegates autoplay permission so the iframe
                can start an AudioContext after any user gesture on the parent
                page. The onLoad handler marks the iframe as ready; evaluation
                is triggered via strudel-eval postMessage only when the user
                clicks ▶ (within a gesture), or when the iframe is already warm
                (AudioContext already running from a previous gesture). */}
            <iframe
                ref={strudelIframeRef}
                title="Strudel Music Player"
                allow="autoplay; microphone"
                src="about:blank"
                onLoad={() => {
                    const code = lastStrudelCodeRef.current;
                    if (!code) {
                        // about:blank loaded (or stopStrudelTrack cleared the ref) — nothing to do.
                        strudelIframeReadyRef.current = false;
                        return;
                    }
                    // Strudel has loaded. Mark it as ready so the next playStrudelTrack call
                    // (triggered by the user clicking ▶) sends strudel-eval via postMessage
                    // within the click gesture, which is the only way to unlock the AudioContext
                    // under the browser's autoplay policy. We do NOT send strudel-eval here
                    // because this onLoad callback is not inside a user gesture.
                    strudelIframeReadyRef.current = true;
                }}
                style={{
                    position: 'fixed',
                    top: '-2px',
                    left: '-2px',
                    width: '1px',
                    height: '1px',
                    border: 'none',
                    pointerEvents: 'none',
                    opacity: 0,
                }}
            />

            {isLoadingSamples && (
                <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, background: '#111', color: '#61afef', padding: '10px 20px', borderRadius: '4px', border: '1px solid #61afef', fontSize: '0.8rem', boxShadow: '0 0 10px rgba(97, 175, 239, 0.2)' }}>
                    Loading Instruments...
                </div>
            )}
        </AudioContext.Provider>
    );
}