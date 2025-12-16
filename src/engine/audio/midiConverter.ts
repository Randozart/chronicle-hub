// src/engine/audio/midiConverter.ts

import { Midi } from '@tonejs/midi';
import { Note, Scale } from 'tonal';

interface ConversionOptions {
    grid?: number; 
    bpm?: number;
    scaleRoot?: string;
    scaleMode?: string;
}

// ... (detectKey and getNoteString remain the same as previous step) ...
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

function getNoteString(midi: number, scaleNotes: string[], root: string, octaveOffset: number): string {
    const noteName = Note.fromMidi(midi);
    const pc = Note.pitchClass(noteName);
    const octave = Note.octave(noteName) || 4;
    
    let noteStr = "";
    const degreeIndex = scaleNotes.indexOf(pc);

    if (degreeIndex > -1) {
        noteStr = String(degreeIndex + 1);
    } else {
        const midiNum = midi;
        for (let j = 1; j < 6; j++) {
            const lowerMidi = midiNum - j;
            const lowerPc = Note.pitchClass(Note.fromMidi(lowerMidi));
            const idx = scaleNotes.indexOf(lowerPc);
            if (idx > -1) {
                noteStr = `${idx + 1}${'#'.repeat(j)}`;
                break;
            }
        }
        if (!noteStr) noteStr = "1";
    }

    const diff = octave - 4; 
    if (diff > 0) noteStr += "'".repeat(diff);
    if (diff < 0) noteStr += ",".repeat(Math.abs(diff));

    return noteStr;
}

