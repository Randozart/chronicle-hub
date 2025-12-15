// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';

// We union the types here
export type AnyInstrument = Tone.PolySynth | Tone.Sampler;

const instrumentCache: Record<string, AnyInstrument> = {};

// Helper to generate a unique key for caching based on config
function getCacheKey(def: InstrumentDefinition): string {
    // We create a signature based on the ID and the specific overridden values
    const sig = JSON.stringify({
        id: def.id,
        vol: def.config.volume,
        env: def.config.envelope,
        osc: def.config.oscillator // In case we allow osc overrides later
    });
    return sig;
}

export function getOrMakeInstrument(def: InstrumentDefinition): AnyInstrument {
    const cacheKey = getCacheKey(def);

    if (instrumentCache[cacheKey]) {
        return instrumentCache[cacheKey];
    }

    const config = def.config;
    let inst: AnyInstrument;

    // 1. SAMPLER
    if (def.type === 'sampler' && config.urls) {
        inst = new Tone.Sampler({
            urls: config.urls,
            baseUrl: config.baseUrl || "",
            // Tone.Sampler handles envelope slightly differently, but accepts these options
            attack: config.envelope?.attack || 0,
            release: config.envelope?.release || 1,
            onload: () => {
                // Optional: Console log for debug
                // console.log(`[Audio] Loaded samples for ${def.name}`);
            }
        }).toDestination();
    } 
    // 2. SYNTH
    else {
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

        // Synths have a maxPolyphony property
        (inst as Tone.PolySynth).maxPolyphony = config.polyphony || 32;
    }

    // 3. COMMON VOLUME
    inst.volume.value = config.volume || -10; 

    instrumentCache[cacheKey] = inst;
    return inst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(inst => inst.dispose());
    for (const key in instrumentCache) delete instrumentCache[key];
}