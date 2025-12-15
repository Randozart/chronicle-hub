// src/engine/audio/midiConverter.ts
import { Midi } from '@tonejs/midi';
import { Note, Scale } from 'tonal';

interface ConversionOptions {
    grid?: number;
    bpm?: number;
    scaleRoot?: string;
    scaleMode?: string;
}

function detectKey(notes: string[]): string {
    const uniqueNotes = Array.from(new Set(notes));
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let bestKey = 'C major';
    let maxMatches = -1;

    for (const root of roots) {
        ['major', 'minor'].forEach(mode => {
            const scaleName = `${root} ${mode}`;
            const scaleNotes = Scale.get(scaleName).notes;
            const matches = uniqueNotes.filter(n => scaleNotes.includes(n)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestKey = scaleName;
            }
        });
    }
    return bestKey;
}

export function convertMidiToLigature(midi: Midi, options: ConversionOptions) {
    const warnings: string[] = [];
    
    // --- 1. CONFIGURATION ---
    const detectedBpm = Math.round(midi.header.tempos[0]?.bpm || 120);
    const bpm = options.bpm && options.bpm > 0 ? options.bpm : detectedBpm;

    let keySignature = `${options.scaleRoot} ${options.scaleMode}`;
    if (!options.scaleRoot || options.scaleRoot === 'auto') {
        const allNotes = midi.tracks.flatMap(t => t.notes.map(n => Note.pitchClass(n.name)));
        keySignature = detectKey(allNotes);
    }
    if (keySignature.includes('undefined')) keySignature = 'C major';
    
    const [scaleRoot, scaleMode] = keySignature.split(' ');
    const scale = Scale.get(`${scaleRoot} ${scaleMode.toLowerCase()}`);
    if (scale.notes.length === 0) warnings.push(`Could not find scale for ${keySignature}.`);
    const scaleNotePcs = scale.notes;
    
    let useTriplets = false;
    midi.tracks.forEach(t => t.notes.forEach(n => {
        const sixteenths = n.time * (bpm / 60) * 4;
        if (Math.abs(sixteenths - Math.round(sixteenths)) > 0.1) useTriplets = true;
    }));
    const grid = options.grid || (useTriplets ? 12 : 4);
    
    const timeSig = midi.header.timeSignatures[0]?.timeSignature || [4, 4];
    const slotsPerBeat = grid;
    const slotsPerBar = slotsPerBeat * timeSig[0];

    // --- 2. GENERATE SOURCE ---
    let source = `[CONFIG]
BPM: ${bpm}
Grid: ${grid}
Time: ${timeSig[0]}/${timeSig[1]}
Scale: ${scaleRoot} ${scaleMode.charAt(0).toUpperCase() + scaleMode.slice(1)}

[INSTRUMENTS]
`;

    const patternBlocks: string[] = [];
    const allLayerIds: string[] = []; // Collects all generated track IDs for the playlist

    // --- 3. PROCESS TRACKS (Polyphonic Lane Splitting) ---
    midi.tracks.forEach((track, i) => {
        if (track.notes.length === 0) return;

        let baseName = (track.instrument.name || `Track_${i + 1}`).replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Calculate Dimensions
        const totalDuration = Math.max(...track.notes.map(n => n.time + n.duration));
        const totalSlots = Math.ceil(totalDuration * (bpm / 60) * slotsPerBeat);
        const totalBars = Math.ceil(totalSlots / slotsPerBar);
        const finalSlotCount = totalBars * slotsPerBar;

        // --- DYNAMIC LANES ---
        // lanes[0] = Main track, lanes[1] = Polyphony layer 1, etc.
        const lanes: string[][] = [];

        track.notes.forEach(note => {
            const startSlot = Math.round(note.time * (bpm / 60) * slotsPerBeat);
            const durationSlots = Math.max(1, Math.round(note.duration * (bpm / 60) * slotsPerBeat));

            if (startSlot < finalSlotCount) {
                // Convert Note
                const notePc = Note.pitchClass(note.name);
                const octave = Note.octave(note.name) || 4;
                const degreeIndex = scaleNotePcs.indexOf(notePc);
                let noteStr = ".";
                
                if (degreeIndex > -1) {
                    noteStr = String(degreeIndex + 1);
                } else {
                    const midiNum = Note.midi(note.name) as number;
                    let bestDegree = 1;
                    let minDist = 12;
                    scaleNotePcs.forEach((pc, idx) => {
                        const scaleMidi = Note.midi(`${pc}${octave}`);
                        if(scaleMidi) {
                            const dist = midiNum - scaleMidi;
                            if (Math.abs(dist) < Math.abs(minDist)) {
                                minDist = dist;
                                bestDegree = idx + 1;
                            }
                        }
                    });
                    noteStr = String(bestDegree);
                    if (minDist > 0) noteStr += '#'.repeat(minDist);
                    if (minDist < 0) noteStr += 'b'.repeat(Math.abs(minDist));
                }

                const octaveDiff = octave - 4;
                if (octaveDiff > 0) noteStr += "'".repeat(octaveDiff);
                if (octaveDiff < 0) noteStr += ",".repeat(Math.abs(octaveDiff));

                // --- FIND A LANE ---
                // Look for the first lane that is EMPTY at this start slot
                let placed = false;
                for (let l = 0; l < lanes.length; l++) {
                    // Check if this lane is free for the duration of the note
                    let isFree = true;
                    for(let t = 0; t < durationSlots; t++) {
                        if (lanes[l][startSlot + t] !== undefined) {
                            isFree = false; 
                            break;
                        }
                    }
                    
                    if (isFree) {
                        lanes[l][startSlot] = noteStr;
                        // Fill sustain
                        for (let s = 1; s < durationSlots; s++) {
                            if (startSlot + s < finalSlotCount) lanes[l][startSlot + s] = '-';
                        }
                        placed = true;
                        break;
                    }
                }

                // If no lane was free, create a new one
                if (!placed) {
                    const newLane = new Array(finalSlotCount).fill(undefined); // undefined means "empty"
                    newLane[startSlot] = noteStr;
                    for (let s = 1; s < durationSlots; s++) {
                        if (startSlot + s < finalSlotCount) newLane[startSlot + s] = '-';
                    }
                    lanes.push(newLane);
                }
            }
        });

        // --- GENERATE OUTPUT FOR EACH LANE ---
        lanes.forEach((laneData, laneIndex) => {
            const suffix = laneIndex === 0 ? "" : `_L${laneIndex}`;
            const trackName = `${baseName}${suffix}`;
            
            // Register instrument (all layers map to same base sound)
            source += `${trackName}: ${baseName.toLowerCase()}\n`;
            
            const patternId = `${trackName}_Seq`;
            allLayerIds.push(patternId);

            let patternContent = `\n[PATTERN: ${patternId}]\n`;
            let gridLine = `${trackName.padEnd(16)} |`;
            
            let currentGridLine = `${trackName.padEnd(16)} |`; 

            for (let i = 0; i < finalSlotCount; i++) {
                // Bar Line (Start of new bar)
                if (i > 0 && i % slotsPerBar === 0) {
                    currentGridLine += ' | '; 
                }
                // Beat Space
                else if (i > 0 && i % slotsPerBeat === 0) {
                    currentGridLine += '  ';
                }

                // Note
                currentGridLine += ` ${(laneData[i] || '.').padEnd(2)}`;
            }

            // End of track pipe
            currentGridLine += ' |'; 
            
            patternContent += currentGridLine;
            patternBlocks.push(patternContent);
        });
    });

    source += `\n${patternBlocks.join('\n')}`;

    source += `\n\n[PLAYLIST]\n`;
    source += allLayerIds.join(', ');

    return { 
        source, 
        warnings, 
        detected: { key: keySignature, bpm: detectedBpm } 
    };
}