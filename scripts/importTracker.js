// scripts/importTracker.js - Final Version with Robust File Matching and Global Volume

const fs = require('fs/promises');
const path = require('path');
const { Note, Scale } = require('tonal');

// --- CONSTANTS ---
const REFERENCE_C5_FREQ = 33452;
const C5_MIDI = Note.midi('C5');
const NOTE_OFF = '===';

// --- HELPER FUNCTIONS ---
function calculateBaseNote(c5freq) { if (c5freq <= 0) return 'C4'; const semitoneOffset = 12 * Math.log2(c5freq / REFERENCE_C5_FREQ); const baseMidiNote = Math.round(C5_MIDI + semitoneOffset); return Note.fromMidi(baseMidiNote); }
function parseTrackerNote(noteStr) { if (!noteStr || noteStr.startsWith('.') || noteStr.startsWith('^')) return null; if (noteStr === NOTE_OFF) return NOTE_OFF; const note = noteStr.substring(0, 2).replace('-', 'b'); const octave = noteStr.substring(2, 3); return `${note}${octave}`; }

function normalizeTrackerVolume(trackerVol, globalVolMultiplier) {
    if (trackerVol === null || isNaN(trackerVol) || trackerVol <= 0) return null;
    if (trackerVol >= 64) return Math.round(20 * Math.log10(globalVolMultiplier));
    const linearAmplitude = (trackerVol / 64.0) * globalVolMultiplier;
    const db = 20 * Math.log10(linearAmplitude);
    return Math.round(db);
}

function absoluteNoteToRelative(absoluteNote, scaleRoot, scaleMode) {
    const scale = Scale.get(`${scaleRoot} ${scaleMode.toLowerCase()}`);
    if (!scale || !scale.notes || scale.notes.length === 0) return { degree: 1, octaveShift: 0, accidental: 0 };
    const inputMidi = Note.midi(absoluteNote); if (inputMidi === null) return { degree: 1, octaveShift: 0, accidental: 0 };
    const inputPc = Note.pitchClass(absoluteNote); let bestMatch = { degree: 0, distance: 12, accidental: 0 };
    scale.notes.forEach((scalePc, index) => {
        const scaleMidi = Note.midi(scalePc + "4"); const inputPcMidi = Note.midi(inputPc + "4");
        let distance = inputPcMidi - scaleMidi; if (distance > 6) distance -= 12; if (distance < -6) distance += 12;
        if (Math.abs(distance) < Math.abs(bestMatch.distance)) { bestMatch.distance = Math.abs(distance); bestMatch.degree = index + 1; bestMatch.accidental = distance; }
    });
    const tonicMidi = Note.midi(scale.tonic + "4"); const degreeInScaleMidi = Note.midi(scale.notes[bestMatch.degree - 1] + "4");
    const interval = degreeInScaleMidi - tonicMidi; const finalOctaveShift = Math.floor((inputMidi - tonicMidi - interval + 6) / 12);
    return { degree: bestMatch.degree, octaveShift: finalOctaveShift, accidental: bestMatch.accidental };
}

function serializeRelativeNote(noteDef) { let out = `${noteDef.degree}`; if (noteDef.accidental > 0) out += '#'.repeat(noteDef.accidental); if (noteDef.accidental < 0) out += 'b'.repeat(-noteDef.accidental); if (noteDef.octaveShift > 0) out += "'".repeat(noteDef.octaveShift); if (noteDef.octaveShift < 0) out += ",".repeat(-noteDef.octaveShift); return out; }