export function convertMidiToLigature(midi: Midi, options: ConversionOptions) {
    const warnings: string[] = [];
    
    // 1. CONFIGURATION
    const detectedBpm = Math.round(midi.header.tempos[0]?.bpm || 120);
    const bpm = options.bpm && options.bpm > 0 ? options.bpm : detectedBpm;
    const timeSig = midi.header.timeSignatures[0]?.timeSignature || [4, 4];

    let keySignature = `${options.scaleRoot} ${options.scaleMode}`;
    if (!options.scaleRoot || options.scaleRoot === 'auto') {
        const allNotes = midi.tracks.flatMap(t => t.notes.map(n => Note.pitchClass(n.name)));
        keySignature = detectKey(allNotes);
    }
    if (keySignature.includes('undefined')) keySignature = 'C major';
    const [scaleRoot, scaleMode] = keySignature.split(' ');
    
    const scale = Scale.get(`${scaleRoot} ${scaleMode.toLowerCase()}`);
    const scaleNotePcs = scale.notes;

    // 2. DETECT RESOLUTION (The "Mega Grid")
    let neededGrid = 4;
    let totalError = 0;
    let noteCount = 0;
    const testGrids = [4, 6, 8, 12, 16, 24]; 
    
    for (const testG of testGrids) {
        let missCount = 0;
        midi.tracks.forEach(t => t.notes.forEach(n => {
            const beatPos = n.time * (bpm / 60);
            const slot = beatPos * testG;
            const error = Math.abs(slot - Math.round(slot));
            if (error > 0.15) missCount++;
        }));
        if (missCount / Math.max(1, midi.tracks.reduce((a,b)=>a+b.notes.length,0)) < 0.1) {
            neededGrid = testG;
            break;
        }
        neededGrid = testG;
    }

    midi.tracks.forEach(t => t.notes.forEach(n => {
        const beatPos = n.time * (bpm / 60);
        const slot = beatPos * neededGrid;
        totalError += Math.abs(slot - Math.round(slot));
        noteCount++;
    }));
    const humanizeAmt = noteCount > 0 ? Math.min(100, Math.round((totalError / noteCount) * 200)) : 0;

    const slotsPerBeat = neededGrid;
    const slotsPerBar = slotsPerBeat * timeSig[0];

    // 3. BUILD SOURCE
    let source = `[CONFIG]
BPM: ${bpm}
Grid: ${slotsPerBeat}
Time: ${timeSig[0]}/${timeSig[1]}
Scale: ${scaleRoot} ${scaleMode.charAt(0).toUpperCase() + scaleMode.slice(1)}
Humanize: ${humanizeAmt}

[INSTRUMENTS]
`;

    const patternBlocks: string[] = [];
    const allLayerIds: string[] = [];

    // 4. PROCESS TRACKS
    midi.tracks.forEach((track, i) => {
        if (track.notes.length === 0) return;

        // Just one clean name per MIDI track now
        let baseName = (track.instrument.name || `Track_${i + 1}`).replace(/[^a-zA-Z0-9_]/g, '_');
        
        // Define the instrument ONCE
        source += `${baseName}: ${track.instrument.name ? 'standard_kit' : 'retro_lead'} // Detect or Default\n`;

        const totalDuration = Math.max(...track.notes.map(n => n.time + n.duration));
        const totalSlots = Math.ceil(totalDuration * (bpm / 60) * slotsPerBeat);
        const totalBars = Math.ceil(totalSlots / slotsPerBar);
        const finalSlotCount = totalBars * slotsPerBar;

        // Lane Logic is still needed to separate overlapping notes, 
        // but we visualize them as stacked rows, not separate instruments.
        const lanes: (string | null)[][] = [];

        track.notes.forEach(note => {
            const startSlot = Math.round(note.time * (bpm / 60) * slotsPerBeat);
            const durationSlots = Math.max(1, Math.round(note.duration * (bpm / 60) * slotsPerBeat));

            if (startSlot < finalSlotCount) {
                const noteStr = getNoteString(note.midi, scaleNotePcs, scaleRoot, 0);

                let placed = false;
                for (let l = 0; l < lanes.length; l++) {
                    let isFree = true;
                    for(let t = 0; t < durationSlots; t++) {
                        if (lanes[l][startSlot + t] !== undefined) { isFree = false; break; }
                    }
                    if (isFree) {
                        lanes[l][startSlot] = noteStr;
                        for (let s = 1; s < durationSlots; s++) {
                            if (startSlot + s < finalSlotCount) lanes[l][startSlot + s] = '-';
                        }
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    const newLane = new Array(finalSlotCount).fill(undefined);
                    newLane[startSlot] = noteStr;
                    for (let s = 1; s < durationSlots; s++) {
                        if (startSlot + s < finalSlotCount) newLane[startSlot + s] = '-';
                    }
                    lanes.push(newLane);
                }
            }
        });

        // --- PATTERN GENERATION ---
        const patternId = `${baseName}_Seq`;
        allLayerIds.push(patternId);

        let patternContent = `\n[PATTERN: ${patternId}]\n`;
        
        // Iterate lanes, but print them as stacked rows for the SAME track name
        lanes.forEach((laneData, laneIndex) => {
            
            // First lane gets the name, others get whitespace padding
            let prefix = laneIndex === 0 ? baseName : ""; 
            
            // Start the line
            let gridLine = `${prefix.padEnd(16)} |`;
            
            for (let b = 0; b < totalBars; b++) {
                const barStart = b * slotsPerBar;
                
                for (let beat = 0; beat < timeSig[0]; beat++) {
                    const beatStart = barStart + (beat * slotsPerBeat);
                    const beatData = laneData.slice(beatStart, beatStart + slotsPerBeat);
                    
                    const cleanBeat = beatData.map(x => x || '.');
                    
                    for(let k=0; k<slotsPerBeat; k++) {
                        const val = cleanBeat[k];
                        gridLine += ` ${val.padEnd(2)}`;
                    }
                    
                    gridLine += '  ';
                }
                
                gridLine += ' | ';
            }
            patternContent += gridLine + '\n';
        });
        patternBlocks.push(patternContent);
    });

    source += `\n${patternBlocks.join('\n')}`;
    source += `\n\n[PLAYLIST]\n${allLayerIds.join(', ')}\n`;

    return { 
        source, 
        warnings, 
        detected: { key: keySignature, bpm: detectedBpm } 
    };
}