// src/engine/audio/synth.ts
import * as Tone from 'tone';
import { InstrumentDefinition } from './models';

// Union type: It can be a Synth OR a Sampler
export type AnyInstrument = Tone.PolySynth | Tone.Sampler;

const instrumentCache: Record<string, AnyInstrument> = {};

export function getOrMakeInstrument(def: InstrumentDefinition): AnyInstrument {
    if (instrumentCache[def.id]) {
        return instrumentCache[def.id];
    }

    const config = def.config;
    let inst: AnyInstrument;

    // 1. SAMPLER LOGIC
    if (def.type === 'sampler' && config.urls) {
        inst = new Tone.Sampler({
            urls: config.urls,
            baseUrl: config.baseUrl || "",
            // Default envelope for samplers acts as a gate
            attack: config.envelope?.attack || 0,
            release: config.envelope?.release || 1,
            onload: () => {
                // Optional: You could dispatch a global event here to hide a loading spinner
                console.log(`[Audio] Loaded samples for ${def.name}`);
            }
        }).toDestination();
    } 
    // 2. SYNTH LOGIC
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
    // Tone.js volume is in Decibels
    inst.volume.value = config.volume || -10; 

    instrumentCache[def.id] = inst;
    return inst;
}

export function disposeInstruments() {
    Object.values(instrumentCache).forEach(inst => inst.dispose());
    for (const key in instrumentCache) delete instrumentCache[key];
}