// --- THE MAIN CONVERSION TOOL ---
async function convertTrackerDump(patternsPath, manifestPath, rawSamplesPath, outputPath, category, options) {
    console.log('🚀 Starting full tracker dump conversion...');
    
    // --- Part 1: Process Manifest with Global Volume ---
    console.log('\nPHASE 1: Generating Instrument Presets...');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const allDefinitions = [];
    const manifestMap = new Map();
    await fs.mkdir(outputPath, { recursive: true });
    const allRawFiles = await fs.readdir(rawSamplesPath);
    const manifestLines = manifestContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    // Use the global sample volume from the command, defaulting to max (128)
    const globalSampleVolume = parseInt(options['sample-volume'] || '255', 10);
    const globalVolMultiplier = globalSampleVolume / 255.0;
    const baseDb = Math.round(20 * Math.log10(globalVolMultiplier));
    console.log(`Global Sample Volume: ${globalSampleVolume}/255. Base dB level will be around ${baseDb}dB.`);

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
        
        // --- THIS IS THE ROBUST REGEX FIX ---
        const fileRegex = new RegExp(`(^|[^0-9])${sampleNumPadded}([^0-9]|$)`);
        const foundFileName = allRawFiles.find(f => fileRegex.test(f));
        // --- END FIX ---
        
        if (!foundFileName) {
            console.warn(`--> Warning: Could not find audio file for sample #${sampleNumPadded}. Skipping preset generation.`);
            continue;
        }

        const sourceSamplePath = path.join(rawSamplesPath, foundFileName);
        const fileExtension = path.extname(foundFileName);
        const outputFileName = `sample${fileExtension}`;
        const instrumentDir = path.join(outputPath, instrumentId);
        await fs.mkdir(instrumentDir, { recursive: true });
        const destSamplePath = path.join(instrumentDir, outputFileName);
        await fs.copyFile(sourceSamplePath, destSamplePath);
        
        const definition = {
            id: instrumentId,
            name: instrumentId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: category, type: 'sampler', mapping: 'diatonic',
            config: {
                baseUrl: `/sounds/tracker/${instrumentId}/`,
                urls: { [baseNote]: outputFileName },
                envelope: { attack: 0.01, release: releaseTime },
                volume: baseDb, // Apply global volume
            },
        };
        allDefinitions.push(`'${instrumentId}': ${JSON.stringify(definition, null, 4)}`);
    }
    console.log('✅ Instrument presets generated.');

    // --- Part 2 & 3 (Unchanged logic, but now using globalVolMultiplier) ---
    const patternsContent = await fs.readFile(patternsPath, 'utf-8');
    const patternLines = patternsContent.split('\n');
    const patternsData = {}; let orderList = []; let initialBpm = 125; let rowsPerPattern = 64; const allUsedInstruments = new Set();
    for (const line of patternLines) { if (line.startsWith('Orders:')) { orderList = line.substring('Orders:'.length).trim().split(',').map(o => o.trim()).filter(o => o !== '-' && o !== ''); } if (line.startsWith('Rows:')) { rowsPerPattern = parseInt(line.substring('Rows:'.length).trim()) || 64; } }
    let globalRowIndex = 0; for (const line of patternLines) { if (!line.startsWith('|')) continue; const patternOrderIndex = Math.floor(globalRowIndex / rowsPerPattern); const patternId = orderList[patternOrderIndex]; if (patternId === undefined) continue; if (!patternsData[patternId]) { patternsData[patternId] = { rows: [] }; } const channels = line.split('|').slice(1, -1); const rowEvents = []; channels.forEach((content) => { const noteStr = content.substring(0, 3); const instNum = content.substring(3, 5); const volStr = content.substring(5, 8); const instId = manifestMap.get(instNum); if (instId) allUsedInstruments.add(instId); rowEvents.push({ note: parseTrackerNote(noteStr), instrumentId: instId, volume: volStr.startsWith('v') ? parseInt(volStr.substring(1)) : null, }); }); patternsData[patternId].rows.push(rowEvents); globalRowIndex++; }
    
    const grid = parseInt(options.grid || '12', 10); const speed = parseInt(options.speed || '6', 10); const scaleRoot = "A"; const scaleMode = "minor";
    const slotsPerRow = grid / speed; let ligSource = `[CONFIG]\nBPM: ${initialBpm}\nGrid: ${grid}\nTime: 4/4\nScale: ${scaleRoot} ${scaleMode.charAt(0).toUpperCase() + scaleMode.slice(1)}\n\n[INSTRUMENTS]\n`;
    Array.from(allUsedInstruments).sort().forEach(id => { ligSource += `${id}: ${id}\n`; });
    const uniquePatternsInOrder = [...new Set(orderList)];
    for (const id of uniquePatternsInOrder) {
        if (!patternsData[id]) continue; ligSource += `\n[PATTERN: P${id}]\n`;
        const pat = patternsData[id]; const totalSlots = Math.ceil(pat.rows.length * slotsPerRow);
        Array.from(allUsedInstruments).sort().forEach(instId => {
            let slots = new Array(totalSlots).fill('.'); const noteEvents = [];
            for (let rIndex = 0; rIndex < pat.rows.length; rIndex++) { const event = pat.rows[rIndex].find(c => c && c.instrumentId === instId && c.note && c.note !== NOTE_OFF); if (event) { noteEvents.push({ ...event, row: rIndex }); } }
            noteEvents.forEach((currentEvent, i) => {
                const nextEvent = noteEvents[i + 1]; const endRow = nextEvent ? nextEvent.row : pat.rows.length;
                const relativeNoteDef = absoluteNoteToRelative(currentEvent.note, scaleRoot, scaleMode);
                let noteString = serializeRelativeNote(relativeNoteDef);
                const normalizedVolume = normalizeTrackerVolume(currentEvent.volume, globalVolMultiplier);
                if (normalizedVolume !== null) { noteString += `(v:${normalizedVolume})`; }
                const startSlot = Math.floor(currentEvent.row * slotsPerRow); const endSlot = Math.floor(endRow * slotsPerRow);
                const durationSlots = endSlot - startSlot;
                if (startSlot < slots.length) { slots[startSlot] = noteString; for (let s = 1; s < durationSlots; s++) { if (startSlot + s < slots.length) slots[startSlot + s] = '-'; } }
            });
            const lineContent = slots.join(' ');
            if (lineContent.replace(/[| .-]/g, '').trim().length > 0) {
                const slotsPerBar = grid * 4; let finalLine = `${instId.padEnd(20)} |`;
                for (let b = 0; b < Math.ceil(totalSlots / slotsPerBar); b++) { const barSlice = slots.slice(b * slotsPerBar, (b + 1) * slotsPerBar); if (barSlice.length > 0) { finalLine += ` ${barSlice.join(' ')} |`; } }
                ligSource += `${finalLine}\n`;
            }
        });
    }
    ligSource += `\n[PLAYLIST]\n`; orderList.forEach(pId => { ligSource += `P${pId}\n`; });
    const presetsOutputPath = path.join(outputPath, '_presets_output.ts'); const songOutputPath = path.join(outputPath, '_song_output.lig');
    await fs.writeFile(presetsOutputPath, allDefinitions.join(',\n\n')); await fs.writeFile(songOutputPath, ligSource);
    console.log(`\n✅ Done! \nPresets: ${presetsOutputPath}\nLigature: ${songOutputPath}`);
}

async function main() {
    // ... (Main function is unchanged) ...
    const args = process.argv.slice(2); const options = {}; const positionalArgs = []; for (const arg of args) { if (arg.startsWith('--')) { const [key, value] = arg.substring(2).split('='); options[key] = value; } else { positionalArgs.push(arg); } } const [command, patternsPath, manifestPath, rawSamplesPath, outputPath, category] = positionalArgs; if (command === 'convert-tracker-dump') { if (!patternsPath || !manifestPath || !rawSamplesPath || !outputPath || !category) { console.error('Usage...'); process.exit(1); } await convertTrackerDump(path.resolve(patternsPath), path.resolve(manifestPath), path.resolve(rawSamplesPath), path.resolve(outputPath), category, options); } else { console.log('Unknown command.'); }
}

main();