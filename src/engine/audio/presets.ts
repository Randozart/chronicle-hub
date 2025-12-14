import { InstrumentDefinition } from './models';

export const AUDIO_PRESETS: Record<string, InstrumentDefinition> = {
    // --- LEADS ---
    'retro_lead': {
        id: 'retro_lead', name: '8-Bit Lead', type: 'synth',
        config: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }, volume: -10, polyphony: 12 }
    },
    'smooth_lead': {
        id: 'smooth_lead', name: 'Smooth Sine', type: 'synth',
        config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.8, release: 0.5 }, volume: -8, polyphony: 12 }
    },
    
    // --- BASS ---
    'fm_bass': {
        id: 'fm_bass', name: 'FM Slap Bass', type: 'synth',
        config: { oscillator: { type: 'fmsquare', modulationType: 'sine', modulationIndex: 10 }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 }, volume: -6, polyphony: 12 }
    },
    'deep_sub': {
        id: 'deep_sub', name: 'Sub Bass', type: 'synth',
        config: { oscillator: { type: 'sine' }, envelope: { attack: 0.1, decay: 0.3, sustain: 0.8, release: 0.5 }, volume: -4, polyphony: 6 }
    },

    // --- PADS ---
    'warm_pad': {
        id: 'warm_pad', name: 'Warm Saw Pad', type: 'synth',
        config: { oscillator: { type: 'sawtooth' }, envelope: { attack: 1.0, decay: 0.5, sustain: 0.7, release: 2.5 }, volume: -15, polyphony: 16 }
    },
    'glass_pad': {
        id: 'glass_pad', name: 'Glassy FM Pad', type: 'synth',
        config: { oscillator: { type: 'fmsine', modulationIndex: 5 }, envelope: { attack: 0.5, decay: 1.0, sustain: 0.6, release: 2.5 }, volume: -12, polyphony: 16 }
    },

    // --- PLUCKS & FX ---
    'plucky': {
        id: 'plucky', name: 'Short Pluck', type: 'synth',
        config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.3, sustain: 0.0, release: 0.2 }, volume: -8, polyphony: 12 }
    },
    'bell': {
        id: 'bell', name: 'FM Bell', type: 'synth',
        config: { oscillator: { type: 'fmsine', modulationType: 'sine', harmonicity: 3 }, envelope: { attack: 0.01, decay: 1.5, sustain: 0.0, release: 3.0 }, volume: -10, polyphony: 12 }
    },

    // --- ORCHESTRAL EMULATION ---
    'strings_low': {
        id: 'strings_low', name: 'Cello Section', type: 'synth',
        config: { oscillator: { type: 'fmsawtooth', modulationIndex: 2 }, envelope: { attack: 0.4, decay: 0.2, sustain: 0.8, release: 1.2 }, volume: -12, polyphony: 12 }
    },
    'strings_high': {
        id: 'strings_high', name: 'Violin Section', type: 'synth',
        config: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.6, decay: 0.2, sustain: 0.7, release: 1.0 }, volume: -18, polyphony: 16 }
    },
    'brass': {
        id: 'brass', name: 'French Horns', type: 'synth',
        config: { oscillator: { type: 'fmsawtooth', modulationIndex: 5 }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.5 }, volume: -9, polyphony: 12 }
    },
    'choir': {
        id: 'choir', name: 'Synth Choir', type: 'synth',
        config: { oscillator: { type: 'amsine' }, envelope: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 2.0 }, volume: -20, polyphony: 16 }
    },
    'timpani': {
        id: 'timpani', name: 'Timpani', type: 'synth',
        config: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.0, release: 0.5 }, volume: -5, polyphony: 6 }
    }
};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);