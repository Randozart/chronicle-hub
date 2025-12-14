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
        "000_bodhran_sidel": {
        "id": "000_bodhran_sidel",
        "name": "000 Bodhran SideL",
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
    "001_bodran_skinl": {
        "id": "001_bodran_skinl",
        "name": "001 Bodran SkinL",
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
    "002_crwth": {
        "id": "002_crwth",
        "name": "002 Crwth",
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
    "003_brass_lure_start": {
        "id": "003_brass_lure_start",
        "name": "003 brass-lure start",
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
    "004_bukkehornl": {
        "id": "004_bukkehornl",
        "name": "004 BukkehornL",
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
    "005_bukkehornstartl": {
        "id": "005_bukkehornstartl",
        "name": "005 BukkehornStartL",
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
    "006_celtic_harp_c2l": {
        "id": "006_celtic_harp_c2l",
        "name": "006 celtic harp-c2L",
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
    "007_conchcontinuel": {
        "id": "007_conchcontinuel",
        "name": "007 ConchContinueL",
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
    "008_conchl": {
        "id": "008_conchl",
        "name": "008 ConchL",
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
    "009_cornemusecontinuel": {
        "id": "009_cornemusecontinuel",
        "name": "009 cornemuseContinueL",
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
    "010_cornemusestartl": {
        "id": "010_cornemusestartl",
        "name": "010 cornemuseStartL",
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
    "012_irish_lyre_harpl": {
        "id": "012_irish_lyre_harpl",
        "name": "012 IRISH LYRE HARPL",
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
    "013_jaw_harp": {
        "id": "013_jaw_harp",
        "name": "013 jaw harp",
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
    "015_jouhikkol": {
        "id": "015_jouhikkol",
        "name": "015 JouhikkoL",
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
    "016_nyckelharpa2l": {
        "id": "016_nyckelharpa2l",
        "name": "016 Nyckelharpa2L",
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
    "017_prillarhorncontinuel": {
        "id": "017_prillarhorncontinuel",
        "name": "017 PrillarhornContinueL",
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
    "018_prillarhornl": {
        "id": "018_prillarhornl",
        "name": "018 PrillarhornL",
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
    "020_psalmodikonl": {
        "id": "020_psalmodikonl",
        "name": "020 PsalmodikonL",
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
    "021_sheepboneflutecontil": {
        "id": "021_sheepboneflutecontil",
        "name": "021 sheepboneflutecontiL",
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
    "022_sheepboneflutestartl": {
        "id": "022_sheepboneflutestartl",
        "name": "022 sheepboneflutestartL",
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
    "024_tagelharpa2l": {
        "id": "024_tagelharpa2l",
        "name": "024 tagelharpa2L",
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
    "026_tagelharpa3l": {
        "id": "026_tagelharpa3l",
        "name": "026 tagelharpa3L",
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
    "028_tin_whistle_startl": {
        "id": "028_tin_whistle_startl",
        "name": "028 tin whistle startL",
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
    "029_hurdy_gurdy": {
        "id": "029_hurdy_gurdy",
        "name": "029 Hurdy Gurdy",
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
    }
    
    
};

export const DEFAULT_INSTRUMENT_LIST = Object.values(AUDIO_PRESETS);