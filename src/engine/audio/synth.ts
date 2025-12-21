// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

export type AnySoundSource = (Tone.PolySynth | Tone.Sampler) & { _panner?: Tone.Panner };

const instrumentCache: Record<string, {
    source: AnySoundSource;
    panner: Tone.Panner;
    effects: Tone.ToneAudioNode[];
}> = {};

// Hard limit to prevent browser crashes on dense MIDI
const MAX_POLYPHONY = 12;

function getCacheKey(def: InstrumentDefinition): string {
    return JSON.stringify({
        id: def.id,
        vol: def.config.volume,
        env: def.config.envelope,
        osc: def.config.oscillator,
        offset: def.config.octaveOffset,
        loop: def.config.loop,
        panning: def.config.panning
    });
}

export async function getOrMakeInstrument(def: InstrumentDefinition): Promise<AnySoundSource> {
    const cacheKey = getCacheKey(def);
    
    const oldEntry = Object.entries(instrumentCache).find(([key]) => JSON.parse(key).id === def.id);
    if (oldEntry) {
        const [key, graph] = oldEntry;
        if (key === cacheKey) {
            return graph.source;
        }
        graph.effects.forEach(e => e.dispose());
        graph.panner.dispose();
        graph.source.dispose();
        delete instrumentCache[key];
    }

    const config = def.config;
    let sourceInst: AnySoundSource;

    // --- 1. Create Source ---
    if (def.type === 'sampler' && config.urls) {
        let finalUrls = config.urls;
        const offset = config.octaveOffset || 0;

        if (offset !== 0) {
            finalUrls = {};
            for (const noteName in config.urls) {
                const midi = Note.midi(noteName);
                if (midi !== null) {
                    const newMidi = midi + (offset * 12);
                    const newNoteName = Note.fromMidi(newMidi);
                    finalUrls[newNoteName] = config.urls[noteName];
                } else {
                    finalUrls[noteName] = config.urls[noteName];
                }
            }
        }

        const samplerPromise = new Promise<Tone.Sampler>((resolve) => {
            const sampler = new Tone.Sampler({
                urls: finalUrls,
                baseUrl: config.baseUrl || "",
                attack: config.envelope?.attack || 0,
                release: config.envelope?.release || 1,
                onload: () => resolve(sampler),
                onerror: (err) => {
                    console.warn(`Failed to load sample for ${def.id}`, err);
                    resolve(sampler); 
                }
            });
        });

        sourceInst = (await samplerPromise) as AnySoundSource;
        // Sampler manages its own polyphony internally mostly, but we can't easily limit it without wrapping.
        // Usually Samplers are less CPU intensive on voice count than Synths.

        if (config.loop && config.loop.enabled) {
            const sampler = sourceInst as any;
            sampler.loop = true;
            if (config.loop.start !== undefined) sampler.loopStart = config.loop.start;
            if (config.loop.end !== undefined) sampler.loopEnd = config.loop.end;
            if (config.loop.crossfade !== undefined && config.loop.crossfade > 0) {
                sampler.fadeIn = config.loop.crossfade;
                sampler.fadeOut = config.loop.crossfade;
            }
        }

    } else {
        const envelope = {
            attack: config.envelope?.attack ?? 0.01,
            decay: config.envelope?.decay ?? 0.1,
            sustain: config.envelope?.sustain ?? 0.5,
            release: config.envelope?.release ?? 1
        };
        const oscType = config.oscillator?.type || 'triangle';
        let SynthClass: any = Tone.Synth;
        if (oscType.startsWith('fm')) SynthClass = Tone.FMSynth;
        if (oscType.startsWith('am')) SynthClass = Tone.AMSynth;

        sourceInst = new Tone.PolySynth(SynthClass, {
            oscillator: { type: oscType as any, ...config.oscillator },
            envelope: envelope,
        } as any) as AnySoundSource;
        
        // Enforce Polyphony Limit
        (sourceInst as Tone.PolySynth).maxPolyphony = Math.min(config.polyphony || 32, MAX_POLYPHONY);
    }

    sourceInst.volume.value = config.volume || -10;

    // --- 2. Create Chain ---
    const effects: Tone.ToneAudioNode[] = [];
    
    // Automation Panner
    const trackPanner = new Tone.Panner(0);
    sourceInst._panner = trackPanner;
    
    let currentNode: Tone.ToneAudioNode = sourceInst;
    currentNode.connect(trackPanner);
    currentNode = trackPanner;

    // LFO Auto-Panner
    if (config.panning && config.panning.enabled) {
        const autoPanner = new Tone.AutoPanner({
            frequency: config.panning.frequency || 2,
            type: config.panning.type || 'sine',
            depth: config.panning.depth || 1,
        }).start();
        
        currentNode.connect(autoPanner);
        currentNode = autoPanner;
        effects.push(autoPanner);
    }

    instrumentCache[cacheKey] = { source: sourceInst, panner: trackPanner, effects };
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        graph.effects.forEach(effect => effect.dispose());
        graph.panner.dispose();
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}