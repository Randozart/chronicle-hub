import { InstrumentDefinition } from './models';

export const AUDIO_PRESETS: Record<string, InstrumentDefinition> = {
    // --- BASIC RETRO ---
    'retro_lead': {
        id: 'retro_lead',
        name: '8-bit Square Lead',
        type: 'synth',
        config: {
            oscillator: { type: 'square' },
            envelope: {
                attack: 0.01,
                decay: 0.1,
                sustain: 0.5,
                release: 0.1
            },
            volume: -10
        }
    },
    'retro_flute': {
        id: 'retro_flute',
        name: 'Triangle Flute',
        type: 'synth',
        config: {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.1,
                decay: 0.2,
                sustain: 0.8,
                release: 0.5
            },
            volume: -8
        }
    },
    
    // --- BASS ---
    'fm_bass': {
        id: 'fm_bass',
        name: 'FM Slap Bass',
        type: 'synth',
        config: {
            // FM Square gives that metallic "Genesis/MegaDrive" twang
            oscillator: { type: 'fmsquare' }, 
            envelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.2,
                release: 0.2
            },
            volume: -6
        }
    },
    'sub_bass': {
        id: 'sub_bass',
        name: 'Sine Sub',
        type: 'synth',
        config: {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.05,
                decay: 0.1,
                sustain: 0.8,
                release: 0.3
            },
            volume: -5
        }
    },

    // --- PADS & ATMOSPHERE ---
    'warm_pad': {
        id: 'warm_pad',
        name: 'Slow Saw Pad',
        type: 'synth',
        config: {
            oscillator: { type: 'sawtooth' },
            envelope: {
                attack: 1.5,   // Slow fade in
                decay: 0.5,
                sustain: 0.8,
                release: 2.0   // Long fade out
            },
            volume: -15 // Pads sit back in the mix
        }
    },
    'glass_pad': {
        id: 'glass_pad',
        name: 'Glassy FM Pad',
        type: 'synth',
        config: {
            oscillator: { type: 'fmsine' },
            envelope: {
                attack: 0.5,
                decay: 1.0,
                sustain: 0.6,
                release: 2.5
            },
            volume: -12
        }
    },

    // --- PLUCKS & FX ---
    'plucky': {
        id: 'plucky',
        name: 'Short Pluck',
        type: 'synth',
        config: {
            oscillator: { type: 'triangle' },
            envelope: {
                attack: 0.005,
                decay: 0.3,
                sustain: 0.0, // No sustain = plucky
                release: 0.2
            },
            volume: -8
        }
    },
    'bell': {
        id: 'bell',
        name: 'FM Bell',
        type: 'synth',
        config: {
            oscillator: { type: 'fmsine' }, 
            envelope: {
                attack: 0.01,
                decay: 0.8,
                sustain: 0.0, // Bells ring out then silence
                release: 2.5
            },
            volume: -8
        }
    }
};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);