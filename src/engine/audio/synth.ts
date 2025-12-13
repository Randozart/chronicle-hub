import * as Tone from 'tone';
import { InstrumentDefinition } from './models';

// Cache instruments to prevent recreating them (expensive)
// We strictly type this as PolySynth to avoid namespace errors
const instrumentCache: Record<string, Tone.PolySynth> = {};

export function getOrMakeInstrument(def: InstrumentDefinition): Tone.PolySynth {
    if (instrumentCache[def.id]) {
        return instrumentCache[def.id];
    }

    const config = def.config;
    let synth: Tone.PolySynth;

    // Default Envelope Settings
    const envelope = {
        attack: config.envelope?.attack ?? 0.01,
        decay: config.envelope?.decay ?? 0.1,
        sustain: config.envelope?.sustain ?? 0.5,
        release: config.envelope?.release ?? 1
    };

    const oscType = config.oscillator?.type || 'triangle';

    // 1. CHOOSE SYNTH ARCHITECTURE
    // We use 'as any' for the options object to prevent TypeScript from being 
    // overly pedantic about the union types of different synth configurations.
    
    if (oscType.startsWith('fm')) {
        synth = new Tone.PolySynth(Tone.FMSynth, {
            oscillator: { type: oscType as any },
            envelope: envelope,
            modulation: { type: 'sine' }, 
            modulationIndex: 10
        } as any).toDestination();
    } 
    else if (oscType.startsWith('am')) {
        synth = new Tone.PolySynth(Tone.AMSynth, {
            oscillator: { type: oscType as any },
            envelope: envelope
        } as any).toDestination();
    } 
    else {
        // Standard Subtractive (Triangle, Saw, Square)
        synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: oscType as any },
            envelope: envelope
        } as any).toDestination();
    }

    // 2. SET VOLUME
    // Tone.js uses decibels. -infinity is silent, 0 is full volume.
    synth.volume.value = config.volume || -10; 

    // 3. SET POLYPHONY LIMIT
    // Prevents performance issues if too many notes play
    synth.maxPolyphony = config.polyphony || 6;

    instrumentCache[def.id] = synth;
    return synth;
}

/**
 * Cleanup function to free audio context when world unloads
 */
export function disposeInstruments() {
    Object.values(instrumentCache).forEach(inst => inst.dispose());
    for (const key in instrumentCache) delete instrumentCache[key];
}