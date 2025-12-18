'use client';

import { Suspense, useEffect, useState } from 'react';
import { InstrumentDefinition } from '@/engine/audio/models';
import { DEFAULT_INSTRUMENT_LIST } from '@/engine/audio/presets';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const TrackEditor = dynamic(() => import('@/app/create/[storyId]/audio/components/TrackEditor'), {
    ssr: false,
    loading: () => <div style={{ color: '#555', padding: '2rem' }}>Loading Audio Lab...</div>
});

// FIX: Local interface to solve any potential import issues with LigatureTrack
interface LigatureTrack {
    id: string;
    name: string;
    source: string;
    category?: string;
}


const PRESETS: Record<string, { name: string, description: string, source: string }> = {
    "neon": {
        name: "Neon Nights (Basics)",
        description: "A starter track demonstrating the core concepts: Config, simple patterns, basic chords, and standard playlist layering. Perfect for learning the syntax.",
        source: `[CONFIG]
//This block tells the music player important information about the track.
BPM: 110    //BPM is how fast it's supposed to play. 
            //By increasing BPM, you increase the speed of the track.
Scale: C Minor  //The scale definition allows you to describe notes by their relative scale number. 
                //This means you can change the scale to instantly change the sound of the music. 
Time: 4/4   //Time signature is used to define the number of notes per bar. 
            //4/4 is the default, and means "4 beats of 1/4th notes". Common in most music.
Grid: 4     //Grid is used to define how many positions each beat has. 
            //4 is the default. This means each "beat" has 4 positions, represented with a symbol. 

[INSTRUMENTS]
//These are the instruments used in the track.
//By assigning instrument definitions to variable names like "Bass", 
//you can change the instrument for multiple tracks at once.
Bass: fm_bass
Lead: retro_lead
Pads: warm_pad

[DEFINITIONS]
// Define chords using scale degrees relative to the Key (C Minor)
// 1 = Root, 3 = Third, 5 = Fifth. 
// Note: We don't use commas inside definitions!
@Root = [1 3 5]
@Sus  = [1 4 5]

[PATTERN: Intro_Bass]
// A simple monophonic bass line.
// '1' is the root note. '1,' is the root note an octave down.
Bass | 1 . . 1  1, . . 1  1 . . 1  1, . . . |

[PATTERN: Main_Melody]
// You can define multiple instruments in one pattern block.
Bass | 1 . . 1  1, . . 1  4 . . 4  5, . . . |
// Use ' to shift an octave up. (2 3 2) is a tuplet (fast triplet).
Lead | 3 - 5 -  1' - 5 -  6 - 4 -  2 . (2 3 2) . |

//These patterns are currently slightly misaligned. 
//You can press the "Format Grid" button to align the notes.

[PATTERN: Pads_Layer]
// Using defined chords (@Root) usually requires less typing.
Pads | @Root - - -  - - - -  @Sus - - -  - - - - |

[PLAYLIST]
// 1. Play the Intro
Intro_Bass

// 2. Play Melody and Pads at the same time (Comma separator)
Main_Melody, Pads_Layer

// 3. Play them again, but transposed up 4 scale degrees
Main_Melody( +4 ), Pads_Layer( +4 )

// 4. Back to Intro
Intro_Bass
`
    },
    "tech_demo": {
        name: "Engine Tech Demo (Advanced)",
        description: "A showcase of the V2 engine features: Stacked Bars (Polyphony inside a single pattern), Sequential Chaining (+ operator), and Elastic Looping (automatic synchronization of different length patterns).",
        source: `[CONFIG]
BPM: 110
Scale: C Minor
Grid: 4

[INSTRUMENTS]
Bass: fm_bass
Lead: retro_lead
Pads: warm_pad
Drums: standard_kit

[DEFINITIONS]
// Advanced Chords
@Min7 = [1 3b 5 7b]
@Maj7 = [1 3 5 7]

[PATTERN: Bass_Complex]
// FEATURE: Stacked Bars
// Notice the second line has no instrument name.
// It inherits 'Bass' from above, allowing you to write polyphony (chords)
// or counter-melodies on the same instrument easily.
Bass(v:0) | 1 . . .  1 . . .  4 . . .  5 . . . |
          | . . 1' . . . 5 .  . . 4' . . . 2 . |

[PATTERN: Melody_A]
Lead      | 1 . 2 .  3 . 5 .  4 . 3 .  2 - - - |

[PATTERN: Melody_B]
Lead      | 5 . 6 .  7 . 1' . 2' . 1' . 7 - - - |

[PATTERN: Pads_Swell]
Pads(a:1) | @Min7 - - - - - - - - - - - - - - - |

[PATTERN: Drum_Loop]
Drums     | 1 . . . 2 . . . 1 . . . 2 . . . |

[PLAYLIST]
// 1. Standard Layering
Bass_Complex, Pads_Swell

// 2. Advanced Playlist Logic
// LAYER 1: Melody_A + Melody_B
//    The '+' sign plays patterns sequentially on the same layer.
//    Total Duration: 2 bars + 2 bars = 4 bars.
//
// LAYER 2: Bass_Complex
//    This pattern is only 2 bars long.
//    Because Layer 1 is 4 bars long, the engine automatically loops
//    this bass pattern to match the longest chain.
//
// LAYER 3: Drum_Loop (1 Bar)
//    Loops 4 times to match.
Melody_A + Melody_B, Bass_Complex, Drum_Loop

// 3. Modifiers in Chains
// You can transpose individual links in a chain.
// Here we play A, then A again but pitched up an octave (+12).
Melody_A + Melody_A(o:+1), Pads_Swell
`
    },
    "noir_jazz": {
    name: "Midnight Blues (Noir Jazz)",
    description: "A moody, swinging jazz piece demonstrating swing, advanced chords (7ths), stacked polyphonic drums, and complex playlist chaining.",
    source: `[CONFIG]
// BPM is slow for a moody, detective-office feel.
BPM: 95
Scale: D Minor
Grid: 4

// Swing is crucial for a jazz feel. 50 is a good starting point.
// It delays every second 16th note, creating a "shuffling" rhythm.
Swing: 50
Humanize: 30

[INSTRUMENTS]
//Heavily modified trumpet with volume, attack, release and decay for atmospherics
Trumpet: muted_trumpet(v:+10, a:0.5, r:2.0, d:2.5) 
Bass: acoustic_bass(v:+10)
Drums: standard_kit(v:-5, d: 1.5)
Pad: warm_pad(a:1.5, r:3.0) // Slow attack/release for atmosphere

[DEFINITIONS]
// Jazz harmony relies on 7th chords. Whitespace separated.
@min7 = [1 3b 5 7b]
@dom7 = [1 3 5 7b] // Used for the 'V' chord

[PATTERN: Drum_Beat_Swing]
// This pattern uses the 'standard_kit' which is a CHROMATIC instrument.
// Its notes are FIXED and DO NOT change with the song's key, so take this in mind.
// The scale degrees map to a piano keyboard (C4 = 1, D4 = 2, etc.)
// 1 -> C4 -> Kick
// 2 -> D4 -> Snare
// 4 -> F4 -> Closed Hi-Hat (Used here to simulate a Ride Cymbal)

// This creates a classic jazz "swing" pattern.
// With Swing: 50, the "4 . 4 ." becomes a "long-short" rhythm.
Drums | 1 . . . . . . .   1 . . . . . . . |
      | . . . . 2 . . .   . . . . 2 . . . |
      | 4 . 4 . 4 . 4 .   4 . 4 . 4 . 4 . |

[PATTERN: Bass_Walk_i]
// A 2-bar walking bassline for the 'i' chord (Dm)
Bass(o:-1) | 1, . 3b, .   5, . 7b, .   1 . 7b, .   5, . 3b, . |

[PATTERN: Bass_Walk_iv]
// A 2-bar walking bassline for the 'iv' chord (Gm)
Bass(o:-1) | 4, . 6b, .   1 . 3b .   4 . 3b .   1 . 6b, . |

[PATTERN: Pad_Dm7]
// A long pad for the Dm7 chord
Pad(v:-15, o:-2) | @min7 - - -   - - - -   - - - -   - - - - |

[PATTERN: Pad_Gm7]
// Pad for the Gm7 chord, transposed from the Dm7 definition
Pad(4, v:-15, o:-2) | @min7 - - -   - - - -   - - - -   - - - - |

[PATTERN: Trumpet_Intro]
// A lonely, simple intro melody.
Trumpet(o:-1) | 3b . . .   5 - - -   4 . . .   3b - - - |

[PATTERN: Trumpet_Main]
// A more complex melody using a "blue note" (4#).
Trumpet(o:-1) | 1 3b 2 1   5, . . .   4# . . .   5 - - - | 1' . 7b .   5 . 3b .   4# - - -   . . . . |

[PLAYLIST]
// The song is arranged in sections using playlist rows.

// Section 1: Atmosphere (2 bars)
// Just the intro melody and a pad chord.
Trumpet_Intro, Pad_Dm7

// Section 2: The Groove Begins (4 bars)
// Bass and Drums start. The Pad continues.
// Bass_Walk_i is 2 bars, so it loops twice (Elastic Looping).
// Drum_Beat_Swing is 1 bar, so it loops four times.
// Pad_Dm7 is 1 bar, so it loops four times.
Bass_Walk_i, Drum_Beat_Swing, Pad_Dm7

// Section 3: The Full Arrangement (8 bars)
// FEATURE: Playlist Chaining (+)
// The Trumpet plays its Intro, then the Main theme.
// Bass and Pads change chords halfway through.
// Drums keep the steady beat.
Trumpet_Intro + Trumpet_Main, Bass_Walk_i + Bass_Walk_iv, Pad_Dm7 + Pad_Gm7, Drum_Beat_Swing
`
}
};
const HIDDEN_PRESETS: Record<string, { name: string, description: string, source: string }> = {
    "unatco_theme": {
        name: "UNATCO Theme (Tech Demo)",
        description: "A full conversion of the UNATCO theme from Deus Ex, imported from the original .umx tracker file.",
        source: `[CONFIG]
BPM: 83
Grid: 4
Time: 4/4
Scale: A# minor

[INSTRUMENTS]
de_bass_guitar_: de_bass_guitar(v:-7)
de_low_buzz_: de_low_buzz(v:-7)
de_low_string_: de_low_string(v:-7)
de_mid_string_: de_mid_string(v:-7)
de_ominous_: de_ominous(v:-12)
de_atmosphere_: de_atmosphere(v:-7)

[PATTERN: de_low_buzz__1]
de_low_buzz_   | 1#(v:-3)^[F70] - 1#(v:-9)^[F42] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 1#(v:-3)^[F70] 1#'(v:-9) 1#(v:-9)^[F42] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 1#(v:-3)^[F70] 1#'(v:-9) 1#(v:-9)^[F42] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 6#(v:-3)^[F70] 1#'(v:-9) 1#(v:-9)^[F42] 6#(v:-4)   - 6#(v:-9) 6#(v:-4) -   6#'(v:-4) - 6#(v:-4) 1b'(v:-4)   6#(v:-9) 1b(v:-4) 4#'(v:-4) 6'(v:-4) |
de_low_string_ | 1,,(v:-2)      - -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 7,,(v:-2)      -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 6,,(v:-2)      -         -              -          - -        -        -   -         - -        -           -        -        -         -        |

[PATTERN: de_bass_guitar__1]
de_bass_guitar_ | 1,(v:-1)        -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | -               -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | -               -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 6(v:-1)         -                -                -                 -                -               4(v:-1)          -                  -               -                7(v:-1)          -                 -                -               3(v:-1)          -          |
de_low_buzz_    | 1#(v:-3)^[F42]  -                1#(v:-9)^[F14]   1#(v:-4)          -                1#(v:-9)        1#(v:-4)         -                  1#'(v:-4)       -                1b(v:-4)         1b'(v:-4)         1b(v:-9)         1b(v:-4)        1b'(v:-4)        1#'(v:-4)        | 1#(v:-3)^[F42]  1#'(v:-9)        1#(v:-9)^[F14]   1#(v:-4)          -                1#(v:-9)        1#(v:-4)         -                  1#'(v:-4)       -                1b(v:-4)         1b'(v:-4)         1b(v:-9)         1b(v:-4)        1b'(v:-4)        1#'(v:-4)        | 1#(v:-3)^[F42]  1#'(v:-9)        1#(v:-9)^[F14]   1#(v:-4)          -                1#(v:-9)        1#(v:-4)         -                  1#'(v:-4)       -                1b(v:-4)         1b'(v:-4)         1b(v:-9)         1b(v:-4)        1b'(v:-4)        1#'(v:-4)        | 6#(v:-3)^[F42]  1#'(v:-9)        1#(v:-9)^[F14]   6#(v:-4)          -                6#(v:-9)        6#(v:-4)         -                  6#'(v:-4)       -                6#(v:-4)         1b'(v:-4)         6#(v:-9)         1b(v:-4)        4#'(v:-4)        6'(v:-4)   |
de_low_string_  | 1,,(v:-2)       -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | -               -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 7,,             -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 6,,             -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -          |
de_mid_string_  | 4(v:-21)        -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 6,(v:-21)       -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 3(v:-21)        -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -                | 1#,(v:-21)      -                -                -                 -                -               -                -                  -               -                -                -                 -                -               -                -          |
de_ominous_     | 4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14]   4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14] | 4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14]   4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14] | 4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14]   4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14] | 4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10)^[F14]   4#(v:-10)^[F14] 1#,(v:-10)^[F14] 6#,(v:-10)^[F14] 6,(v:-10)^[F14]   6#,(v:-10)^[F14] 6,(v:-10)^[F14] 6#,(v:-10)^[F14] 1#,(v:-10) |

[PATTERN: de_bass_guitar__2]
de_bass_guitar_ | 1,(v:-1)         -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |
de_low_buzz_    | 1#(v:-3)^[F42]   -          1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 1#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 1#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 6#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 6#(v:-4)      -          6#(v:-9)    6#(v:-4)   -            6#'(v:-4)  -          6#(v:-4)   1b'(v:-4)     6#(v:-9)   1b(v:-4)    4#'(v:-4)  6'(v:-4)   |
de_low_string_  | 1,,(v:-2)        -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | 1,(v:-2)       -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | 6,(v:-1)       -          -              -             -          -           -          -            -          -          -          -             -          7,          3          2,         |
de_ominous_     | 6#,(v:-13)^[F28] 4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) |
de_atmosphere_  | .                .          .              .             .          .           .          .            .          .          .          .             1b(v:-24)  -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |
de_mid_string_  | .                .          .              .             .          .           .          .            .          .          .          .             .          .           .          .          | .              .          .              .             .          .           .          .            .          .          .          .             .          .           .          .          | 4(v:-21)       -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |

[PATTERN: de_bass_guitar__3]
de_bass_guitar_ | 1,(v:-1)         -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |
de_low_buzz_    | 1#(v:-3)^[F42]   -          1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 1#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 1#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 1#(v:-4)      -          1#(v:-9)    1#(v:-4)   -            1#'(v:-4)  -          1b(v:-4)   1b'(v:-4)     1b(v:-9)   1b(v:-4)    1b'(v:-4)  1#'(v:-4)  | 6#(v:-3)^[F42] 1#'(v:-9)  1#(v:-9)^[F14] 6#(v:-4)      -          6#(v:-9)    6#(v:-4)   -            6#'(v:-4)  -          6#(v:-4)   1b'(v:-4)     6#(v:-9)   1b(v:-4)    4#'(v:-4)  6'(v:-4)   |
de_low_string_  | 1,,(v:-2)        -          -              1,(v:-6)      -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | 1,(v:-2)       -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | 6,(v:-1)       -          -              -             -          -           -          -            -          -          -          -             -          7,          3          2,         |
de_ominous_     | 6#,(v:-13)^[F28] 4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) | 6#,(v:-13)     4#,(v:-13) 3#,(v:-13)     1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13)   6#,(v:-13) 4#,(v:-13) 3#,(v:-13) 1#,,(v:-13)   3#,(v:-13) 1#,,(v:-13) 3#,(v:-13) 4#,(v:-13) |
de_atmosphere_  | .                .          .              .             .          .           .          .            .          .          .          .             1b(v:-24)  -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |
de_mid_string_  | .                .          .              .             .          .           .          .            .          .          .          .             .          .           .          .          | .              .          .              .             .          .           .          .            .          .          .          .             .          .           .          .          | 4(v:-21)       -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          | -              -          -              -             -          -           -          -            -          -          -          -             -          -           -          -          |

[PATTERN: de_bass_guitar__4]
de_bass_guitar_ | 1,              -                -                -                 -                -               -                -                  -               -                -                 -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -           -        -        -         -         | 6(v:-1)        -         -              -          - -        4(v:-1)  -   -         - 7(v:-1)  -           -        -        3(v:-1)   -         |
de_low_buzz_    | 1#(v:-4)^[F42]  -                1#(v:-9)^[F14]   1#(v:-4)          -                1#(v:-9)        1#(v:-4)         -                  3#'(v:-4)       -                1b(v:-4)          3'(v:-4)   1b(v:-9) 1b(v:-4) 1b(v:-4) 1#(v:-4) | 1#(v:-4)^[F42] 1#(v:-9) 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   3#'(v:-4) - 1b(v:-4) 3'(v:-4)   1b(v:-9) 1b(v:-4) 1b(v:-4) 1#(v:-4) | 1#(v:-3)^[F42] 1#(v:-9) 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 1#(v:-3)^[F42] 1#'(v:-9) 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) |
de_low_string_  | 1,,(v:-4)       -                -                -                 -                -               -                -                  -               -                -                 -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         |
de_mid_string_  | 4(v:-18)        -                -                -                 -                -               -                -                  3(v:-18)        -                -                 -          -        -        -        -        | 1,(v:-18)      -        -              -          - -        -        -   -         - -        -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         |
de_ominous_     | 4#(v:-10)^[F14] 1#,(v:-11)^[F14] 6#,(v:-12)^[F14] 6,(v:-13)^[F14]   6#,(v:-15)^[F14] 6,(v:-16)^[F14] 6#,(v:-18)^[F14] 1#,(v:-21)^[F14]   4#(v:-24)^[F14] 1#,(v:-30)^[F14] 6#,(v:-100)^[F14] -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -          -        -        -        -        | -              -        -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         |

[PATTERN: de_bass_guitar__5]
de_bass_guitar_ | 1,             - -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 6(v:-1)        -         -              -          - -        4(v:-1)  -   -         - 7(v:-1)  -           -        -        3(v:-1)   -        |
de_low_buzz_    | 1#(v:-3)^[F42] - 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 1#(v:-3)^[F42] 1#'(v:-9) 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 1#(v:-3)^[F42] 1#'(v:-9) 1#(v:-9)^[F14] 1#(v:-4)   - 1#(v:-9) 1#(v:-4) -   1#'(v:-4) - 1b(v:-4) 1b'(v:-4)   1b(v:-9) 1b(v:-4) 1b'(v:-4) 1#'(v:-4) | 6#(v:-3)^[F42] 1#'(v:-9) 1#(v:-9)^[F14] 6#(v:-4)   - 6#(v:-9) 6#(v:-4) -   6#'(v:-4) - 6#(v:-4) 1b'(v:-4)   6#(v:-9) 1b(v:-4) 4#'(v:-4) 6'(v:-4) |
de_low_string_  | 1,,(v:-2)      - -              -          - -        -        -   -         - -        -           -        -        -         -         | -              -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 7,,            -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 6,,            -         -              -          - -        -        -   -         - -        -           -        -        -         -        |
de_mid_string_  | 1,(v:-18)      - -              -          - -        -        -   -         - -        -           -        -        -         -         | 4(v:-18)       -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 5(v:-18)       -         -              -          - -        -        -   -         - -        -           -        -        -         -         | 4(v:-18)       -         -              -          - -        -        -   -         - -        -           -        -        -         -        |

[PLAYLIST]
de_low_buzz__1
de_low_buzz__1
de_bass_guitar__1
de_bass_guitar__1
de_bass_guitar__2
de_bass_guitar__3
de_bass_guitar__4
de_bass_guitar__5
de_bass_guitar__2
de_bass_guitar__3
de_bass_guitar__4
de_bass_guitar__5
`
    }
};

