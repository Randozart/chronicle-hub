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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
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
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
        }
    },

    // --- CINEMATIC ---
    'cello_section': {
        id: 'cello_section',
        name: 'Low Strings',
        type: 'synth',
        config: {
            oscillator: { type: 'fmsawtooth', modulationType: 'sine' },
            envelope: { attack: 0.4, decay: 0.1, sustain: 0.9, release: 1.2 },
            volume: -12
            ,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
        }
    },
    'violin_section': {
        id: 'violin_section',
        name: 'High Strings',
        type: 'synth',
        config: {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.6, decay: 0.2, sustain: 0.7, release: 1.0 },
            volume: -18,
            polyphony: 12 // <-- INCREASE FROM DEFAULT
        }
    },
    'french_horn': {
        id: 'french_horn',
        name: 'Brass Horn',
        type: 'synth',
        config: {
            oscillator: { type: 'fmsawtooth', modulationType: 'square' },
            envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.5 },
            volume: -9,
            polyphony: 12 // <-- INCREASE FROM DEFAULT

        }
    },
    'choir_aahs': {
        id: 'choir_aahs',
        name: 'Synth Choir',
        type: 'synth',
        config: {
            oscillator: { type: 'amsine', modulationType: 'sawtooth' },
            envelope: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 2.0 },
            volume: -20,
            polyphony: 16 // <-- INCREASE SIGNIFICANTLY
        }
    },
    'timpani_hit': {
        id: 'timpani_hit',
        name: 'Timpani Hit',
        type: 'synth',
        config: {
            // A sine wave with a pitch envelope creates a convincing drum sound
            oscillator: { type: 'sine' },
            // We need to add pitch envelope support to our synth factory for this
            // For now, this is a placeholder. It will sound like a low 'thump'.
            envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.2 },
            volume: -4
        }
    }
};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);