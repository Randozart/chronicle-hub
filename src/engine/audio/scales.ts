// src/engine/audio/scales.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MODES: Record<string, number[]> = {
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

    const modeKey = isNatural ? 'Major' : (modeName.charAt(0).toUpperCase() + modeName.slice(1).toLowerCase());
    const intervals = MODES[modeKey] || MODES['Major'];

    const zeroIndexedDegree = numDegree - 1;
    const octaveWrapsFromDegree = Math.floor(zeroIndexedDegree / 7);
    const scaleIndex = (zeroIndexedDegree % 7 + 7) % 7; 

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

    // REVERTED FIX: The calculation was correct originally.
    // 48 / 12 = 4 -> "C4".
    const finalOctave = Math.floor(totalSemitones / 12);
    const finalNoteIndex = ((totalSemitones % 12) + 12) % 12; // Safe modulo
    
    const noteName = NOTES[finalNoteIndex];

    return `${noteName}${finalOctave}`;
}