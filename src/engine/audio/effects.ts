import * as Tone from 'tone';
import { InstrumentConfig, FilterDef, EQDef } from './models';

export function createInsertEffects(config: InstrumentConfig['overrides']): Tone.ToneAudioNode[] {
    const chain: Tone.ToneAudioNode[] = [];
    const c = config as any; 
    if (c.bitcrush && c.bitcrush > 0) {
        const crusher = new Tone.BitCrusher(4);
        crusher.wet.value = c.bitcrush / 100;
        chain.push(crusher);
    }
    if (c.distortion && c.distortion > 0) {
        const dist = new Tone.Distortion({
            distortion: c.distortion / 100,
            wet: 0.5 
        });
        chain.push(dist);
    }

    return chain;
}

export function createFilter(def?: FilterDef): Tone.Filter | null {
    if (!def) return null;
    return new Tone.Filter({
        type: def.type || 'lowpass', 
        frequency: def.frequency || 20000, 
        rolloff: def.rolloff || -12,
        Q: def.Q || 1,
        gain: def.gain || 0
    });
}

export function createEQ(def?: EQDef): Tone.EQ3 | null {
    if (!def) return null;
    return new Tone.EQ3({
        low: def.low,
        mid: def.mid,
        high: def.high,
        lowFrequency: def.lowFrequency || 400,
        highFrequency: def.highFrequency || 2500
    });
}