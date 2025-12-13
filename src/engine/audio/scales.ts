// src/engine/audio/scales.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Interval offsets from Root (in semitones)
const MODES: Record<string, number[]> = {
    'Major':      [0, 2, 4, 5, 7, 9, 11], // Ionian
    'Minor':      [0, 2, 3, 5, 7, 8, 10], // Aeolian
    'Dorian':     [0, 2, 3, 5, 7, 9, 10],
    'Phrygian':   [0, 1, 3, 5, 7, 8, 10],
    'Lydian':     [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian':    [0, 1, 3, 5, 6, 8, 10],
    'Chromatic':  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

/**
 * Normalizes a note name to index (0-11). Handles flats (Db -> C#).
 */
export function getRootIndex(note: string): number {
    if (!note) return 0;
    const clean = note.toUpperCase()
        .replace('DB', 'C#').replace('EB', 'D#')
        .replace('GB', 'F#').replace('AB', 'G#').replace('BB', 'A#');
    
    // Extract note part "C#" from "C#4" if accidental included
    const match = clean.match(/^([A-G]#?)/); 
    const noteOnly = match ? match[1] : 'C';
    
    const idx = NOTES.indexOf(noteOnly);
    return idx === -1 ? 0 : idx;
}

/**
 * The Core Physics: Converts Ligature Data -> Tone.js Frequency
 */
export function resolveNote(
    degree: number,         // 1-based (from text)
    rootName: string,       // "D"
    modeName: string,       // "Dorian"
    octaveShift: number,    // +1 / -1
    accidental: number = 0, // +1 / -1
    isNatural: boolean = false
): string {
    
    // 1. Handle Natural Override (%)
    // If Natural, we ignore the Scale Mode and treat it as Chromatic/Major relative to C
    // But typically in Ligature % means "Natural relative to Root". 
    // Let's interpret % as: Force the interval to the major scale equivalent regardless of Mode.
    const modeKey = isNatural ? 'Major' : (modeName.charAt(0).toUpperCase() + modeName.slice(1).toLowerCase());
    const intervals = MODES[modeKey] || MODES['Major'];

    // 2. Normalize Degree (Handle wrapping: 8, 9, etc.)
    // Degrees are 1-based. 1 = index 0.
    const zeroIndex = degree - 1;
    const octaveWraps = Math.floor(zeroIndex / 7);
    const scaleIndex = zeroIndex % 7;

    // 3. Get Interval Semitones
    // Handle negative degrees safely if they occur
    const safeIndex = (scaleIndex + 7) % 7;
    const intervalOffset = intervals[safeIndex];

    // 4. Calculate Absolute Semitones
    const rootIdx = getRootIndex(rootName);
    const baseOctave = 4; 
    
    let semitones = rootIdx + intervalOffset + accidental;

    // 5. Resolve Final Octave
    // Add shifts from ' and , symbols
    // Add shifts from wrapping (e.g. 9th degree is +1 octave)
    // Add shifts from semitone overflow (e.g. B + 2 semitones = C next octave)
    let octaveRollover = Math.floor(semitones / 12);
    let finalOctave = baseOctave + octaveShift + octaveWraps + octaveRollover;

    // 6. Resolve Final Note Name
    const noteIdx = (semitones % 12 + 12) % 12; // Modulo that handles negatives
    const noteName = NOTES[noteIdx];

    return `${noteName}${finalOctave}`;
}