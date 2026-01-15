// src/engine/audio/scales.ts

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const MODES: Record<string, number[]> = {
    'Major':      [0, 2, 4, 5, 7, 9, 11],
    'Minor':      [0, 2, 3, 5, 7, 8, 10],
    'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
    'Melodic Minor':  [0, 2, 3, 5, 7, 9, 11],
    'Dorian':     [0, 2, 3, 5, 7, 9, 10],
    'Phrygian':   [0, 1, 3, 5, 7, 8, 10],
    'Lydian':     [0, 2, 4, 6, 7, 9, 11],
    'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'Locrian':    [0, 1, 3, 5, 6, 8, 10],
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
    const modeKey = isNatural ? 'Major' : Object.keys(MODES).find(k => k.toLowerCase() === modeName.toLowerCase()) || 'Major';
    
    const intervals = MODES[modeKey] || MODES['Major'];
    const scaleLength = intervals.length;

    const zeroIndexedDegree = numDegree - 1;
    const octaveWrapsFromDegree = Math.floor(zeroIndexedDegree / scaleLength);
    const scaleIndex = ((zeroIndexedDegree % scaleLength) + scaleLength) % scaleLength; 

    const intervalOffset = intervals[scaleIndex];
    
    const rootIndex = getRootIndex(rootName);
    const baseOctave = 4;

    const totalSemitones = 
        (baseOctave * 12) +                  
        rootIndex +                          
        intervalOffset +                     
        numAccidental +                      
        (numOctaveShift * 12) +              
        (octaveWrapsFromDegree * 12);        

    const finalOctave = Math.floor(totalSemitones / 12);
    const finalNoteIndex = ((totalSemitones % 12) + 12) % 12;
    
    const noteName = NOTES[finalNoteIndex];

    return `${noteName}${finalOctave}`;
}