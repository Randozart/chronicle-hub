// src/engine/audio/scales.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const MODES: Record<string, number[]> = {
    'Major':      [0, 2, 4, 5, 7, 9, 11],
    'Minor':      [0, 2, 3, 5, 7, 8, 10],
    'Dorian':     [0, 2, 3, 5, 7, 9, 10],
    'Phrygian':   [0, 1, 3, 5, 7, 8, 10],
    'Lydian':     [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian':    [0, 1, 3, 5, 6, 8, 10],
    'Chromatic':  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
};

export function getRootIndex(note: string): number {
    if (!note) return 0;
    const clean = note.toUpperCase()
        .replace('DB', 'C#').replace('EB', 'D#')
        .replace('GB', 'F#').replace('AB', 'G#').replace('BB', 'A#');
    
    const match = clean.match(/^([A-G]#?)/); 
    const noteOnly = match ? match[1] : 'C';
    
    const idx = NOTES.indexOf(noteOnly);
    return idx === -1 ? 0 : idx;
}

/**
 * The Core Physics: Converts Ligature Data -> Tone.js Frequency
 * This version is rewritten to be mathematically robust and prevent type coercion bugs.
 */
export function resolveNote(
    degree: number,
    rootName: string,
    modeName: string,
    octaveShift: number,
    accidental: number = 0,
    isNatural: boolean = false
): string {
    
    // --- START FINAL FIX ---

    // 1. Sanitize all inputs to ensure they are numbers, not strings.
    const numDegree = Number(degree) || 1;
    const numOctaveShift = Number(octaveShift) || 0;
    const numAccidental = Number(accidental) || 0;

    const modeKey = isNatural ? 'Major' : (modeName.charAt(0).toUpperCase() + modeName.slice(1).toLowerCase());
    const intervals = MODES[modeKey] || MODES['Major'];

    // 2. Normalize Degree and calculate octave wraps from it
    const zeroIndexedDegree = numDegree - 1;
    const octaveWrapsFromDegree = Math.floor(zeroIndexedDegree / 7);
    const scaleIndex = (zeroIndexedDegree % 7 + 7) % 7; // Safe modulo for negatives

    // 3. Get the semitone offset for the note within the scale
    const intervalOffset = intervals[scaleIndex];
    
    // 4. Calculate a single, absolute semitone value from C0
    // This avoids intermediate variables that can be mis-typed.
    const rootIndex = getRootIndex(rootName);
    const baseOctave = 4; // Our reference "middle C" octave

    const totalSemitones = 
        (baseOctave * 12) +                  // Start at middle C octave
        rootIndex +                          // Add root note offset (e.g., D is +2)
        intervalOffset +                     // Add scale interval (e.g., minor 3rd is +3)
        numAccidental +                      // Add sharp/flat modifier (+1 / -1)
        (numOctaveShift * 12) +              // Add octave shifts from ',' or "'"
        (octaveWrapsFromDegree * 12);        // Add octave shifts from degree (e.g., 8 is one octave up)

    // 5. Derive the final note name and octave from the absolute semitone value
    const finalOctave = Math.floor(totalSemitones / 12);
    const finalNoteIndex = totalSemitones % 12;
    const noteName = NOTES[finalNoteIndex];

    // --- END FINAL FIX ---

    return `${noteName}${finalOctave}`;
}