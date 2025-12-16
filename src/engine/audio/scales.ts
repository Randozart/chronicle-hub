// src/engine/audio/scales.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MODES: Record<string, number[]> = {
    // Standard Diatonic
    'Major':      [0, 2, 4, 5, 7, 9, 11],
    'Minor':      [0, 2, 3, 5, 7, 8, 10], // Natural Minor (Aeolian)
    
    // Classical / Jazz / VGM Variations
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11], // The "Vampire" Scale (Raised 7th)
    'Melodic Minor':  [0, 2, 3, 5, 7, 9, 11], // Jazz Minor (Raised 6th & 7th)
    
    // Church Modes
    'Dorian':     [0, 2, 3, 5, 7, 9, 10],
    'Phrygian':   [0, 1, 3, 5, 7, 8, 10], // The "Metal" Scale
    'Lydian':     [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian':    [0, 1, 3, 5, 6, 8, 10],
    
    // Other Useful Scales
    'Major Pentatonic': [0, 2, 4, 7, 9],
    'Minor Pentatonic': [0, 3, 5, 7, 10],
    'Blues':            [0, 3, 5, 6, 7, 10],
    'Whole Tone':       [0, 2, 4, 6, 8, 10],
    'Chromatic':        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
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
 */
export function resolveNote(
    degree: number,
    rootName: string,
    modeName: string,
    octaveShift: number,
    accidental: number = 0,
    isNatural: boolean = false
): string {
    
    const numDegree = Number(degree) || 1;
    const numOctaveShift = Number(octaveShift) || 0;
    const numAccidental = Number(accidental) || 0;

    // Normalizing mode name (e.g. "Harmonic Minor" -> "Harmonic Minor")
    // If isNatural is true, force Major/Chromatic behavior or standard intervals? 
    // Usually % implies "Natural Note" in standard notation, overriding accidentals. 
    // In Ligature, % implies "Major Scale Interval" regardless of current scale.
    const modeKey = isNatural ? 'Major' : Object.keys(MODES).find(k => k.toLowerCase() === modeName.toLowerCase()) || 'Major';
    
    const intervals = MODES[modeKey] || MODES['Major'];
    const scaleLength = intervals.length; // Critical: Support 5-note or 12-note scales

    const zeroIndexedDegree = numDegree - 1;
    
    // FIXED: Dynamic Octave Wrapping
    // If scale has 5 notes, degree 6 is index 0 of next octave.
    const octaveWrapsFromDegree = Math.floor(zeroIndexedDegree / scaleLength);
    const scaleIndex = ((zeroIndexedDegree % scaleLength) + scaleLength) % scaleLength; 

    const intervalOffset = intervals[scaleIndex];
    
    const rootIndex = getRootIndex(rootName);
    const baseOctave = 4; // C4 as center

    const totalSemitones = 
        (baseOctave * 12) +                  
        rootIndex +                          
        intervalOffset +                     
        numAccidental +                      
        (numOctaveShift * 12) +              
        (octaveWrapsFromDegree * 12);        

    const finalOctave = Math.floor(totalSemitones / 12);
    const finalNoteIndex = ((totalSemitones % 12) + 12) % 12; // Safe modulo
    
    const noteName = NOTES[finalNoteIndex];

    return `${noteName}${finalOctave}`;
}