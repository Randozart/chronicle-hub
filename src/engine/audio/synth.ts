// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

export type AnySoundSource = Tone.PolySynth | Tone.Sampler;

const instrumentCache: Record<string, {
    source: AnySoundSource;
    effects: Tone.ToneAudioNode[];
}> = {};

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

    // If an old version with the same ID exists, dispose it to ensure we're using fresh settings.
    const oldEntry = Object.entries(instrumentCache).find(([key]) => JSON.parse(key).id === def.id);
    if (oldEntry) {
        const [key, graph] = oldEntry;
        graph.effects.forEach(e => e.dispose());
        graph.source.dispose();
        delete instrumentCache[key];
    }

    const config = def.config;
    let sourceInst: AnySoundSource;

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
        
        // --- ASYNC LOADING FIX ---
        // Wrap sampler creation in a promise that resolves on load.
        sourceInst = await new Promise<Tone.Sampler>((resolve, reject) => {
            const sampler = new Tone.Sampler({
                urls: finalUrls,
                baseUrl: config.baseUrl || "",
                attack: config.envelope?.attack || 0,
                release: config.envelope?.release || 1,
                onload: () => resolve(sampler),
                onerror: (err) => reject(new Error(`Could not load sample: ${err}`))
            });
        });
        
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
        } as any);

        (sourceInst as Tone.PolySynth).maxPolyphony = config.polyphony || 32;
    }

    sourceInst.volume.value = config.volume || -10; 

    const effects: Tone.ToneAudioNode[] = [];
    let finalNode: Tone.ToneAudioNode = sourceInst;

    if (config.panning && config.panning.enabled) {
        const panner = new Tone.AutoPanner({
            frequency: config.panning.frequency || 2,
            type: config.panning.type || 'sine',
            depth: config.panning.depth || 1,
        }).start();
        
        finalNode.connect(panner);
        finalNode = panner;
        effects.push(panner);
    }
    
    finalNode.toDestination();
    
    instrumentCache[cacheKey] = { source: sourceInst, effects };
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        graph.effects.forEach(effect => effect.dispose());
        graph.source.dispose();
    });
    for (const key in instrumentCache) delete instrumentCache[key];
}