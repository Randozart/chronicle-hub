
const fs = require('fs/promises');
const path = require('path');
const { Note, Scale } = require('tonal');
const NOTE_OFF = '===';
const DEFAULT_TICKS_PER_ROW = 6;

function parseTrackerNote(noteStr) {
    if (!noteStr || noteStr.startsWith('.') || noteStr.startsWith('^')) return null;
    if (noteStr === NOTE_OFF) return NOTE_OFF;
    const note = noteStr.substring(0, 2).replace('-', ''); 
    const octave = noteStr.substring(2, 3);
    return `${note}${octave}`;
}

function normalizeTrackerVolume(trackerVol, globalVolMultiplier) {
    if (trackerVol === null || isNaN(trackerVol) || trackerVol <= 0) return null;
    if (trackerVol >= 64) return Math.round(20 * Math.log10(globalVolMultiplier));
    const linearAmplitude = (trackerVol / 64.0) * globalVolMultiplier;
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

function translateEffect(effCmd, durationRows, currentSpeed) {
    if (!effCmd || effCmd.length < 3) return null;
    
    const cmd = effCmd.charAt(0).toUpperCase();
    const valHex = effCmd.substring(1);
    const value = parseInt(valHex, 16);
    if (isNaN(value)) return null;

    const x = (value & 0xF0) >> 4;
    const y = (value & 0x0F);
    
    const ticksPerRow = currentSpeed || DEFAULT_TICKS_PER_ROW; 
    
    let slidePerTick = 0;
    let isSlideUp = false;
    let isSlideDown = false;

    if (cmd === 'D' || cmd === 'K' || cmd === 'L') {
        if (x === 0 && y > 0) {
            slidePerTick = y;
            isSlideDown = true;
        } else if (y === 0 && x > 0) {
            slidePerTick = x;
            isSlideUp = true;
        }
    } else if (cmd === 'C') { 
         slidePerTick = Math.max(x, y); 
         isSlideUp = true; 
    }

    if (slidePerTick === 0) return null;

    const totalChange = slidePerTick * ticksPerRow * durationRows;
    const scaledVal = Math.min(100, Math.round((totalChange / 64) * 100));
    
    if (scaledVal <= 0) return null;

    if (isSlideDown) return `^[F${scaledVal}]`; 
    if (isSlideUp) return `^[S${scaledVal}]`;   
    
    return null;
}
async function convertTrackerDump(patternsPath, manifestPath, rawSamplesPath, outputPath, category, options) {
    console.log('🚀 Starting full tracker dump conversion...');
    
    const scaleArg = options.scale || "C Major";
    const [scaleRoot, ...scaleModeParts] = scaleArg.split(' ');
    const scaleMode = scaleModeParts.join(' ') || "Major";
    console.log(`Musical Key: ${scaleRoot} ${scaleMode}`);
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
        const baseNote = "C5"; 
        const sampleNumPadded = String(sampleNum).padStart(2, '0');
        
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
        const loopConfig = { 
            enabled: true, 
            start: 0, 
            end: 0,
            type: 'forward'
        };

        const definition = {
            id: instrumentId,
            name: instrumentId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            category: category, type: 'sampler', mapping: 'diatonic',
            config: {
                baseUrl: `/sounds/tracker/${instrumentId}/`,
                urls: { [baseNote]: outputFileName },
                envelope: { attack: 0.01, release: releaseTime },
                volume: baseDb,
                octaveOffset: 0,
                loop: loopConfig
            },
        };
        allDefinitions.push(`'${instrumentId}': ${JSON.stringify(definition, null, 4)}`);
    }
    console.log('\nPHASE 2: Parsing Patterns & Effects...');
    const patternsContent = await fs.readFile(patternsPath, 'utf-8');
    const patternLines = patternsContent.split('\n');
    
    const patternsData = {}; 
    let orderList = []; 
    let initialBpm = 125; 
    let initialSpeed = 6; 
    let rowsPerPattern = 64; 
    const allUsedInstruments = new Set();
    
    for (const line of patternLines) { 
        if (line.startsWith('Orders:')) { 
            orderList = line.substring('Orders:'.length).trim().split(',').map(o => o.trim()).filter(o => o !== '-' && o !== ''); 
        } 
        if (line.startsWith('Rows:')) { 
            rowsPerPattern = parseInt(line.substring('Rows:'.length).trim()) || 64; 
        } 
    }

    let globalRowIndex = 0; 
    for (const line of patternLines) { 
        if (!line.startsWith('|')) continue; 
        
        const patternOrderIndex = Math.floor(globalRowIndex / rowsPerPattern); 
        const patternId = orderList[patternOrderIndex]; 
        const currentRowInPattern = globalRowIndex % rowsPerPattern;

        if (patternId === undefined) continue; 
        
        if (!patternsData[patternId]) { 
            patternsData[patternId] = { rows: [], jumps: [] }; 
        } else if (patternsData[patternId].rows.length >= rowsPerPattern) {
            globalRowIndex++;
            continue;
        }

        const channels = line.split('|').slice(1, -1); 
        const rowEvents = []; 
        
        channels.forEach((content) => { 
            const noteStr = content.substring(0, 3);
            const instNum = content.substring(3, 5);
            const volStr = content.substring(5, 8);
            const effStr = content.substring(8, 11);

            const instId = manifestMap.get(instNum); 
            if (instId) allUsedInstruments.add(instId); 
            
            if (globalRowIndex < 64 && effStr.startsWith('A')) {
                const spd = parseInt(effStr.substring(1), 16);
                if (!isNaN(spd) && spd > 0) {
                    if (spd !== initialSpeed) {
                        console.log(`> Detected Speed Change A${effStr.substring(1)} at Row ${globalRowIndex}. Setting Initial Speed to ${spd}.`);
                        initialSpeed = spd;
                    }
                }
            }

            if (effStr.startsWith('B')) {
                const jumpOrder = parseInt(effStr.substring(1), 16);
                if (!isNaN(jumpOrder)) {
                    patternsData[patternId].jumps.push({ row: currentRowInPattern, toOrder: jumpOrder });
                }
            }

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
    console.log('\nPHASE 3: Generating Ligature Source...');
    
    const adjustedBpm = Math.round(initialBpm * (6.0 / initialSpeed));
    if (adjustedBpm !== initialBpm) {
        console.log(`> Adjusting BPM from ${initialBpm} to ${adjustedBpm} based on Speed A${initialSpeed.toString(16)}.`);
    }

    const grid = parseInt(options.grid || '12', 10); 
    const speed = parseInt(options.speed || '4', 10); 
    const slotsPerRow = grid / speed; 
    const slotsPerBar = grid * 4; 
    const rowsPerBeat = grid / slotsPerRow;
    console.log(`> Grid ${grid} / Speed ${speed} = ${slotsPerRow.toFixed(2)} slots per row.`);
    console.log(`> This means 1 Beat = ${rowsPerBeat} Tracker Rows.`);

    let ligSource = `[CONFIG]\nBPM: ${adjustedBpm}\nGrid: ${grid}\nTime: 4/4\nScale: ${scaleRoot} ${scaleMode}\n\n[INSTRUMENTS]\n`;
    Array.from(allUsedInstruments).sort().forEach(id => { ligSource += `${id}: ${id}\n`; });
    
    const uniqueIds = Object.keys(patternsData).sort();

    for (const id of uniqueIds) {
        ligSource += `\n[PATTERN: P${id}]\n`;
        const pat = patternsData[id]; 
        
        const rawSlotsNeeded = Math.ceil(pat.rows.length * slotsPerRow);
        const remainder = rawSlotsNeeded % slotsPerBar;
        const totalSlots = remainder === 0 ? rawSlotsNeeded : rawSlotsNeeded + (slotsPerBar - remainder);
        
        Array.from(allUsedInstruments).sort().forEach(instId => {
            let slots = new Array(totalSlots).fill('.'); 
            const noteEvents = [];
            
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
            
            for (let i = 0; i < noteEvents.length; i++) {
                const evt = noteEvents[i];
                if (evt.type === 'off') continue;

                const nextEvt = noteEvents[i+1];
                let endRow = nextEvt ? nextEvt.row : pat.rows.length;
                const durationRows = endRow - evt.row;
                const effectString = translateEffect(evt.effect, durationRows, initialSpeed);

                const relativeNoteDef = absoluteNoteToRelative(evt.note, scaleRoot, scaleMode);
                let noteString = serializeRelativeNote(relativeNoteDef);
                
                const normalizedVolume = normalizeTrackerVolume(evt.volume, globalVolMultiplier);
                if (normalizedVolume !== null) { noteString += `(v:${normalizedVolume})`; }
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
                let finalLine = `${instId.padEnd(20)} |`;
                for (let b = 0; b < Math.ceil(totalSlots / slotsPerBar); b++) { 
                    const barSlice = slots.slice(b * slotsPerBar, (b + 1) * slotsPerBar); 
                    if (barSlice.length > 0) { finalLine += ` ${barSlice.join(' ')} |`; } 
                } 
                ligSource += `${finalLine}\n`;
            }
        });
    }
    ligSource += `\n[PLAYLIST]\n`; 
    
    const visited = new Set(); 
    let currentOrderIndex = 0;
    let safetyCounter = 0;
    
    while (currentOrderIndex < orderList.length && safetyCounter < 500) {
        safetyCounter++;
        const pId = orderList[currentOrderIndex];
        
        if (!patternsData[pId]) {
            currentOrderIndex++;
            continue;
        }

        ligSource += `P${pId}\n`;
        
        const pat = patternsData[pId];
        let jumpToOrder = -1;
        
        for (const row of pat.rows) {
            const jumpCmd = row.find(c => c && c.effect && c.effect.startsWith('B'));
            if (jumpCmd) {
                jumpToOrder = parseInt(jumpCmd.effect.substring(1), 16);
            }
        }
        
        if (jumpToOrder !== -1) {
            const loopKey = `${currentOrderIndex}->${jumpToOrder}`;
            if (visited.has(loopKey)) {
                console.log(`> Detected Loop at Order ${currentOrderIndex} jumping to ${jumpToOrder}. Stopping playlist generation.`);
                break;
            }
            visited.add(loopKey);
            currentOrderIndex = jumpToOrder;
            console.log(`> Jump Detected: Pattern P${pId} -> Order Index ${jumpToOrder}`);
        } else {
            currentOrderIndex++;
        }
    }
    
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