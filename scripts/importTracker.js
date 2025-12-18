// scripts/importTracker.js - Final Version
// Run: node scripts/importTracker.js convert-tracker-dump ./patterns.txt ./manifest.txt ./raw_samples ./output_dir "Category" --scale="C Minor"

const fs = require('fs/promises');
const path = require('path');
const { Note, Scale } = require('tonal');

// --- CONSTANTS ---
const REFERENCE_C5_FREQ = 33452;
const C5_MIDI = Note.midi('C5');
const NOTE_OFF = '===';
const DEFAULT_TICKS_PER_ROW = 6;

// --- HELPER FUNCTIONS ---

function calculateBaseNote(c5freq) {
    if (c5freq <= 0) return 'C4';
    const semitoneOffset = 12 * Math.log2(c5freq / REFERENCE_C5_FREQ);
    const baseMidiNote = Math.round(C5_MIDI + semitoneOffset);
    return Note.fromMidi(baseMidiNote);
}

function parseTrackerNote(noteStr) {
    if (!noteStr || noteStr.startsWith('.') || noteStr.startsWith('^')) return null;
    if (noteStr === NOTE_OFF) return NOTE_OFF;
    const note = noteStr.substring(0, 2).replace('-', 'b');
    const octave = noteStr.substring(2, 3);
    return `${note}${octave}`;
}

function normalizeTrackerVolume(trackerVol, globalVolMultiplier) {
    if (trackerVol === null || isNaN(trackerVol) || trackerVol <= 0) return null;
    if (trackerVol >= 64) return Math.round(20 * Math.log10(globalVolMultiplier));
    
    // Scale 0-64 to linear amplitude then to dB
    const linearAmplitude = (trackerVol / 64.0) * globalVolMultiplier;
    // Logarithmic falloff
    const db = 20 * Math.log10(linearAmplitude);
    return Math.round(db);
}

function absoluteNoteToRelative(absoluteNote, scaleRoot, scaleMode) {
    const scaleName = `${scaleRoot} ${scaleMode.toLowerCase()}`;
    const scale = Scale.get(scaleName);
    
    if (!scale || !scale.notes || scale.notes.length === 0) return { degree: 1, octaveShift: 0, accidental: 0 };
    
    const inputMidi = Note.midi(absoluteNote); 
    if (inputMidi === null) return { degree: 1, octaveShift: 0, accidental: 0 };
    
    const inputPc = Note.pitchClass(absoluteNote); 
    let bestMatch = { degree: 0, distance: 12, accidental: 0 };
    
    scale.notes.forEach((scalePc, index) => {
        const scaleMidi = Note.midi(scalePc + "4"); 
        const inputPcMidi = Note.midi(inputPc + "4");
        
        let distance = inputPcMidi - scaleMidi; 
        if (distance > 6) distance -= 12; 
        if (distance < -6) distance += 12;
        
        if (Math.abs(distance) < Math.abs(bestMatch.distance)) { 
            bestMatch.distance = Math.abs(distance); 
            bestMatch.degree = index + 1; 
            bestMatch.accidental = distance; 
        }
    });
    
    const tonicMidi = Note.midi(scale.tonic + "4"); 
    const degreeInScaleMidi = Note.midi(scale.notes[bestMatch.degree - 1] + "4");
    
    // Calculate octave shift relative to how the scale wraps
    // Simply: (TargetMIDI - (TonicMIDI + Interval)) / 12
    const interval = degreeInScaleMidi - tonicMidi; 
    const finalOctaveShift = Math.floor((inputMidi - tonicMidi - interval + 6) / 12);
    
    return { degree: bestMatch.degree, octaveShift: finalOctaveShift, accidental: bestMatch.accidental };
}

function serializeRelativeNote(noteDef) { 
    let out = `${noteDef.degree}`; 
    if (noteDef.accidental > 0) out += '#'.repeat(noteDef.accidental); 
    if (noteDef.accidental < 0) out += 'b'.repeat(-noteDef.accidental); 
    if (noteDef.octaveShift > 0) out += "'".repeat(noteDef.octaveShift); 
    if (noteDef.octaveShift < 0) out += ",".repeat(-noteDef.octaveShift); 
    return out; 
}

/**
 * Calculates a Ligature effect string based on tracker command.
 * Assuming standard 64 volume range.
 */