function PlaygroundContent() {
    const [track, setTrack] = useState<LigatureTrack | null>(null);
    const [selectedPreset, setSelectedPreset] = useState("neon");
    const searchParams = useSearchParams();

    useEffect(() => {
        const demoCode = searchParams.get('demo');

        if (demoCode && HIDDEN_PRESETS[demoCode]) {
            const p = HIDDEN_PRESETS[demoCode as keyof typeof HIDDEN_PRESETS];
            setTrack({ id: `demo_${demoCode}`, name: p.name, source: p.source });
            setSelectedPreset(demoCode);
        } else {
            loadPreset("neon");
        }
    }, [searchParams]);
    
    const loadPreset = (key: string) => {
        if (PRESETS[key]) {
            const p = PRESETS[key];
            setTrack({ id: `demo_${key}`, name: p.name, source: p.source });
            setSelectedPreset(key);
        }
    };

    const availableInstruments = DEFAULT_INSTRUMENT_LIST;
    const filteredInstruments = availableInstruments.filter(inst => inst.category !== 'Deus Ex');

    return (
        <div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#ccc' }}>
            <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: '#61afef', margin: '0 0 0.5rem 0', fontSize: '2rem', letterSpacing: '-1px' }}>
                        Ligature Playground
                    </h1>
                    <p style={{ color: '#888', margin: 0 }}>
                        A showcase of the ChronicleHub generative audio engine.
                    </p>
                </div>

                <div style={{ background: '#21252b', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flexShrink: 0, minWidth: '300px' }}>
                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#e5c07b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '1px' }}>
                                Select Demo Track
                            </label>
                            <select 
                                value={selectedPreset} 
                                onChange={(e) => loadPreset(e.target.value)}
                                style={{ width: '100%', background: '#181a1f', color: '#fff', border: '1px solid #61afef', padding: '0.75rem 1rem', borderRadius: '4px', cursor: 'pointer', outline: 'none', fontSize: '1rem', fontWeight: 'bold' }}
                            >
                                {Object.entries(PRESETS).map(([key, data]) => (
                                    <option key={key} value={key}>{data.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#61afef', fontSize: '1.2rem' }}>ℹ️</span>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
                                    About: {track?.name}
                                </h3>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#aaa', lineHeight: '1.6' }}>
                                {(PRESETS[selectedPreset] || HIDDEN_PRESETS[selectedPreset as keyof typeof HIDDEN_PRESETS])?.description}
                            </p>
                        </div>
                    </div>
                </div>

                {track ? (
                    <TrackEditor 
                        key={track.id} 
                        data={track}
                        onSave={(updatedData) => setTrack(updatedData as LigatureTrack)}
                        onDelete={() => {}}
                        availableInstruments={availableInstruments}
                        enableDownload={true}
                        isPlayground={true}
                        hideCategories={['Deus Ex']}
                    />
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                        Loading...
                    </div>
                )}
            </div>
        </div>
    );
}

// This is the Server Component shell that provides the Suspense boundary
export default function LigaturePlaygroundPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', background: '#181a1f', minHeight: '100vh', color: '#666', textAlign: 'center' }}>Loading Playground...</div>}>
            <PlaygroundContent />
        </Suspense>
    );
}