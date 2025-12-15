import { InstrumentDefinition } from './models';

export const AUDIO_PRESETS: Record<string, InstrumentDefinition> = {
    // --- SYNTHS / CHIPTUNE ---
    'retro_lead': {
        id: 'retro_lead', name: '8-bit Square Lead', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }, volume: -10, polyphony: 12 }
    },
    'retro_flute': {
        id: 'retro_flute', name: 'Triangle Flute', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5 }, volume: -8, polyphony: 12 }
    },
    'fm_bass': {
        id: 'fm_bass', name: 'FM Slap Bass', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'fmsquare' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 }, volume: -6, polyphony: 12 }
    },
    'sub_bass': {
        id: 'sub_bass', name: 'Sine Sub', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 }, volume: -5, polyphony: 12 }
    },

    // --- PADS ---
    'warm_pad': {
        id: 'warm_pad', name: 'Slow Saw Pad', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'sawtooth' }, envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2.0 }, volume: -15, polyphony: 12 }
    },
    'glass_pad': {
        id: 'glass_pad', name: 'Glassy FM Pad', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'fmsine' }, envelope: { attack: 0.5, decay: 1.0, sustain: 0.6, release: 2.5 }, volume: -12, polyphony: 12 }
    },

    // --- ORCHESTRAL ---
    'cello_section': {
        id: 'cello_section', name: 'Low Strings', category: 'Orchestral Synth', type: 'synth',
        config: { oscillator: { type: 'fmsawtooth', modulationType: 'sine' }, envelope: { attack: 0.4, decay: 0.1, sustain: 0.9, release: 1.2 }, volume: -12, polyphony: 12 }
    },
    'violin_section': {
        id: 'violin_section', name: 'High Strings', category: 'Orchestral Synth', type: 'synth',
        config: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.6, decay: 0.2, sustain: 0.7, release: 1.0 }, volume: -18, polyphony: 12 }
    },
    'french_horn': {
        id: 'french_horn', name: 'Brass Horn', category: 'Orchestral Synth', type: 'synth',
        config: { oscillator: { type: 'fmsawtooth', modulationType: 'square' }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.5 }, volume: -9, polyphony: 12 }
    },
    'choir_aahs': {
        id: 'choir_aahs', name: 'Synth Choir', category: 'Orchestral Synth', type: 'synth',
        config: { oscillator: { type: 'amsine', modulationType: 'sawtooth' }, envelope: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 2.0 }, volume: -20, polyphony: 16 }
    },
    'timpani_hit': {
        id: 'timpani_hit', name: 'Timpani Hit', category: 'Orchestral Synth', type: 'synth',
        config: { oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 0.2 }, volume: -4 }
    },

    // --- MODERN FX ---
    'vapor_lead': {
        id: 'vapor_lead', name: 'Vaporwave Lead', category: 'Basic', type: 'synth',
        config: { oscillator: { type: 'sawtooth', modulationType: 'triangle' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.7, release: 0.5 }, volume: -6, polyphony: 12 }
    },
        "bodhran_sidel": {
        "id": "bodhran_sidel",
        "name": "Bodhran Side",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C4": "Ancient Instruments Of The World/samples/Bodhran SideL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "bodhran_skinl": {
        "id": "bodhran_skinl",
        "name": "Bodhran Skin",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C4": "Ancient Instruments Of The World/samples/Bodran SkinL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "crwth": {
        "id": "crwth",
        "name": "Crwth",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D4": "Ancient Instruments Of The World/samples/CrwthR.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "brass_lure_start": {
        "id": "brass_lure_start",
        "name": "Brass Lure Start",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "F3": "Ancient Instruments Of The World/samples/brass-lure start.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 3.0
            },
            "volume": -5
        }
    },
    "bukkehornl": {
        "id": "bukkehornl",
        "name": "Bukkehorn",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "F3": "Ancient Instruments Of The World/samples/BukkehornL.wav",
                "A#3": "Ancient Instruments Of The World/samples/cornemuseContinueL.wav",
                "A3": "Ancient Instruments Of The World/samples/tagelharpa3L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "bukkehornstartl": {
        "id": "bukkehornstartl",
        "name": "Bukkehorn Start",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D#3": "Ancient Instruments Of The World/samples/BukkehornStartL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "celtic_harp_c2l": {
        "id": "celtic_harp_c2l",
        "name": "Celtic Harp",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C4": "Ancient Instruments Of The World/samples/celtic harp-c2L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "conchcontinuel": {
        "id": "conchcontinuel",
        "name": "Conch Continue",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "E4": "Ancient Instruments Of The World/samples/ConchContinueL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 3.0
            },
            "volume": -5
        }
    },
    "conchl": {
        "id": "conchl",
        "name": "Conch",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "E4": "Ancient Instruments Of The World/samples/ConchL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "cornemusecontinuel": {
        "id": "cornemusecontinuel",
        "name": "Cornemuse Continue",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "A#3": "Ancient Instruments Of The World/samples/cornemuseContinueL.wav",
                "A3": "Ancient Instruments Of The World/samples/tagelharpa3L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "cornemusestartl": {
        "id": "cornemusestartl",
        "name": "Cornemuse Start",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C4": "Ancient Instruments Of The World/samples/cornemuseStartL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "irish_lyre_harpl": {
        "id": "irish_lyre_harpl",
        "name": "Irish Lyre Harp",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C#4": "Ancient Instruments Of The World/samples/IRISH LYRE HARPL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "jaw_harp": {
        "id": "jaw_harp",
        "name": "Jaw Harp",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C4": "Ancient Instruments Of The World/samples/jaw harp.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "jouhikkol": {
        "id": "jouhikkol",
        "name": "Jouhikko",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D4": "Ancient Instruments Of The World/samples/JouhikkoL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "nyckelharpa2l": {
        "id": "nyckelharpa2l",
        "name": "Nyckelharpa 2",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "A2": "Ancient Instruments Of The World/samples/Nyckelharpa2L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "prillarhorncontinuel": {
        "id": "prillarhorncontinuel",
        "name": "Prillarhorn Continue",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D4": "Ancient Instruments Of The World/samples/PrillarhornContinueL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "prillarhornl": {
        "id": "prillarhornl",
        "name": "Prillarhorn",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D4": "Ancient Instruments Of The World/samples/PrillarhornL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "psalmodikonl": {
        "id": "psalmodikonl",
        "name": "Psalmodikon",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D#4": "Ancient Instruments Of The World/samples/PsalmodikonL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "sheepboneflutecontil": {
        "id": "sheepboneflutecontil",
        "name": "Sheepbone Flute Continue",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "C5": "Ancient Instruments Of The World/samples/sheepboneflutecontiL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "sheepboneflutestartl": {
        "id": "sheepboneflutestartl",
        "name": "Sheepbone Flute Start",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "A5": "Ancient Instruments Of The World/samples/sheepboneflutestartL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "tagelharpa2l": {
        "id": "tagelharpa2l",
        "name": "Tagelharpa 2",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "A2": "Ancient Instruments Of The World/samples/tagelharpa2L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "tagelharpa3l": {
        "id": "tagelharpa3l",
        "name": "Tagelharpa 3",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "A3": "Ancient Instruments Of The World/samples/tagelharpa3L.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "tin_whistle_startl": {
        "id": "tin_whistle_startl",
        "name": "Tin Whistle Start",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "D4": "Ancient Instruments Of The World/samples/tin whistle startL.wav"
            },
            "envelope": {
                "attack": 0.1,
                "release": 0.5
            },
            "volume": -5
        }
    },
    "hurdy_gurdy": {
        "id": "hurdy_gurdy",
        "name": "Hurdy Gurdy",
        "category": "Ancient Instruments",

        "type": "sampler",
        "config": {
            "baseUrl": "/sounds/imported_sf2/",
            "urls": {
                "B3": "Ancient Instruments Of The World/samples/001.wav"
            },
            "envelope": {
                "attack": 0.01,
                "decay": 0.1,
                "sustain": 1.0,
                "release": 0.5
            },
            "volume": -5
        }
    },
    'hq_violin': {
        id: 'hq_violin', name: 'Violin', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/violin/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3', 'A5': 'A5.mp3' },
            envelope: { attack: 0.1, release: 1.5 },
            volume: -8
        }
    },
    'hq_cello': {
        id: 'hq_cello', name: 'Cello', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/cello/',
            urls: { 'C3': 'C3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
            envelope: { attack: 0.1, release: 1.5 },
            volume: -6
        }
    },
    'hq_contrabass': {
        id: 'hq_contrabass', name: 'Contrabass', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/contrabass/',
            urls: { 'C2': 'C2.mp3', 'G2': 'G2.mp3', 'C3': 'C3.mp3' },
            envelope: { attack: 0.2, release: 1.5 },
            volume: -5
        }
    },
    'hq_pizzicato': {
        id: 'hq_pizzicato', name: 'Pizzicato Strings', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/pizzicato_strings/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3' },
            envelope: { attack: 0, release: 0.3 }, // Short release for plucks
            volume: -6
        }
    },

    // Woodwinds
    'hq_flute': {
        id: 'hq_flute', name: 'Flute', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/flute/',
            urls: { 'C5': 'C5.mp3', 'G5': 'G5.mp3', 'C6': 'C6.mp3' },
            envelope: { attack: 0.1, release: 0.5 },
            volume: -12
        }
    },
    'hq_clarinet': {
        id: 'hq_clarinet', name: 'Clarinet', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/clarinet/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
            envelope: { attack: 0.05, release: 0.5 },
            volume: -10
        }
    },
    'hq_oboe': {
        id: 'hq_oboe', name: 'Oboe', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/oboe/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
            envelope: { attack: 0.05, release: 0.5 },
            volume: -10
        }
    },
    'hq_bassoon': {
        id: 'hq_bassoon', name: 'Bassoon', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/bassoon/',
            urls: { 'C3': 'C3.mp3', 'G3': 'G3.mp3', 'C4': 'C4.mp3' },
            envelope: { attack: 0.05, release: 0.5 },
            volume: -8
        }
    },

    // Brass
    'hq_horn': {
        id: 'hq_horn', name: 'French Horn', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/horn/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3' },
            envelope: { attack: 0.2, release: 2.0 },
            volume: -8
        }
    },
    'hq_trumpet': {
        id: 'hq_trumpet', name: 'Trumpet', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/trumpet/',
            urls: { 'C5': 'C5.mp3', 'G5': 'G5.mp3' },
            envelope: { attack: 0.05, release: 1.0 },
            volume: -8
        }
    },
    'hq_trombone': {
        id: 'hq_trombone', name: 'Trombone', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/trombone/',
            urls: { 'C3': 'C3.mp3', 'G3': 'G3.mp3' },
            envelope: { attack: 0.1, release: 1.2 },
            volume: -7
        }
    },
    'hq_tuba': {
        id: 'hq_tuba', name: 'Tuba', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tuba/',
            urls: { 'C2': 'C2.mp3', 'G2': 'G2.mp3' },
            envelope: { attack: 0.2, release: 1.0 },
            volume: -4
        }
    },

    // Keys & Choir
    'hq_piano': {
        id: 'hq_piano', name: 'Grand Piano', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/piano/',
            urls: { 'C3': 'C3.mp3', 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
            envelope: { attack: 0, release: 2.0 },
            volume: -5
        }
    },
    'hq_organ': {
        id: 'hq_organ', name: 'Church Organ', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/organ/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
            envelope: { attack: 0.1, release: 2.5 },
            volume: -5
        }
    },
    'hq_choir': {
        id: 'hq_choir', name: 'Choir Aahs', category: 'VSCO 2', type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/choir/',
            urls: { 'C4': 'C4.mp3', 'G4': 'G4.mp3', 'C5': 'C5.mp3' },
            envelope: { attack: 1.0, release: 2.0 },
            volume: -12
        }
    }
};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);