function translateEffect(effCmd, durationRows) {
    if (!effCmd || effCmd.length < 3) return null;
    
    const cmd = effCmd.charAt(0).toUpperCase();
    const valHex = effCmd.substring(1);
    const value = parseInt(valHex, 16);
    if (isNaN(value)) return null;

    // Separate x and y (nibbles)
    const x = (value & 0xF0) >> 4;
    const y = (value & 0x0F);
    
    // speed in tracker ticks (default 6)
    const ticksPerRow = DEFAULT_TICKS_PER_ROW; 
    
    // Tracker 'Dxy' or 'Cxy' logic:
    // If x is non-zero, slide up/down by x. If y is non-zero, slide by y.
    // Usually only one is active per row in standard MOD/XM unless fine slides.
    // Simplifying: take the larger nibble as the slide amount per tick.
    const slidePerTick = Math.max(x, y);
    
    // Total drop over the duration of the note (in tracker units 0-64)
    const totalChange = slidePerTick * ticksPerRow * durationRows;
    
    // Convert 0-64 tracker volume to rough dB or % for Ligature
    // Ligature Fxx is "Fade by xx". Let's map 64 units to 100 (full fade).
    const scaledVal = Math.min(100, Math.round((totalChange / 64) * 100));
    
    if (scaledVal <= 0) return null;

    // D = Volume Slide Down (Fade)
    if (cmd === 'D') {
        return `^[F${scaledVal}]`;
    }
    // C = Volume Slide Up (Swell) - Note: In some trackers 'A' is vol slide, but following prompt specs 'C'
    if (cmd === 'C') {
        return `^[S${scaledVal}]`;
    }
    
    return null;
}

