// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

// Redefine this to only include triggerable instruments
export type AnyInstrument = Tone.PolySynth | Tone.Sampler;

// The cache now stores an object containing the sound source and its effects chain
const instrumentCache: Record<string, {
    source: AnyInstrument;
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

export function getOrMakeInstrument(def: InstrumentDefinition): AnyInstrument {
    const cacheKey = getCacheKey(def);

    if (instrumentCache[cacheKey]) {
        return instrumentCache[cacheKey].source;
    }

    const config = def.config;
    let sourceInst: AnyInstrument; // The sound source (Sampler or Synth)

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
        
        sourceInst = new Tone.Sampler({
            urls: finalUrls,
            baseUrl: config.baseUrl || "",
            attack: config.envelope?.attack || 0,
            release: config.envelope?.release || 1,
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

    // --- AUDIO GRAPH ROUTING ---
    const effects: Tone.ToneAudioNode[] = [];
    let finalNode: Tone.ToneAudioNode = sourceInst;

    // Panning Logic
    if (config.panning && config.panning.enabled) {
        const panner = new Tone.AutoPanner({
            frequency: config.panning.frequency || 2,
            type: config.panning.type || 'sine',
            depth: config.panning.depth || 1,
        }).start();
        
        // Chain: instrument -> panner
        finalNode.connect(panner);
        finalNode = panner; // The end of the chain is now the panner
        effects.push(panner);
    }

    // Connect the end of the chain to the destination
    finalNode.toDestination();
    
    // Cache the entire graph for proper disposal
    instrumentCache[cacheKey] = { source: sourceInst, effects };

    // Always return the sound source, which is what gets triggered
    return sourceInst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(graph => {
        // Dispose all effects in the chain
        graph.effects.forEach(effect => effect.dispose());
        // Dispose the source instrument
        graph.source.dispose();
    });
    // Clear the cache
    for (const key in instrumentCache) delete instrumentCache[key];
}