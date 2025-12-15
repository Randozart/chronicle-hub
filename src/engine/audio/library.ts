// src/engine/audio/library.ts

// A Snippet can be a single line (for DEFINITIONS) or a multi-line block (for PATTERNS)
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
    // --- CHORD DEFINITIONS ---
    "chords": {
        name: "Chord Definitions",
        snippets: [
            { name: "Major Triad", description: "Bright, happy (1-3-5).", code: "@Maj = [1, 3, 5]" },
            { name: "Minor Triad", description: "Sad, melancholic (1-3b-5).", code: "@min = [1, 3b, 5]" },
            { name: "Power Chord", description: "Rock/Folk (1-5).", code: "@5 = [1, 5]" },
            { name: "Major 7th", description: "Jazzy, sophisticated.", code: "@Maj7 = [1, 3, 5, 7]" },
            { name: "Minor 7th", description: "Soulful, moody.", code: "@min7 = [1, 3b, 5, 7b]" },
            { name: "Dominant 7th", description: "Tense, bluesy.", code: "@7 = [1, 3, 5, 7b]" },
        ]
    },

    // --- RHYTHMIC PATTERNS ---
    "rhythms": {
        name: "Rhythmic Patterns (4/4)",
        snippets: [
            { 
                name: "Four on the Floor", 
                description: "Basic dance/rock beat.", 
                code: `[PATTERN: Four_On_Floor]
Kick | 1 . . . 1 . . . 1 . . . 1 . . . |
Snare| . . . . 1 . . . . . . . 1 . . . |`
            },
            {
                name: "Waltz (3/4)",
                description: "Classic 3-beat feel. Set Time: 3/4.",
                code: `[PATTERN: Waltz]
Kick | 1 . . 1 . . 1 . . |
Snare| . . 1 . . . . . 1 . |`
            },
            {
                name: "Gallop",
                description: "Driving, syncopated rhythm.",
                code: `[PATTERN: Gallop]
Kick | 1 . (1 1) . . . (1 1) |`
            },
        ]
    },

    // --- PLAYLIST PROGRESSIONS ---
    "progressions": {
        name: "Playlist Progressions",
        snippets: [
            { 
                name: "Pop (I-V-vi-IV)", 
                description: "The most common progression in pop music.", 
                code: `// Assuming Scale: C Major
Verse_I
Verse_V
Verse_vi
Verse_IV`
            },
            {
                name: "Cinematic (i-VI-III-VII)",
                description: "Epic, emotional progression.",
                code: `// Assuming Scale: C Minor
Theme_i
Theme_VI
Theme_III
Theme_VII`
            },
            {
                name: "Blues (I-IV-V)",
                description: "12-bar blues structure.",
                code: `// The classic 12-bar blues
I_Chord
I_Chord
I_Chord
I_Chord
IV_Chord
IV_Chord
I_Chord
I_Chord
V_Chord
IV_Chord
I_Chord
V_Chord`
            }
        ]
    }
};