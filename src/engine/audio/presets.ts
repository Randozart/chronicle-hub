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
    },
    // 'electric_guitar': {
    //     id: 'electric_guitar',
    //     name: 'Clean Electric Guitar',
    //     category: 'Standard Sampler',
    //     type: 'sampler',
    //     config: {
    //         baseUrl: '/sounds/standard/electric_guitar/',
    //         urls: {
    //             'C3': 'C3.mp3',
    //             'G3': 'G3.mp3',
    //             'C4': 'C4.mp3',
    //             'G4': 'G4.mp3'
    //         },
    //         envelope: {
    //             attack: 0.005, // Very fast attack for pluck
    //             release: 0.5   // Standard guitar sustain
    //         },
    //         volume: -8
    //     }
    // },
    'standard_kit': {
        id: 'standard_kit',
        name: 'Standard Drum Kit',
        category: 'Standard Sampler',
        type: 'sampler',
        mapping: 'chromatic', // <--- DECLARE MAPPING BEHAVIOR
        config: {
            baseUrl: '/sounds/standard/standard_kit/',
            // MAPPING: Ligature Note -> Audio File
            // We map these to the "C4" octave range because that's usually the default center
            // 1 (C4) -> Kick
            // 2 (D4) -> Snare
            // 3 (E4) -> Low Tom
            // 4 (F4) -> Closed Hi-Hat
            // 5 (G4) -> High Tom
            // 6 (A4) -> Open Hi-Hat
            // 7 (B4) -> Crash
            urls: {
                'C4': 'Kick.mp3',
                'D4': 'Snare.mp3',
                'E4': 'Tom_Low.mp3',
                'F4': 'HiHat_Closed.mp3',
                'G4': 'Tom_High.mp3',
                'A4': 'HiHat_Open.mp3',
                'B4': 'Crash.mp3'
            },
            envelope: {
                attack: 0.001, // Instant percussive attack
                release: 1.0   // Let cymbals ring out
            },
            volume: -4
        }
    },
        'jazz_kit': {
        id: 'standard_kit',
        name: 'Jazz Kit',
        category: 'Standard Sampler',
        type: 'sampler',
        mapping: 'chromatic', // <--- DECLARE MAPPING BEHAVIOR
        config: {
            baseUrl: '/sounds/custom/jazz_kit/',
            // MAPPING: Ligature Note -> Audio File
            // We map these to the "C4" octave range because that's usually the default center
            // 1 (C4) -> Kick
            // 2 (D4) -> Snare
            // 3 (E4) -> Low Tom
            // 4 (F4) -> Closed Hi-Hat
            // 5 (G4) -> High Tom
            // 6 (A4) -> Open Hi-Hat
            // 7 (B4) -> Crash
            urls: {
                'C4': 'JK_BD_02.wav',
                'D4': 'JK_BD_06.wav',
                'E4': 'JK_BRSH_01.wav',
                'F4': 'JK_BRSH_02.wav',
                'G4': 'JK_HH_01.wav',
                'A4': 'JK_HH_02.wav',
                'B4': 'JK_PRC_03.wav',
                'C5': 'JK_PRC_04.wav',
                'D5': 'JK_PRC_05.wav',
                'E5': 'JK_PRC_06.wav',
                'F5': 'JK_PRC_09.wav',
                'G5': 'JK_PRC_10.wav',
                'A5': 'JK_SNR_03.wav',
                'B5': 'JK_SNR_04.wav',
            },
            envelope: {
                attack: 0.001, // Instant percussive attack
                release: 1.0   // Let cymbals ring out
            },
            volume: -4
        }
    },
    // // --- ELECTRIC GUITAR (METAL/HARD ROCK) ---
    // 'electric_guitar_distorted': {
    //     id: 'electric_guitar_distorted',
    //     name: 'Distorted Electric Guitar',
    //     category: 'Standard Sampler',
    //     type: 'sampler',
    //     config: {
    //         baseUrl: '/sounds/standard/electric_guitar_distorted/',
    //         urls: {
    //             'C3': 'C3.wav',
    //             'G3': 'G3.wav',
    //             'C4': 'C4.wav',
    //             'G4': 'G4.wav'
    //         },
    //         envelope: {
    //             attack: 0.005,
    //             release: 0.6
    //         },
    //         volume: -6
    //     }
    // },

    // // --- MODERN ROCK DRUM KIT ---
    // 'rock_kit': {
    //     id: 'rock_kit',
    //     name: 'Rock Drum Kit',
    //     category: 'Standard Sampler',
    //     type: 'sampler',
    //     config: {
    //         baseUrl: '/sounds/standard/rock_kit/',
    //         urls: {
    //             'C4': 'Kick.mp3',
    //             'D4': 'Snare.mp3',
    //             'E4': 'Tom_Low.mp3',
    //             'F4': 'HiHat_Closed.mp3',
    //             'G4': 'Tom_High.mp3',
    //             'A4': 'HiHat_Open.mp3',
    //             'B4': 'Crash.mp3',
    //             'C5': 'Ride.mp3'
    //         },
    //         envelope: {
    //             attack: 0.001,
    //             release: 1.2
    //         },
    //         volume: -4
    //     }
    // },

    // // --- OPTIONAL: ELECTRIC BASS ---
    // 'electric_bass': {
    //     id: 'electric_bass',
    //     name: 'Rock Electric Bass',
    //     category: 'Standard Sampler',
    //     type: 'sampler',
    //     config: {
    //         baseUrl: '/sounds/standard/electric_bass/',
    //         urls: {
    //             'C2': 'C2.mp3',
    //             'G2': 'G2.mp3',
    //             'C3': 'C3.mp3',
    //         },
    //         envelope: { attack: 0.01, release: 1.0 },
    //         volume: -6
    //     }
    // }
    bass_electric: {
        id: 'bass_electric',
        name: 'Bass Electric',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/bass-electric/',
            urls: {
                E2: 'E2.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    bassoon: {
        id: 'bassoon',
        name: 'Bassoon',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/bassoon/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                E4: 'E4.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    cello: {
        id: 'cello',
        name: 'Cello',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/cello/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                B2: 'B2.mp3',
                B3: 'B3.mp3',
                B4: 'B4.mp3',
                C2: 'C2.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                D2: 'D2.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                E2: 'E2.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    clarinet: {
        id: 'clarinet',
        name: 'Clarinet',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/clarinet/',
            urls: {
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                D5: 'D5.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                F5: 'F5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    contrabass: {
        id: 'contrabass',
        name: 'Contrabass',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/contrabass/',
            urls: {
                A2: 'A2.mp3',
                B3: 'B3.mp3',
                C2: 'C2.mp3',
                D2: 'D2.mp3',
                E2: 'E2.mp3',
                E3: 'E3.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    flute: {
        id: 'flute',
        name: 'Flute',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/flute/',
            urls: {
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                E4: 'E4.mp3',
                E5: 'E5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    guitar_acoustic: {
        id: 'guitar_acoustic',
        name: 'Guitar Acoustic',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/guitar-acoustic/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                B2: 'B2.mp3',
                B3: 'B3.mp3',
                B4: 'B4.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                D2: 'D2.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                D5: 'D5.mp3',
                E2: 'E2.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    guitar_electric: {
        id: 'guitar_electric',
        name: 'Guitar Electric',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/guitar-electric/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                E2: 'E2.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    harmonium: {
        id: 'harmonium',
        name: 'Harmonium',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/harmonium/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                B2: 'B2.mp3',
                B3: 'B3.mp3',
                B4: 'B4.mp3',
                C2: 'C2.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                D2: 'D2.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                D5: 'D5.mp3',
                E2: 'E2.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    harp: {
        id: 'harp',
        name: 'Harp',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/harp/',
            urls: {
                A2: 'A2.mp3',
                A4: 'A4.mp3',
                B3: 'B3.mp3',
                B5: 'B5.mp3',
                C3: 'C3.mp3',
                C5: 'C5.mp3',
                D2: 'D2.mp3',
                D4: 'D4.mp3',
                E3: 'E3.mp3',
                E5: 'E5.mp3',
                F2: 'F2.mp3',
                F4: 'F4.mp3',
                G3: 'G3.mp3',
                G5: 'G5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    organ: {
        id: 'organ',
        name: 'Organ',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/organ/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                C2: 'C2.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    piano: {
        id: 'piano',
        name: 'Piano',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/piano/',
            urls: {
                A2: 'A2.mp3',
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                B2: 'B2.mp3',
                B3: 'B3.mp3',
                B4: 'B4.mp3',
                B5: 'B5.mp3',
                C2: 'C2.mp3',
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                D2: 'D2.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                D5: 'D5.mp3',
                E2: 'E2.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                E5: 'E5.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                F5: 'F5.mp3',
                G2: 'G2.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3',
                G5: 'G5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    saxophone: {
        id: 'saxophone',
        name: 'Saxophone',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/saxophone/',
            urls: {
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                B3: 'B3.mp3',
                B4: 'B4.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                D5: 'D5.mp3',
                E3: 'E3.mp3',
                E4: 'E4.mp3',
                E5: 'E5.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                F5: 'F5.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3',
                G5: 'G5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    trombone: {
        id: 'trombone',
        name: 'Trombone',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/trombone/',
            urls: {
                C3: 'C3.mp3',
                C4: 'C4.mp3',
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    trumpet: {
        id: 'trumpet',
        name: 'Trumpet',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/trumpet/',
            urls: {
                A3: 'A3.mp3',
                A5: 'A5.mp3',
                C4: 'C4.mp3',
                D5: 'D5.mp3',
                F3: 'F3.mp3',
                F4: 'F4.mp3',
                F5: 'F5.mp3',
                G4: 'G4.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    tuba: {
        id: 'tuba',
        name: 'Tuba',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/tuba/',
            urls: {
                D3: 'D3.mp3',
                D4: 'D4.mp3',
                F2: 'F2.mp3',
                F3: 'F3.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    violin: {
        id: 'violin',
        name: 'Violin',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/violin/',
            urls: {
                A3: 'A3.mp3',
                A4: 'A4.mp3',
                A5: 'A5.mp3',
                C4: 'C4.mp3',
                C5: 'C5.mp3',
                E4: 'E4.mp3',
                E5: 'E5.mp3',
                G3: 'G3.mp3',
                G4: 'G4.mp3',
                G5: 'G5.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    xylophone: {
        id: 'xylophone',
        name: 'Xylophone',
        category: 'ToneJS Instruments',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/standard/tonejs/xylophone/',
            urls: {
                C5: 'C5.mp3',
                G4: 'G4.mp3',
                G5: 'G5.mp3'
            },
            
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    accordion: {
        id: 'accordion',
        name: 'Accordion',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/accordion-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    acoustic_bass: {
        id: 'acoustic_bass',
        name: 'Acoustic Bass',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/acoustic_bass-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    acoustic_grand_piano: {
        id: 'acoustic_grand_piano',
        name: 'Acoustic Grand Piano',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/acoustic_grand_piano-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    acoustic_guitar_nylon: {
        id: 'acoustic_guitar_nylon',
        name: 'Acoustic Guitar Nylon',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/acoustic_guitar_nylon-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    acoustic_guitar_steel: {
        id: 'acoustic_guitar_steel',
        name: 'Acoustic Guitar Steel',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/acoustic_guitar_steel-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    agogo: {
        id: 'agogo',
        name: 'Agogo',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/agogo-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    alto_sax: {
        id: 'alto_sax',
        name: 'Alto Sax',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/alto_sax-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    applause: {
        id: 'applause',
        name: 'Applause',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/applause-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    bagpipe: {
        id: 'bagpipe',
        name: 'Bagpipe',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/bagpipe-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    banjo: {
        id: 'banjo',
        name: 'Banjo',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/banjo-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    baritone_sax: {
        id: 'baritone_sax',
        name: 'Baritone Sax',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/baritone_sax-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    bird_tweet: {
        id: 'bird_tweet',
        name: 'Bird Tweet',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/bird_tweet-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    blown_bottle: {
        id: 'blown_bottle',
        name: 'Blown Bottle',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/blown_bottle-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    brass_section: {
        id: 'brass_section',
        name: 'Brass Section',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/brass_section-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    breath_noise: {
        id: 'breath_noise',
        name: 'Breath Noise',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/breath_noise-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    bright_acoustic_piano: {
        id: 'bright_acoustic_piano',
        name: 'Bright Acoustic Piano',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/bright_acoustic_piano-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    celesta: {
        id: 'celesta',
        name: 'Celesta',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/celesta-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    church_organ: {
        id: 'church_organ',
        name: 'Church Organ',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/church_organ-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    clavinet: {
        id: 'clavinet',
        name: 'Clavinet',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/clavinet-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    distortion_guitar: {
        id: 'distortion_guitar',
        name: 'Distortion Guitar',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/distortion_guitar-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    drawbar_organ: {
        id: 'drawbar_organ',
        name: 'Drawbar Organ',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/drawbar_organ-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    dulcimer: {
        id: 'dulcimer',
        name: 'Dulcimer',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/dulcimer-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    electric_bass_finger: {
        id: 'electric_bass_finger',
        name: 'Electric Bass Finger',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/electric_bass_finger-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    electric_bass_pick: {
        id: 'electric_bass_pick',
        name: 'Electric Bass Pick',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/electric_bass_pick-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    electric_grand_piano: {
        id: 'electric_grand_piano',
        name: 'Electric Grand Piano',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/electric_grand_piano-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    electric_piano_1: {
        id: 'electric_piano_1',
        name: 'Electric Piano 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/electric_piano_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    electric_piano_2: {
        id: 'electric_piano_2',
        name: 'Electric Piano 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/electric_piano_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    english_horn: {
        id: 'english_horn',
        name: 'English Horn',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/english_horn-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fiddle: {
        id: 'fiddle',
        name: 'Fiddle',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fiddle-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fretless_bass: {
        id: 'fretless_bass',
        name: 'Fretless Bass',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fretless_bass-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_1_rain: {
        id: 'fx_1_rain',
        name: 'Fx 1 Rain',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_1_rain-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_2_soundtrack: {
        id: 'fx_2_soundtrack',
        name: 'Fx 2 Soundtrack',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_2_soundtrack-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_3_crystal: {
        id: 'fx_3_crystal',
        name: 'Fx 3 Crystal',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_3_crystal-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_4_atmosphere: {
        id: 'fx_4_atmosphere',
        name: 'Fx 4 Atmosphere',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_4_atmosphere-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_5_brightness: {
        id: 'fx_5_brightness',
        name: 'Fx 5 Brightness',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_5_brightness-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_6_goblins: {
        id: 'fx_6_goblins',
        name: 'Fx 6 Goblins',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_6_goblins-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_7_echoes: {
        id: 'fx_7_echoes',
        name: 'Fx 7 Echoes',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_7_echoes-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    fx_8_scifi: {
        id: 'fx_8_scifi',
        name: 'Fx 8 Scifi',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/fx_8_scifi-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    glockenspiel: {
        id: 'glockenspiel',
        name: 'Glockenspiel',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/glockenspiel-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    guitar_fret_noise: {
        id: 'guitar_fret_noise',
        name: 'Guitar Fret Noise',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/guitar_fret_noise-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    guitar_harmonics: {
        id: 'guitar_harmonics',
        name: 'Guitar Harmonics',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/guitar_harmonics-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    gunshot: {
        id: 'gunshot',
        name: 'Gunshot',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/gunshot-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    harmonica: {
        id: 'harmonica',
        name: 'Harmonica',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/harmonica-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    harpsichord: {
        id: 'harpsichord',
        name: 'Harpsichord',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/harpsichord-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    helicopter: {
        id: 'helicopter',
        name: 'Helicopter',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/helicopter-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    honkytonk_piano: {
        id: 'honkytonk_piano',
        name: 'Honkytonk Piano',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/honkytonk_piano-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    kalimba: {
        id: 'kalimba',
        name: 'Kalimba',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/kalimba-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    koto: {
        id: 'koto',
        name: 'Koto',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/koto-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_1_square: {
        id: 'lead_1_square',
        name: 'Lead 1 Square',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_1_square-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_2_sawtooth: {
        id: 'lead_2_sawtooth',
        name: 'Lead 2 Sawtooth',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_2_sawtooth-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_3_calliope: {
        id: 'lead_3_calliope',
        name: 'Lead 3 Calliope',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_3_calliope-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_4_chiff: {
        id: 'lead_4_chiff',
        name: 'Lead 4 Chiff',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_4_chiff-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_5_charang: {
        id: 'lead_5_charang',
        name: 'Lead 5 Charang',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_5_charang-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_6_voice: {
        id: 'lead_6_voice',
        name: 'Lead 6 Voice',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_6_voice-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_7_fifths: {
        id: 'lead_7_fifths',
        name: 'Lead 7 Fifths',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_7_fifths-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    lead_8_bass__lead: {
        id: 'lead_8_bass__lead',
        name: 'Lead 8 Bass  Lead',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/lead_8_bass__lead-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    marimba: {
        id: 'marimba',
        name: 'Marimba',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/marimba-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    melodic_tom: {
        id: 'melodic_tom',
        name: 'Melodic Tom',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/melodic_tom-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    music_box: {
        id: 'music_box',
        name: 'Music Box',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/music_box-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    muted_trumpet: {
        id: 'muted_trumpet',
        name: 'Muted Trumpet',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/muted_trumpet-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.1, // A slightly slower attack for a more "breathy" feel
                release: 0.6 // Shorter release for cleaner note transitions with noteCut
            },
            volume: -8,
            
            // --- ENHANCEMENTS ---
            
            // 1. Make the instrument monophonic for realistic melodic lines.
            noteCut: true,

            // 2. Add subtle stereo movement to make it feel more alive.
            panning: {
                enabled: true,
                type: 'sine',
                frequency: 0.5, // Very slow drift
                depth: 0.2      // Shallow pan, just enough to create width
            }
        }
    },
    oboe: {
        id: 'oboe',
        name: 'Oboe',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/oboe-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    ocarina: {
        id: 'ocarina',
        name: 'Ocarina',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/ocarina-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    orchestra_hit: {
        id: 'orchestra_hit',
        name: 'Orchestra Hit',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/orchestra_hit-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    orchestral_harp: {
        id: 'orchestral_harp',
        name: 'Orchestral Harp',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/orchestral_harp-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    overdriven_guitar: {
        id: 'overdriven_guitar',
        name: 'Overdriven Guitar',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/overdriven_guitar-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_1_new_age: {
        id: 'pad_1_new_age',
        name: 'Pad 1 New Age',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_1_new_age-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_2_warm: {
        id: 'pad_2_warm',
        name: 'Pad 2 Warm',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_2_warm-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_3_polysynth: {
        id: 'pad_3_polysynth',
        name: 'Pad 3 Polysynth',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_3_polysynth-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_4_choir: {
        id: 'pad_4_choir',
        name: 'Pad 4 Choir',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_4_choir-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_5_bowed: {
        id: 'pad_5_bowed',
        name: 'Pad 5 Bowed',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_5_bowed-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_6_metallic: {
        id: 'pad_6_metallic',
        name: 'Pad 6 Metallic',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_6_metallic-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_7_halo: {
        id: 'pad_7_halo',
        name: 'Pad 7 Halo',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_7_halo-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pad_8_sweep: {
        id: 'pad_8_sweep',
        name: 'Pad 8 Sweep',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pad_8_sweep-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pan_flute: {
        id: 'pan_flute',
        name: 'Pan Flute',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pan_flute-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    percussive_organ: {
        id: 'percussive_organ',
        name: 'Percussive Organ',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/percussive_organ-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    pizzicato_strings: {
        id: 'pizzicato_strings',
        name: 'Pizzicato Strings',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/pizzicato_strings-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    recorder: {
        id: 'recorder',
        name: 'Recorder',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/recorder-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    reed_organ: {
        id: 'reed_organ',
        name: 'Reed Organ',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/reed_organ-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    reverse_cymbal: {
        id: 'reverse_cymbal',
        name: 'Reverse Cymbal',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/reverse_cymbal-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    rock_organ: {
        id: 'rock_organ',
        name: 'Rock Organ',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/rock_organ-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    seashore: {
        id: 'seashore',
        name: 'Seashore',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/seashore-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    shakuhachi: {
        id: 'shakuhachi',
        name: 'Shakuhachi',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/shakuhachi-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    shamisen: {
        id: 'shamisen',
        name: 'Shamisen',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/shamisen-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    shanai: {
        id: 'shanai',
        name: 'Shanai',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/shanai-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    sitar: {
        id: 'sitar',
        name: 'Sitar',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/sitar-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    slap_bass_1: {
        id: 'slap_bass_1',
        name: 'Slap Bass 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/slap_bass_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    slap_bass_2: {
        id: 'slap_bass_2',
        name: 'Slap Bass 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/slap_bass_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    soprano_sax: {
        id: 'soprano_sax',
        name: 'Soprano Sax',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/soprano_sax-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    steel_drums: {
        id: 'steel_drums',
        name: 'Steel Drums',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/steel_drums-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    string_ensemble_1: {
        id: 'string_ensemble_1',
        name: 'String Ensemble 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/string_ensemble_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    string_ensemble_2: {
        id: 'string_ensemble_2',
        name: 'String Ensemble 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/string_ensemble_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_bass_1: {
        id: 'synth_bass_1',
        name: 'Synth Bass 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_bass_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_bass_2: {
        id: 'synth_bass_2',
        name: 'Synth Bass 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_bass_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_brass_1: {
        id: 'synth_brass_1',
        name: 'Synth Brass 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_brass_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_brass_2: {
        id: 'synth_brass_2',
        name: 'Synth Brass 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_brass_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_choir: {
        id: 'synth_choir',
        name: 'Synth Choir',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_choir-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_drum: {
        id: 'synth_drum',
        name: 'Synth Drum',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_drum-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_strings_1: {
        id: 'synth_strings_1',
        name: 'Synth Strings 1',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_strings_1-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    synth_strings_2: {
        id: 'synth_strings_2',
        name: 'Synth Strings 2',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/synth_strings_2-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    taiko_drum: {
        id: 'taiko_drum',
        name: 'Taiko Drum',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/taiko_drum-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    tango_accordion: {
        id: 'tango_accordion',
        name: 'Tango Accordion',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/tango_accordion-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    telephone_ring: {
        id: 'telephone_ring',
        name: 'Telephone Ring',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/telephone_ring-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    tenor_sax: {
        id: 'tenor_sax',
        name: 'Tenor Sax',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/tenor_sax-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    timpani: {
        id: 'timpani',
        name: 'Timpani',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/timpani-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    tinkle_bell: {
        id: 'tinkle_bell',
        name: 'Tinkle Bell',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/tinkle_bell-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    tubular_bells: {
        id: 'tubular_bells',
        name: 'Tubular Bells',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/tubular_bells-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    vibraphone: {
        id: 'vibraphone',
        name: 'Vibraphone',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/vibraphone-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    viola: {
        id: 'viola',
        name: 'Viola',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/viola-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    voice_oohs: {
        id: 'voice_oohs',
        name: 'Voice Oohs',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/voice_oohs-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    whistle: {
        id: 'whistle',
        name: 'Whistle',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/whistle-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
    woodblock: {
        id: 'woodblock',
        name: 'Woodblock',
        category: 'Musyng Kite',
        type: 'sampler',
        config: {
            baseUrl: '/sounds/musyng_kite/woodblock-mp3/',
            urls: {
                A1: 'A1.mp3',
                C2: 'C2.mp3',
                G2: 'G2.mp3',
                C3: 'C3.mp3',
                G3: 'G3.mp3',
                C4: 'C4.mp3',
                G4: 'G4.mp3',
                C5: 'C5.mp3',
                G5: 'G5.mp3',
                C6: 'C6.mp3'
            },
            envelope: {
                attack: 0.05,
                release: 1
            },
            volume: -8
        }
    },
'de_bass_guitar': {
    "id": "de_bass_guitar",
    "name": "De Bass Guitar",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_bass_guitar/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 1.1681818181818182,
            "end": 1.503
        }
    }
},

'de_low_string': {
    "id": "de_low_string",
    "name": "De Low String",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_low_string/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 2
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "pingpong",
            "start": 1.2732426303854876,
            "end": 1.9012018140589568,
            "crossfade": 0.01
        },
        "noteCut": true
    }
},

'de_mid_string': {
    "id": "de_mid_string",
    "name": "De Mid String",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_mid_string/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.08873290136789057,
            "end": 1.5417566594672427,
            "crossfade": 0.015 
        }
    }
},

'de_ominous': {
    "id": "de_ominous",
    "name": "De Ominous",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_ominous/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.9245101873911034,
            "end": 1.4934750915620667
        }
    }
},

'de_ominous_low': {
    "id": "de_ominous_low",
    "name": "De Ominous Low",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_ominous_low/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.3308994072674169,
            "end": 0.9980242247229619
        }
    }
},

'de_legato_string': {
    "id": "de_legato_string",
    "name": "De Legato String",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_legato_string/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.6647529838344161,
            "end": 2.3408974165281764
        }
    }
},

'de_atmosphere': {
    "id": "de_atmosphere",
    "name": "De Atmosphere",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_atmosphere/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.9066959385290889,
            "end": 5.296782020913976
        },
        "noteCut": true
    }
},

'de_crystal': {
    "id": "de_crystal",
    "name": "De Crystal",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_crystal/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.4075711209339227,
            "end": 0.7588121953983906
        }
    }
},

'de_drum_lofi_pattern': {
    "id": "de_drum_lofi_pattern",
    "name": "De Drum Lofi Pattern",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_drum_lofi_pattern/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_low_buzz': {
    "id": "de_low_buzz",
    "name": "De Low Buzz",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_low_buzz/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            // FIX: Drastically shorten the release to make note cuts clean and snappy.
            "release": 0.2 
            // REMOVED: "sustain" is not a time value and is not needed here.
        },
        "volume": -3, // This volume might be fine, but consider lowering if mix is muddy.
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.20183273402157523,
            "end": 0.2180721494026215,
            // FIX: Crossfade must be very short for a micro-loop. 5ms is a good value.
            "crossfade": 0.005
        },
        "panning": {
            "enabled": true,
            "type": "sine",
            "frequency": 4,
            "depth": 0.8
        },
        "noteCut": true
    }
},

'de_error_buzz': {
    "id": "de_error_buzz",
    "name": "De Error Buzz",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_error_buzz/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.31716034271725824,
            "end": 0.34776009791921664
        },
        "noteCut": true
    }
},

'de_atmos_rumble': {
    "id": "de_atmos_rumble",
    "name": "De Atmos Rumble",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_atmos_rumble/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0.33554794980202673,
            "end": 2.06620361049594
        },
        "noteCut": true
    }
},

'de_perc_tap': {
    "id": "de_perc_tap",
    "name": "De Perc Tap",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_perc_tap/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_perc_thump': {
    "id": "de_perc_thump",
    "name": "De Perc Thump",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_perc_thump/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_perc_hit': {
    "id": "de_perc_hit",
    "name": "De Perc Hit",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_perc_hit/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_drum_break': {
    "id": "de_drum_break",
    "name": "De Drum Break",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_drum_break/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_perc_deep': {
    "id": "de_perc_deep",
    "name": "De Perc Deep",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_perc_deep/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_perc_soft': {
    "id": "de_perc_soft",
    "name": "De Perc Soft",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_perc_soft/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_swelling': {
    "id": "de_swelling",
    "name": "De Swelling",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_swelling/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": true,
            "type": "forward",
            "start": 0,
            "end": 5.978715771852206
        }
    }
},

'de_long_snare': {
    "id": "de_long_snare",
    "name": "De Long Snare",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_long_snare/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_hard_hit': {
    "id": "de_hard_hit",
    "name": "De Hard Hit",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_hard_hit/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
},

'de_bass_drum': {
    "id": "de_bass_drum",
    "name": "De Bass Drum",
    "category": "Deus Ex",
    "type": "sampler",
    "mapping": "diatonic",
    "config": {
        "baseUrl": "/sounds/tracker/de_bass_drum/",
        "urls": {
            "C5": "sample.flac"
        },
        "envelope": {
            "attack": 0.01,
            "release": 0.5
        },
        "volume": -9,
        "octaveOffset": 0,
        "loop": {
            "enabled": false,
            "type": "forward",
            "start": 0,
            "end": 0
        }
    }
}

};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);