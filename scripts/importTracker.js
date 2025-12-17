// scripts/importTracker.js - Final Version with Correct Continuous Parser

const fs = require('fs/promises');
const path = require('path');
const { Note } = require('tonal');

// --- CONSTANTS ---
const REFERENCE_C5_FREQ = 33452;
const C5_MIDI = Note.midi('C5');
const NOTE_OFF = '===';

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

async function convertTrackerDump(patternsPath, manifestPath, rawSamplesPath, outputPath, category, options) {
    console.log('🚀 Starting full tracker dump conversion...');
    
    // --- Part 1: Process Manifest and Generate Presets ---
    console.log('\nPHASE 1: Generating Instrument Presets...');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const allDefinitions = [];
    const manifestMap = new Map();
    const allRawFiles = await fs.readdir(rawSamplesPath);
    await fs.mkdir(outputPath, { recursive: true });
    const manifestLines = manifestContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    for (const line of manifestLines) {
        const parts = line.split('\t');
        if (parts.length < 3) continue;
        const [numStr, c5FreqStr, instrumentId] = parts.map(p => p.trim());
        const sampleNum = parseInt(numStr, 10);
        const c5Freq = parseInt(c5FreqStr, 10);
        if (isNaN(sampleNum) || isNaN(c5Freq)) continue;
        manifestMap.set(String(sampleNum).padStart(2, '0'), instrumentId);
        const baseNote = calculateBaseNote(c5Freq);
        const sampleNumPadded = String(sampleNum).padStart(2, '0');
        const fileRegex = new RegExp(`- ${sampleNumPadded}[\\s.-]`);
        const foundFileName = allRawFiles.find(f => fileRegex.test(f));
        if (!foundFileName) continue;
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
            category: category,
            type: 'sampler',
            mapping: 'chromatic',
            config: {
                baseUrl: `/sounds/tracker/${instrumentId}/`,
                urls: {
                    [baseNote]: outputFileName
                },
                envelope: {
                    attack: 0.01,
                    release: 0.5
                },
                volume: -6,
            },
        };
        allDefinitions.push(`'${instrumentId}': ${JSON.stringify(definition, null, 4)}`);
    }
    console.log('✅ Instrument presets generated.');

    // --- Part 2: Parse Full Song Structure ---
    console.log('\nPHASE 2: Generating Ligature Score...');
    const patternsContent = await fs.readFile(patternsPath, 'utf-8');
    const patternLines = patternsContent.split('\n');
    
    const patternsData = {}; // { "0": { rows: [ [events...], [events...], ... ] }, "1": ... }
    let orderList = [];
    let initialBpm = options.bpm || 125;
    let rowsPerPattern = 64; // Default for most trackers
    const allUsedInstruments = new Set();

    // First Pass: Get metadata
    for (const line of patternLines) {
        if (line.startsWith('Orders:')) {
            orderList = line.substring('Orders:'.length).trim().split(',').map(o => o.trim()).filter(o => o !== '-' && o !== '');
        }
        if (line.startsWith('Rows:')) {
            rowsPerPattern = parseInt(line.substring('Rows:'.length).trim()) || 64;
        }
    }

    // Second Pass: Parse the continuous stream of row data
    let globalRowIndex = 0;
    for (const line of patternLines) {
        if (!line.startsWith('|')) continue;
        
        const patternOrderIndex = Math.floor(globalRowIndex / rowsPerPattern);
        const patternId = orderList[patternOrderIndex];
        
        if (patternId === undefined) continue; // Past the end of the song data

        if (!patternsData[patternId]) {
            patternsData[patternId] = { rows: [] };
        }
        
        const channels = line.split('|').slice(1, -1);
        const rowEvents = [];
        channels.forEach((content) => {
            const noteStr = content.substring(0, 3);
            const instNum = content.substring(3, 5);
            const volStr = content.substring(5, 8);
            
            const instId = manifestMap.get(instNum);
            if (instId) allUsedInstruments.add(instId);

            rowEvents.push({
                note: parseTrackerNote(noteStr),
                instrumentId: instId,
                volume: volStr.startsWith('v') ? parseInt(volStr.substring(1)) : null,
            });
        });
        patternsData[patternId].rows.push(rowEvents);
        globalRowIndex++;
    }
    
    // --- Part 3: Assemble .lig ---
    const grid = parseInt(options.grid || '12', 10);
    const slotsPerRow = Math.max(1, grid / (rowsPerPattern / 8)); // A guess, typically 8 rows per beat
    let ligSource = `[CONFIG]\nBPM: ${initialBpm}\nGrid: ${grid}\nTime: 4/4\nScale: C Minor\n\n[INSTRUMENTS]\n`;
    Array.from(allUsedInstruments).sort().forEach(id => { ligSource += `${id}: ${id}\n`; });
    
    const uniquePatternsInOrder = [...new Set(orderList)];

    for (const id of uniquePatternsInOrder) {
        if (!patternsData[id]) continue;
        ligSource += `\n[PATTERN: P${id}]\n`;
        const pat = patternsData[id];
        const totalSlots = pat.rows.length * slotsPerRow;

        Array.from(allUsedInstruments).sort().forEach(instId => {
            let slots = new Array(totalSlots).fill('.');
            pat.rows.forEach((channels, rIndex) => {
                const event = channels.find(c => c && c.instrumentId === instId);
                if (event && event.note && event.note !== NOTE_OFF) {
                    let nStr = event.note;
                    if (event.volume !== null && !isNaN(event.volume)) nStr += `(v:${event.volume})`;
                    
                    const startSlot = Math.floor(rIndex * slotsPerRow);
                    if (startSlot < slots.length) {
                        slots[startSlot] = nStr;
                        for (let i = 1; i < slotsPerRow; i++) {
                            if (startSlot + i < slots.length) slots[startSlot + i] = '-';
                        }
                    }
                }
            });
            const lineContent = slots.join(' ');
            if (lineContent.replace(/[.-]/g, '').trim().length > 0) { // Only add non-empty lines
                ligSource += `${instId.padEnd(20)} | ${lineContent} |\n`;
            }
        });
    }
    
    ligSource += `\n[PLAYLIST]\n`;
    orderList.forEach(pId => { ligSource += `P${pId}\n`; });

    console.log('✅ Ligature score generated.');

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
            options[key] = value;
        } else {
            positionalArgs.push(arg);
        }
    }
    const [command, patternsPath, manifestPath, rawSamplesPath, outputPath, category] = positionalArgs;
    if (command === 'convert-tracker-dump') {
        if (!patternsPath || !manifestPath || !rawSamplesPath || !outputPath || !category) {
            console.error('Usage: node scripts/importTracker.js convert-tracker-dump <patterns.txt> <manifest.tsv> <rawSamplesDir> <outputDir> <category> [--grid=12]');
            process.exit(1);
        }
        await convertTrackerDump(path.resolve(patternsPath), path.resolve(manifestPath), path.resolve(rawSamplesPath), path.resolve(outputPath), category, options);
    } else {
        console.log('Unknown command. Use "convert-tracker-dump".');
    }
}

main();