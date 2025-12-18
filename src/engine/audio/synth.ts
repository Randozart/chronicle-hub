// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';
import { Note } from 'tonal';

export type AnyInstrument = Tone.PolySynth | Tone.Sampler;

const instrumentCache: Record<string, AnyInstrument> = {};

function getCacheKey(def: InstrumentDefinition): string {
    return JSON.stringify({
        id: def.id,
        vol: def.config.volume,
        env: def.config.envelope,
        osc: def.config.oscillator,
        offset: def.config.octaveOffset,
        loop: def.config.loop // Include loop in cache key
    });
}

export function getOrMakeInstrument(def: InstrumentDefinition): AnyInstrument {
    const cacheKey = getCacheKey(def);

    if (instrumentCache[cacheKey]) {
        return instrumentCache[cacheKey];
    }

    const config = def.config;
    let inst: AnyInstrument;

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
        
        inst = new Tone.Sampler({
            urls: finalUrls,
            baseUrl: config.baseUrl || "",
            attack: config.envelope?.attack || 0,
            release: config.envelope?.release || 1,
        }).toDestination();

        // --- LOOP IMPLEMENTATION ---
        if (config.loop && config.loop.enabled) {
            // TypeScript cast needed as Tone types sometimes hide these properties on the wrapper
            const sampler = inst as any;
            sampler.loop = true;
            
            if (config.loop.start !== undefined) {
                sampler.loopStart = config.loop.start;
            }
            if (config.loop.end !== undefined) {
                sampler.loopEnd = config.loop.end;
            }
            // Note: Tone.Sampler buffers don't support 'pingpong' natively in standard version, 
            // usually just forward looping. We ignore 'type' for now unless using a custom buffer player.
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

        inst = new Tone.PolySynth(SynthClass, {
            oscillator: { type: oscType as any, ...config.oscillator },
            envelope: envelope,
        } as any).toDestination();

        (inst as Tone.PolySynth).maxPolyphony = config.polyphony || 32;
    }

    inst.volume.value = config.volume || -10; 

    instrumentCache[cacheKey] = inst;
    return inst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(inst => inst.dispose());
    for (const key in instrumentCache) delete instrumentCache[key];
}