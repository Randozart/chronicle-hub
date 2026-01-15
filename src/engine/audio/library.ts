// src/engine/audio/library.ts

interface Snippet {
    name: string;
    description: string;
    code: string;
}

interface SnippetCategory {
    name: string;
    snippets: Snippet[];
}

export const LIGATURE_LIBRARY: Record<string, SnippetCategory> = {
    "fantasy": {
        "name": "Fantasy & Cinematic",
        "snippets": [
            {
                "name": "Heroic Brass Fanfare",
                "description": "A triumphant, rising melody for horns.",
                "code": "[INSTRUMENTS]\nBrass: hq_horn\n\n[PATTERN: Heroic_Fanfare]\n// Use a bright Major or Lydian scale for best results.\nBrass(v:0) | 1 . 3 .  5 . . .  (1' . 7) 5 | 6 - - -  - - 5 -  3 - 1 - |"
            },
            {
                "name": "Ominous Low Strings",
                "description": "A slow, pulsing bassline to build tension.",
                "code": "[INSTRUMENTS]\nLowStrings: hq_cello\n\n[PATTERN: Ominous_Pulse]\n// Use a Minor or Dorian scale.\nLowStrings(v:-6) | 1, - . . 1, - . .  1, - . . 1, - . . | 1, - . . 1, - . .  1, - . . 1, - . . |"
            },
            {
                "name": "Mysterious Harp Arpeggio",
                "description": "A flowing, magical harp pattern.",
                "code": "[INSTRUMENTS]\nHarp: harp\n\n[PATTERN: Mystic_Arp]\n// Grid: 4 is fine, but Grid: 8 or 12 sounds better for fast runs.\nHarp(v:-5) | 1 . 3 . 5 . 1' . 5 . 3 . | 6, . 1 . 3 . 6, . 1 . 3 . |"
            },
            {
                "name": "Marching War Drums",
                "description": "A powerful, driving rhythm for battles.",
                "code": "[INSTRUMENTS]\nDrums: timpani_hit\n\n[PATTERN: War_Drums]\n// Use a deep percussion sample like timpani or bodhran.\nDrums(v:0) | 1 . . (1 1)  1 . . . | 1 . . (1 1)  1 . 1 . |"
            }
        ]
    },
    "scifi": {
        "name": "Sci-Fi & Cyberpunk",
        "snippets": [
            {
                "name": "Driving Synth Bass",
                "description": "A classic 16th-note synthwave bassline.",
                "code": "[INSTRUMENTS]\nSynthBass: fm_bass\n\n[PATTERN: Synth_Bass]\n// Use a punchy synth bass like fm_bass.\nSynthBass(v:-2) | 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, | 6,,6,,6,,6,,6,,6,,6,,6,,4,,4,,4,,4,,4,,4,,4,,4,, |"
            },
            {
                "name": "Blade Runner Pad",
                "description": "A long, evolving chord for atmosphere. Use with a warm pad.",
                "code": "[INSTRUMENTS]\nPad: warm_pad(r:5.0)\n\n[PATTERN: Cyber_Pad]\n// Use a very long release on your instrument (e.g., release: 5.0)\nPad(v:-18) | @min7 - - - - - - - - - - - - - - - | @Maj7(4) - - - - - - - - - - - - - - - |"
            },
            {
                "name": "Glitchy Arpeggio",
                "description": "A fast, semi-random arpeggio for a high-tech feel.",
                "code": "[INSTRUMENTS]\nPluck: retro_lead(r:0.1)\n\n[PATTERN: Glitch_Arp]\n// Use a pluck or bell sound.\nPluck(v:-9) | (1 3 5 3) (1 3 6 3) (1 4 6 4) (1 3 5 3) |"
            }
        ]
    },
    "rhythms": {
        "name": "Rhythmic Patterns (4/4)",
        "snippets": [
            {
                "name": "Four on the Floor",
                "description": "Basic dance/rock beat.",
                "code": "[INSTRUMENTS]\nKit: standard_kit\n\n[PATTERN: Four_On_Floor]\n// Assumes Kick on 1, Snare on 2\nKit(n:1, v:0)  | 1 . . . 1 . . . 1 . . . 1 . . . |\nKit(n:2, v:-2)| . . . . 1 . . . . . . . 1 . . . |"
            },
            {
                "name": "Basic Rock Beat",
                "description": "Kick, Snare, and 8th-note Hi-Hats.",
                "code": "[INSTRUMENTS]\nKit: standard_kit\n\n[PATTERN: Rock_Beat]\nKit(n:1, v:0)  | 1 . . . . . . . 1 . . . . . . . |\nKit(n:2, v:-2)| . . . . 1 . . . . . . . 1 . . . |\nKit(n:4, v:-8)| 1 . 1 . 1 . 1 . 1 . 1 . 1 . 1 . |"
            }
        ]
    },
    "progressions": {
        "name": "Chord Progressions",
        "snippets": [
            {
                "name": "Pop Progression (I-V-vi-IV)",
                "description": "The most common progression in pop music. Best in a Major key.",
                "code": "[INSTRUMENTS]\nPad: warm_pad\n\n[DEFINITIONS]\n@I   = [1, 3, 5]\n@V   = [5, 7, 2']\n@vi  = [6, 1', 3']\n@IV  = [4, 6, 1']\n\n[PATTERN: Chord_I]\nPad | @I - - - - - - - |\n[PATTERN: Chord_V]\nPad | @V - - - - - - - |\n[PATTERN: Chord_vi]\nPad | @vi - - - - - - - |\n[PATTERN: Chord_IV]\nPad | @IV - - - - - - - |\n\n[PLAYLIST]\nChord_I\nChord_V\nChord_vi\nChord_IV"
            },
            {
                "name": "Cinematic Progression (i-VI-III-VII)",
                "description": "Epic, emotional progression. Best in a Minor key.",
                "code": "[INSTRUMENTS]\nStrings: string_ensemble_1\n\n[DEFINITIONS]\n@i   = [1, 3b, 5]\n@VI  = [6b, 1', 3b']\n@III = [3b, 5, 7b]\n@VII = [7b, 2', 4']\n\n[PATTERN: Chord_i]\nStrings | @i - - - - - - - |\n[PATTERN: Chord_VI]\nStrings | @VI - - - - - - - |\n[PATTERN: Chord_III]\nStrings | @III - - - - - - - |\n[PATTERN: Chord_VII]\nStrings | @VII - - - - - - - |\n\n[PLAYLIST]\nChord_i\nChord_VI\nChord_III\nChord_VII"
            },
            {
                "name": "Jazz Progression (ii-V-I)",
                "description": "The cornerstone of jazz harmony.",
                "code": "[INSTRUMENTS]\nPiano: hq_piano\n\n[DEFINITIONS]\n@ii  = [2, 4, 6]
            }
        ]
    },
    "horror": {
        "name": "Dark & Horror",
        "snippets": [
            {
                "name": "Low Dread Drone",
                "description": "Sustained low note for tension and unease.",
                "code": "[INSTRUMENTS]\nDrone: cello_section\n\n[PATTERN: Dread_Drone]\n// Best with cello_section, sub_bass, or choir.\nDrone(v:-18) | 1, - - - - - - - | 1, - - - - - - - |"
            },
            {
                "name": "Heartbeat Pulse",
                "description": "Slow, irregular pulse for suspense scenes.",
                "code": "[INSTRUMENTS]\nPulse: timpani_hit\n\n[PATTERN: Heartbeat]\n// Use timpani_hit or low percussion.\nPulse(v:-6) | 1 . . . . . . . 1 . . . . . . . |"
            },
            {
                "name": "Creeping Semitone Figure",
                "description": "Classic horror half-step motion.",
                "code": "[INSTRUMENTS]\nStrings: hq_pizzicato\n\n[PATTERN: Creeping_Halfstep]\n// Works well on strings or glassy pads.\nStrings(v:-12) | 1 . 2b .  1 . 2b . | 1 . 2b .  1 . 2b . |"
            }
        ]
    },
    "motion": {
        "name": "Motion & Ostinati",
        "snippets": [
            {
                "name": "Low String Ostinato",
                "description": "Driving repeating figure for action or tension.",
                "code": "[INSTRUMENTS]\nLowStrings: hq_cello\n\n[PATTERN: String_Ostinato]\n// Grid: 4 or 8. Minor keys recommended.\nLowStrings(v:-10) | 1, . 5, .  1 . 5 . | 1, . 5, .  1 . 5 . |"
            },
            {
                "name": "Pulsing Eighth Notes",
                "description": "Simple rhythmic motor pattern.",
                "code": "[INSTRUMENTS]\nPulse: hq_pizzicato\n\n[PATTERN: Pulse_8ths]\nPulse(v:-8) | 1 . 1 . 1 . 1 . | 1 . 1 . 1 . 1 . |"
            },
            {
                "name": "Rising Tension Run",
                "description": "Ascending line to build energy.",
                "code": "[INSTRUMENTS]\nLead: hq_violin\n\n[PATTERN: Rising_Run]\n// Often used before a drop or hit.\nLead(v:-6) | (1 2 3 4) (5 6 7 1') |"
            }
        ]
    },
    "rpg": {
        "name": "RPG Utility",
        "snippets": [
            {
                "name": "Tavern Drone Fifth",
                "description": "Medieval-style open fifth drone.",
                "code": "[INSTRUMENTS]\nDrone: hurdy_gurdy\n\n[PATTERN: Tavern_Drone]\n// Works with hurdy-gurdy, harp, or flute.\nDrone(v:-10) | 1, 5, - - - - - | 1, 5, - - - - - |"
            },
            {
                "name": "Wandering Melody",
                "description": "Neutral exploration theme fragment.",
                "code": "[INSTRUMENTS]\nLead: hq_flute\n\n[PATTERN: Wander_Melody]\n// Dorian or Mixolydian works well.\nLead(v:-6) | 1 . 2 .  3 . 5 . | 4 . 3 .  2 . 1 . |"
            },
            {
                "name": "Hero Rest Cadence",
                "description": "Soft resolution phrase.",
                "code": "[INSTRUMENTS]\nLead: hq_flute\n\n[PATTERN: Hero_Cadence]\nLead(v:-8) | 5 . 4 .  3 - - - |"
            }
        ]
    },
    "atmosphere": {
        "name": "Atmosphere & Texture",
        "snippets": [
            {
                "name": "Sparse Bell Echoes",
                "description": "Minimal, empty-space texture.",
                "code": "[INSTRUMENTS]\nBell: tinkle_bell(r:2.0)\n\n[PATTERN: Bell_Echo]\n// Leave silence between notes.\nBell(v:-18) | 1 . . . . . . . | . . . . 5 . . . |"
            },
            {
                "name": "High Glass Shimmer",
                "description": "Light upper-register sparkle.",
                "code": "[INSTRUMENTS]\nGlass: glass_pad\n\n[PATTERN: Glass_Shimmer]\n// Raise octave if needed in playlist.\nGlass(v:-20) | (1' 5' 3') . . . | (6' 3' 5') . . . |"
            },
            {
                "name": "Breathing Pad Swell",
                "description": "Slow dynamic bed for cinematic scenes.",
                "code": "[INSTRUMENTS]\nPad: warm_pad(a:2.0, r:4.0)\n\n[PATTERN: Pad_Swell]\n// Use long attack/release.\nPad(v:-22) | @min - - - - - - - | @Sus - - - - - - - |"
            }
        ]
    },
    "progressions_extended": {
        "name": "Progressions & Harmonic Loops",
        "snippets": [
            {
                "name": "Heroic Minor (i–VI–III–VII)",
                "description": "Classic fantasy / JRPG heroic progression.",
                "code": "[INSTRUMENTS]\nPad: string_ensemble_1\n\n[DEFINITIONS]\n@i   = [1, 3b, 5]\n@VI  = [6b, 1', 3b']\n@III = [3b, 5, 7b]\n@VII = [7b, 2', 4']\n\n[PATTERN: Prog_i]\nPad | @i - - - - - - - |\n[PATTERN: Prog_VI]\nPad | @VI - - - - - - - |\n[PATTERN: Prog_III]\nPad | @III - - - - - - - |\n[PATTERN: Prog_VII]\nPad | @VII - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_VI\nProg_III\nProg_VII"
            },
            {
                "name": "Tavern Modal Loop (i–VII–i)",
                "description": "Folky, medieval, and grounded.",
                "code": "[INSTRUMENTS]\nDrone: hurdy_gurdy\n\n[DEFINITIONS]\n@i    = [1, 3b, 5]\n@VII  = [7b, 2', 4']\n\n[PATTERN: Prog_i]\nDrone | @i - - - - - - - |\n[PATTERN: Prog_VII]\nDrone | @VII - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_VII\nProg_i"
            },
            {
                "name": "Dread Descent (i–i°–VI)",
                "description": "Unstable and ominous harmonic motion.",
                "code": "[INSTRUMENTS]\nStrings: hq_cello\n\n[DEFINITIONS]\n@i   = [1, 3b, 5]\n@i0  = [1, 3b, 5b]\n@VI  = [6b, 1', 3b']\n\n[PATTERN: Prog_i]\nStrings | @i - - - - - - - |\n[PATTERN: Prog_i0]\nStrings | @i0 - - - - - - - |\n[PATTERN: Prog_VI]\nStrings | @VI - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_i0\nProg_VI"
            },
            {
                "name": "Endless Dread (i–i)",
                "description": "Static horror loop for ambience.",
                "code": "[INSTRUMENTS]\nDrone: sub_bass(r:5.0)\n\n[DEFINITIONS]\n@i = [1, 3b, 5]\n\n[PATTERN: Prog_i]\nDrone | @i - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_i"
            },
            {
                "name": "Cinematic Rise (vi–IV–I–V)",
                "description": "Emotional build, works great for trailers.",
                "code": "[INSTRUMENTS]\nPad: string_ensemble_1\n\n[DEFINITIONS]\n@vi = [6, 1', 3']\n@IV = [4, 6, 1']\n@I  = [1, 3, 5]\n@V  = [5, 7, 2']\n\n[PATTERN: Prog_vi]\nPad | @vi - - - - - - - |\n[PATTERN: Prog_IV]\nPad | @IV - - - - - - - |\n[PATTERN: Prog_I]\nPad | @I - - - - - - - |\n[PATTERN: Prog_V]\nPad | @V - - - - - - - |\n\n[PLAYLIST]\nProg_vi\nProg_IV\nProg_I\nProg_V"
            },
            {
                "name": "Slow Revelation (i–III–VI)",
                "description": "Mysterious and restrained.",
                "code": "[INSTRUMENTS]\nPad: glass_pad(a:1.5)\n\n[DEFINITIONS]\n@i   = [1, 3b, 5]\n@III = [3b, 5, 7b]\n@VI  = [6b, 1', 3b']\n\n[PATTERN: Prog_i]\nPad | @i - - - - - - - |\n[PATTERN: Prog_III]\nPad | @III - - - - - - - |\n[PATTERN: Prog_VI]\nPad | @VI - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_III\nProg_VI"
            },
            {
                "name": "Circle of Fifths (Minor)",
                "description": "Strong forward motion, classical feel.",
                "code": "[INSTRUMENTS]\nKeys: harpsichord\n\n[DEFINITIONS]\n@i   = [1, 3b, 5]\n@iv  = [4, 6b, 1']\n@VII = [7b, 2', 4']\n@III = [3b, 5, 7b]\n\n[PATTERN: Prog_i]\nKeys | @i - - - |\n[PATTERN: Prog_iv]\nKeys | @iv - - - |\n[PATTERN: Prog_VII]\nKeys | @VII - - - |\n[PATTERN: Prog_III]\nKeys | @III - - - |\n\n[PLAYLIST]\nProg_i\nProg_iv\nProg_VII\nProg_III"
            },
            {
                "name": "Synthwave Minor Loop (i–VII–VI–VII)",
                "description": "Dark retro drive.",
                "code": "[INSTRUMENTS]\nPad: warm_pad(r:4.0)\n\n[DEFINITIONS]\n@i    = [1, 3b, 5]\n@VII  = [7b, 2', 4']\n@VI   = [6b, 1', 3b']\n\n[PATTERN: Prog_i]\nPad(v:-18) | @i - - - - - - - |\n[PATTERN: Prog_VII]\nPad(v:-18) | @VII - - - - - - - |\n[PATTERN: Prog_VI]\nPad(v:-18) | @VI - - - - - - - |\n\n[PLAYLIST]\nProg_i\nProg_VII\nProg_VI\nProg_VII"
            }
        ]
    }
};