// --- THE MAIN CONVERSION TOOL ---
async function convertTrackerDump(patternsPath, manifestPath, rawSamplesPath, outputPath, category, options) {
    console.log('🚀 Starting full tracker dump conversion...');
    
    const scaleArg = options.scale || "C Major";
    const [scaleRoot, ...scaleModeParts] = scaleArg.split(' ');
    const scaleMode = scaleModeParts.join(' ') || "Major";
    console.log(`Musical Key: ${scaleRoot} ${scaleMode}`);

    // --- Part 1: Process Manifest ---
    console.log('\nPHASE 1: Generating Instrument Presets...');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const allDefinitions = [];
    const manifestMap = new Map();
    await fs.mkdir(outputPath, { recursive: true });
    const allRawFiles = await fs.readdir(rawSamplesPath);
    const manifestLines = manifestContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    const globalSampleVolume = parseInt(options['sample-volume'] || '255', 10);
    const globalVolMultiplier = globalSampleVolume / 255.0;
    const baseDb = Math.round(20 * Math.log10(globalVolMultiplier));
    
    for (const line of manifestLines) {
        const parts = line.split('\t'); if (parts.length < 3) continue;
        const [numStr, c5FreqStr, instrumentId] = parts.map(p => p.trim());
        const sampleNum = parseInt(numStr, 10); const c5Freq = parseInt(c5FreqStr, 10);
        if (isNaN(sampleNum) || isNaN(c5Freq)) continue;
        manifestMap.set(String(sampleNum).padStart(2, '0'), instrumentId);
        
        const isPercussive = instrumentId.includes('kick') || instrumentId.includes('snare') || instrumentId.includes('hat') || instrumentId.includes('perc');
        const releaseTime = isPercussive ? 0.5 : 2.0;
        
        const baseNote = calculateBaseNote(c5Freq);
        const sampleNumPadded = String(sampleNum).padStart(2, '0');
        
        // Match sample file (e.g. 01.wav, sample_01.wav)
        const fileRegex = new RegExp(`(^|[^0-9])${sampleNumPadded}([^0-9]|$)`);
        const foundFileName = allRawFiles.find(f => fileRegex.test(f));
        
        if (!foundFileName) {
            console.warn(`--> Warning: Could not find audio file for sample #${sampleNumPadded}. Skipping preset.`);
            continue;
        }
        
        const sourceSamplePath = path.join(rawSamplesPath, foundFileName);
        const outputFileName = `sample${path.extname(foundFileName)}`;
        const instrumentDir = path.join(outputPath, instrumentId);
        await fs.mkdir(instrumentDir, { recursive: true });
        await fs.copyFile(sourceSamplePath, path.join(instrumentDir, outputFileName));
        
        // Add loop property to preset if it's not percussive
        const loopConfig = isPercussive ? undefined : { enabled: true };

        const definition = {
            id: instrumentId,
            name: instrumentId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: category, type: 'sampler', mapping: 'diatonic',
            config: {
                baseUrl: `/sounds/tracker/${instrumentId}/`,
                urls: { [baseNote]: outputFileName },
                envelope: { attack: 0.01, release: releaseTime },
                volume: baseDb,
                loop: loopConfig // New Loop Property
            },
        };
        allDefinitions.push(`'${instrumentId}': ${JSON.stringify(definition, null, 4)}`);
    }
    
    // --- Part 2: Process Patterns ---
    console.log('\nPHASE 2: Parsing Patterns & Effects...');
    const patternsContent = await fs.readFile(patternsPath, 'utf-8');
    const patternLines = patternsContent.split('\n');
    
    const patternsData = {}; 
    let orderList = []; 
    let initialBpm = 125; 
    let rowsPerPattern = 64; 
    const allUsedInstruments = new Set();
    
    // Parse Headers
    for (const line of patternLines) { 
        if (line.startsWith('Orders:')) { 
            orderList = line.substring('Orders:'.length).trim().split(',').map(o => o.trim()).filter(o => o !== '-' && o !== ''); 
        } 
        if (line.startsWith('Rows:')) { 
            rowsPerPattern = parseInt(line.substring('Rows:'.length).trim()) || 64; 
        } 
    }

    // Parse Grid
    let globalRowIndex = 0; 
    for (const line of patternLines) { 
        if (!line.startsWith('|')) continue; 
        
        // Calculate which unique Pattern ID this row belongs to based on the Order List
        const patternOrderIndex = Math.floor(globalRowIndex / rowsPerPattern); 
        const patternId = orderList[patternOrderIndex]; 
        
        if (patternId === undefined) continue; 
        
        // Initialize Pattern Storage only if it doesn't exist
        // This effectively ignores duplicates in the linear dump
        if (!patternsData[patternId]) { 
            patternsData[patternId] = { rows: [] }; 
        } else if (patternsData[patternId].rows.length >= rowsPerPattern) {
            // If we've already filled this pattern from a previous order occurrence, skip
            globalRowIndex++;
            continue;
        }

        // Standard Tracker Channel Width: | Note Inst Vol Eff |
        // Example: |C-5 01 v64 ...| 
        // We split by pipe.
        const channels = line.split('|').slice(1, -1); 
        const rowEvents = []; 
        
        channels.forEach((content) => { 
            // Parsing fixed width logic
            const noteStr = content.substring(0, 3);
            const instNum = content.substring(3, 5);
            const volStr = content.substring(5, 8);
            const effStr = content.substring(8, 11); // Effect Column usually here

            const instId = manifestMap.get(instNum); 
            if (instId) allUsedInstruments.add(instId); 
            
            rowEvents.push({ 
                note: parseTrackerNote(noteStr), 
                instrumentId: instId, 
                volume: volStr.startsWith('v') ? parseInt(volStr.substring(1)) : null,
                effect: effStr.trim()
            }); 
        }); 
        
        patternsData[patternId].rows.push(rowEvents); 
        globalRowIndex++; 
    }
    
    // --- Part 3: Generate Ligature Source ---
    console.log('\nPHASE 3: Generating Ligature Source...');
    const grid = parseInt(options.grid || '12', 10); 
    const speed = parseInt(options.speed || '6', 10); // Ticks per row
    const slotsPerRow = grid / speed; 
    
    let ligSource = `[CONFIG]\nBPM: ${initialBpm}\nGrid: ${grid}\nTime: 4/4\nScale: ${scaleRoot} ${scaleMode}\n\n[INSTRUMENTS]\n`;
    Array.from(allUsedInstruments).sort().forEach(id => { ligSource += `${id}: ${id}\n`; });
    
    // Generate Unique Patterns
    // Get unique IDs from patternsData
    const uniqueIds = Object.keys(patternsData).sort();

    for (const id of uniqueIds) {
        ligSource += `\n[PATTERN: P${id}]\n`;
        const pat = patternsData[id]; 
        const totalSlots = Math.ceil(pat.rows.length * slotsPerRow);
        
        Array.from(allUsedInstruments).sort().forEach(instId => {
            let slots = new Array(totalSlots).fill('.'); 
            const noteEvents = [];
            
            // Collect events for this instrument
            for (let rIndex = 0; rIndex < pat.rows.length; rIndex++) { 
                const event = pat.rows[rIndex].find(c => c && c.instrumentId === instId && c.note); 
                if (event) { 
                    if (event.note === NOTE_OFF) {
                        noteEvents.push({ type: 'off', row: rIndex });
                    } else {
                        noteEvents.push({ type: 'on', ...event, row: rIndex }); 
                    }
                } 
            }
            
            // Render events to slots
            for (let i = 0; i < noteEvents.length; i++) {
                const evt = noteEvents[i];
                if (evt.type === 'off') continue; // Handled by duration of previous 'on'

                const nextEvt = noteEvents[i+1];
                let endRow = nextEvt ? nextEvt.row : pat.rows.length;
                
                // Calculate duration in tracker rows
                const durationRows = endRow - evt.row;
                
                // --- Effect Translation ---
                const effectString = translateEffect(evt.effect, durationRows);
                // --------------------------

                const relativeNoteDef = absoluteNoteToRelative(evt.note, scaleRoot, scaleMode);
                let noteString = serializeRelativeNote(relativeNoteDef);
                
                const normalizedVolume = normalizeTrackerVolume(evt.volume, globalVolMultiplier);
                if (normalizedVolume !== null) { noteString += `(v:${normalizedVolume})`; }
                
                // Inject Effect
                if (effectString) { noteString += effectString; }

                const startSlot = Math.floor(evt.row * slotsPerRow); 
                const endSlot = Math.floor(endRow * slotsPerRow);
                const durationSlots = endSlot - startSlot;
                
                if (startSlot < slots.length) { 
                    slots[startSlot] = noteString; 
                    for (let s = 1; s < durationSlots; s++) { 
                        if (startSlot + s < slots.length) slots[startSlot + s] = '-'; 
                    } 
                }
            }
            
            const lineContent = slots.join(' ');
            if (lineContent.replace(/[| .-]/g, '').trim().length > 0) {
                const slotsPerBar = grid * 4; 
                let finalLine = `${instId.padEnd(20)} |`;
                for (let b = 0; b < Math.ceil(totalSlots / slotsPerBar); b++) { 
                    const barSlice = slots.slice(b * slotsPerBar, (b + 1) * slotsPerBar); 
                    if (barSlice.length > 0) { finalLine += ` ${barSlice.join(' ')} |`; } 
                } 
                ligSource += `${finalLine}\n`;
            }
        });
    }
    
    // Generate Playlist from Order List
    ligSource += `\n[PLAYLIST]\n`; 
    // Join standard Pxx IDs with newlines
    orderList.forEach(pId => { ligSource += `P${pId}\n`; });
    
    const presetsOutputPath = path.join(outputPath, '_presets_output.ts'); 
    const songOutputPath = path.join(outputPath, '_song_output.lig');
    
    await fs.writeFile(presetsOutputPath, allDefinitions.join(',\n\n')); 
    await fs.writeFile(songOutputPath, ligSource);
    
    console.log(`\n✅ Done! \nPresets: ${presetsOutputPath}\nLigature: ${songOutputPath}`);
}

async function main() {
    const args = process.argv.slice(2);
    const options = {};
    const positionalArgs = [];
    
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            options[key] = value || true;
        } else {
            positionalArgs.push(arg);
        }
    }
    
    const [command, patternsPath, manifestPath, rawSamplesPath, outputPath, category] = positionalArgs;
    
    if (command === 'convert-tracker-dump') {
        if (!patternsPath || !manifestPath || !rawSamplesPath || !outputPath || !category) {
            console.error('Usage: node importTracker.js convert-tracker-dump <patterns> <manifest> <samples> <out> <category> [--scale="C Minor"]');
            process.exit(1);
        }
        await convertTrackerDump(
            path.resolve(patternsPath), 
            path.resolve(manifestPath), 
            path.resolve(rawSamplesPath), 
            path.resolve(outputPath), 
            category, 
            options
        );
    } else {
        console.log('Unknown command.');
    }
}

main();