// src/engine/audio/tracker/converter.ts
import { ItSong, parseItFile } from './itLoader';
import { InstrumentDefinition } from '../models';
import { Note, Scale } from 'tonal';

export interface ConverterOptions {
    grid: number;
    speed: number;
    scaleRoot: string;
    scaleMode: string;
    amplify: number;
    detectModulation?: boolean;
}

// --- MINIMAL ZIP WRITER ---
class SimpleZip {
    private files: { name: string, data: Uint8Array, crc: number }[] = [];

    add(name: string, data: Uint8Array) {
        this.files.push({ name, data, crc: this.crc32(data) });
    }

    private crc32(r: Uint8Array) {
        let t, e = 0 ^ -1;
        for (let n = 0; n < r.length; n++) {
            t = (e ^ r[n]) & 255;
            for (let a = 0; a < 8; a++) t = (1 & t ? -306674912 ^ t >>> 1 : t >>> 1);
            e = e >>> 8 ^ t;
        }
        return (e ^ -1) >>> 0;
    }

    generate(): Blob {
        let offset = 0;
        const localHeaders: Uint8Array[] = [];
        const centralDir: Uint8Array[] = [];

        for(const f of this.files) {
            const nameBytes = new TextEncoder().encode(f.name);
            const size = f.data.length;
            
            const lh = new Uint8Array(30 + nameBytes.length + size);
            const v = new DataView(lh.buffer);
            v.setUint32(0, 0x04034b50, true); 
            v.setUint16(4, 10, true); 
            v.setUint16(6, 0, true); 
            v.setUint16(8, 0, true); 
            v.setUint32(14, f.crc, true); 
            v.setUint32(18, size, true); 
            v.setUint32(22, size, true); 
            v.setUint16(26, nameBytes.length, true); 
            v.setUint16(28, 0, true); 
            lh.set(nameBytes, 30);
            lh.set(f.data, 30 + nameBytes.length);
            localHeaders.push(lh);

            const cd = new Uint8Array(46 + nameBytes.length);
            const c = new DataView(cd.buffer);
            c.setUint32(0, 0x02014b50, true);
            c.setUint16(4, 10, true);
            c.setUint16(6, 10, true);
            c.setUint16(8, 0, true);
            c.setUint16(10, 0, true); 
            c.setUint32(16, f.crc, true);
            c.setUint32(20, size, true);
            c.setUint32(24, size, true);
            c.setUint16(28, nameBytes.length, true);
            c.setUint32(42, offset, true); 
            cd.set(nameBytes, 46);
            centralDir.push(cd);
            offset += lh.length;
        }

        const cdBuffer = new Uint8Array(centralDir.reduce((acc, val) => acc + val.length, 0));
        let p = 0;
        centralDir.forEach(b => { cdBuffer.set(b, p); p+=b.length; });

        const endRec = new Uint8Array(22);
        const e = new DataView(endRec.buffer);
        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, this.files.length, true);
        e.setUint16(10, this.files.length, true);
        e.setUint32(12, cdBuffer.length, true);
        e.setUint32(16, offset, true);

        return new Blob([...localHeaders, cdBuffer, endRec] as any[], { type: 'application/zip' });
    }
}

// --- HELPER FUNCTIONS ---

function itNoteToLigature(note: number): string | null {
    if (note >= 120) return null; 
    const n = Note.fromMidi(note);
    return n;
}

function getRelativeKey(root: string, mode: string): { root: string, mode: string } {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const pc = Note.pitchClass(root);
    let idx = roots.indexOf(pc);
    if (idx === -1) idx = 0; 

    if (mode.toLowerCase() === 'major') {
        const newIdx = (idx - 3 + 12) % 12;
        return { root: roots[newIdx], mode: 'Minor' };
    } else {
        const newIdx = (idx + 3) % 12;
        return { root: roots[newIdx], mode: 'Major' };
    }
}

function determinePatternScale(
    pat: any, 
    primary: { root: string, mode: string }, 
    relative: { root: string, mode: string }
): { root: string, mode: string } {
    
    if (!pat || !pat.decoded) return primary;

    let primaryScore = 0;
    let relativeScore = 0;

    const primRootPC = Note.pitchClass(primary.root);
    const relRootPC = Note.pitchClass(relative.root);
    
    pat.decoded.forEach((row: any) => {
        Object.values(row.channels).forEach((c: any) => {
            if (c.note && c.note < 120) {
                const n = Note.fromMidi(c.note);
                const pc = Note.pitchClass(n);
                
                if (pc === primRootPC) primaryScore++;
                if (pc === relRootPC) relativeScore++;
            }
        });
    });

    if (relativeScore > (primaryScore * 1.2)) {
        return relative;
    }
    return primary;
}

function resolveRelative(absNote: string, scaleRoot: string, scaleMode: string): string {
    const scale = Scale.get(`${scaleRoot} ${scaleMode}`);
    if(!scale.notes.length) return "1";

    const midi = Note.midi(absNote) || 0;
    const pc = Note.pitchClass(absNote);
    
    let bestDegree = 1;
    let minDist = 100;
    let accidental = 0;

    scale.notes.forEach((spc, idx) => {
        const sMidi = Note.midi(spc + "4") || 0;
        const pMidi = Note.midi(pc + "4") || 0;
        let dist = pMidi - sMidi;
        if (dist > 6) dist -= 12;
        if (dist < -6) dist += 12;
        
        if (Math.abs(dist) < Math.abs(minDist)) {
            minDist = dist;
            bestDegree = idx + 1;
            accidental = dist;
        }
    });

    const tonicMidi = Note.midi(scale.tonic + "4") || 0;
    const degMidi = Note.midi(scale.notes[bestDegree-1] + "4") || 0;
    const interval = degMidi - tonicMidi;
    const octaveShift = Math.floor((midi - tonicMidi - interval + 6) / 12);

    let out = `${bestDegree}`;
    if (accidental > 0) out += '#'.repeat(accidental);
    if (accidental < 0) out += 'b'.repeat(-accidental);
    if (octaveShift > 0) out += "'".repeat(octaveShift);
    if (octaveShift < 0) out += ",".repeat(-octaveShift);
    
    return out;
}

function translateVol(volpan: number | undefined): string {
    if (volpan === undefined) return "";
    if (volpan > 64) return ""; 
    if (volpan >= 64) return ""; 
    if (volpan === 0) return "(v:-100)"; 
    const db = 20 * Math.log10(volpan / 64.0);
    return `(v:${Math.round(db)})`;
}

function translateEffect(cmd: number, val: number, speed: number): string {
    if (cmd === 4) { // Volume Slide
        const x = (val & 0xF0) >> 4;
        const y = (val & 0x0F);
        let slide = 0;
        let isUp = false;
        if (x === 0 && y > 0) { slide = y; } 
        else if (y === 0 && x > 0) { slide = x; isUp = true; } 
        if (slide === 0) return "";
        const total = slide * speed; 
        const percent = Math.min(100, Math.round((total / 64) * 100));
        return isUp ? `^[S${percent}]` : `^[F${percent}]`;
    }
    return "";
}

function formatBar(slots: string[], perBar: number): string {
    const bars: string[] = [];
    for(let i=0; i<slots.length; i+=perBar) {
        bars.push(slots.slice(i, i+perBar).join(' '));
    }
    return bars.join(' | ');
}

// --- MAIN CONVERTER ---

export function convertItToLigature(buffer: ArrayBuffer, opts: ConverterOptions) {
    //console.log("--- STARTING CONVERTER ---");
    const song = parseItFile(buffer);
    
    const zip = new SimpleZip();
    const presets: InstrumentDefinition[] = [];
    const smpMap = new Map<number, string>();
    const usedSamples = new Set<number>();
    
    const smpDefaultVols = new Map<number, number>();
    const baseVolume = -12;

    song.samples.forEach((s, i) => {
        const id = (s.name || `sample_${i}`).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        smpMap.set(i + 1, id); 
        smpDefaultVols.set(i + 1, s.defaultVol);
        
        if (s.data) {
            // ... (WAV generation logic is unchanged)
            const numChannels = 1, sampleRate = s.c5Speed, byteRate = sampleRate*numChannels*(s.is16Bit?2:1), blockAlign=numChannels*(s.is16Bit?2:1), dataLen=s.data.byteLength, headerLen=44;
            const wavBuffer = new ArrayBuffer(headerLen + dataLen);
            const view = new DataView(wavBuffer);
            const writeStr = (o: number, str: string) => { for(let k=0; k<str.length; k++) view.setUint8(o+k, str.charCodeAt(k)); };
            writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); writeStr(8, 'WAVE');
            writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); 
            view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
            view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
            view.setUint16(34, s.is16Bit ? 16 : 8, true); writeStr(36, 'data'); view.setUint32(40, dataLen, true);
            const wavBytes = new Uint8Array(wavBuffer);
            if (s.is16Bit) wavBytes.set(new Uint8Array(s.data.buffer, s.data.byteOffset, s.data.byteLength), 44);
            else for(let k=0; k<(s.data as Int8Array).length; k++) wavBytes[44+k] = (s.data as Int8Array)[k] + 128;
            
            // ZIP path is now nested
            zip.add(`${id}/sample.wav`, wavBytes);
        }

        const startSec = s.c5Speed > 0 ? s.loop.start / s.c5Speed : 0;
        const endSec = s.c5Speed > 0 ? s.loop.end / s.c5Speed : 0;
        
        presets.push({
            id: id, name: s.name, type: 'sampler', mapping: 'diatonic',
            config: {
                baseUrl: `/sounds/tracker/${id}/`, 
                urls: { "C4": `sample.flac` }, // Point to .flac
                volume: baseVolume, 
                octaveOffset: -1, 
                loop: { enabled: s.loop.enabled, type: s.loop.pingPong ? 'pingpong' : 'forward', start: startSec, end: endSec },
                envelope: { attack: 0.01, release: 0.5 } 
            }
        });
    });
    
    // ... (All remaining logic for Playlist, Patterns, etc. is unchanged) ...
    const finalPlaylistOrder: string[] = [];
    const usedPatternIds = new Set<string>();
    const visited = new Set<string>();
    let currentOrderIndex = 0;
    let safetyCounter = 0;

    while (currentOrderIndex < song.orders.length && safetyCounter < 1000) {
        safetyCounter++;
        const pIdx = song.orders[currentOrderIndex];
        if (pIdx >= 254) break; 
        if (pIdx >= song.patterns.length) { currentOrderIndex++; continue; }

        const patId = `P${pIdx}`;
        finalPlaylistOrder.push(patId);
        usedPatternIds.add(patId);
        
        let jumpToOrder = -1;
        const pat = song.patterns[pIdx];
        if (pat?.decoded) {
            for (const row of pat.decoded) {
                for (const cell of Object.values(row.channels)) {
                    if (cell.command === 2) { jumpToOrder = cell.commandVal ?? -1; }
                }
            }
        }
        
        if (jumpToOrder !== -1) {
            const loopKey = `${currentOrderIndex}->${jumpToOrder}`;
            if (visited.has(loopKey)) break;
            visited.add(loopKey);
            currentOrderIndex = jumpToOrder;
        } else {
            currentOrderIndex++;
        }
    }

    let ligSource = `[CONFIG]\n`;
    let bpm = song.initialTempo;
    let speed = song.initialSpeed;
    
    if (song.patterns[0]?.decoded) {
        for (const r of song.patterns[0].decoded) {
            for (const c in r.channels) {
                if (r.channels[c].command === 1) { 
                    const val = r.channels[c].commandVal || 6;
                    if (val > 0) speed = val;
                }
            }
        }
    }
    const adjustedBpm = Math.round(bpm * (6.0 / speed));
    ligSource += `BPM: ${adjustedBpm}\nGrid: ${opts.grid}\nScale: ${opts.scaleRoot} ${opts.scaleMode}\n\n[INSTRUMENTS]\n`;
    
    const slotsPerRow = opts.grid / opts.speed;
    const slotsPerBar = opts.grid * 4;

    const usedSamplesInPatterns = new Set<number>();
    song.patterns.forEach((p, pIdx) => { 
        if (usedPatternIds.has(`P${pIdx}`) && p.decoded) {
            p.decoded.forEach(r => Object.values(r.channels).forEach(c => { if(c.instrument) usedSamplesInPatterns.add(c.instrument) }));
        }
    });

    Array.from(usedSamplesInPatterns).sort().forEach(idx => { 
        const id = smpMap.get(idx); 
        const defVol = smpDefaultVols.get(idx) ?? 64;
        
        const globalAtten = 20 * Math.log10(opts.amplify / 128.0);
        const sampleAtten = 20 * Math.log10(defVol / 64.0);
        const totalMod = Math.round(globalAtten + sampleAtten);
        
        if (id) {
            if (totalMod === 0 || !isFinite(totalMod)) {
                ligSource += `${id}: ${id}\n`;
            } else {
                ligSource += `${id}: ${id}(v:${totalMod})\n`;
            }
        }
    });

    for (let pIdx = 0; pIdx < song.patterns.length; pIdx++) {
        const patId = `P${pIdx}`;
        if (!usedPatternIds.has(patId)) continue; 

        const pat = song.patterns[pIdx];
        if (!pat.decoded) continue;

        ligSource += `\n[PATTERN: ${patId}]\n`;
        // Pattern-specific scale detection logic from previous version would go here
        const currentScale = { root: opts.scaleRoot, mode: opts.scaleMode };
        
        const rawSlots = Math.ceil(pat.rows * slotsPerRow);
        const remainder = rawSlots % slotsPerBar;
        const totalSlots = remainder === 0 ? rawSlots : rawSlots + (slotsPerBar - remainder);

        Array.from(usedSamplesInPatterns).sort().forEach(smpIdx => {
            const instId = smpMap.get(smpIdx);
            if (!instId) return;

            const slots = new Array(totalSlots).fill('.');
            const events: {row: number, note: string, vol: string, eff?: string}[] = [];

            pat.decoded!.forEach((row, rIdx) => {
                let cell = null;
                for (const k in row.channels) {
                    if (row.channels[k].instrument === smpIdx) { cell = row.channels[k]; break; }
                }
                
                if (cell && cell.note) {
                    if (cell.note < 120) {
                        const n = itNoteToLigature(cell.note); 
                        if (n) {
                            const rel = resolveRelative(n, currentScale.root, currentScale.mode);
                            const v = translateVol(cell.volpan);
                            const eff = translateEffect(cell.command || 0, cell.commandVal || 0, speed);
                            events.push({ row: rIdx, note: rel, vol: v, eff });
                        }
                    }
                }
            });

            for(let i=0; i<events.length; i++) {
                const e = events[i];
                const nextRow = events[i+1]?.row ?? pat.rows;
                let str = e.note + e.vol + (e.eff || "");
                const start = Math.floor(e.row * slotsPerRow);
                const end = Math.floor(nextRow * slotsPerRow);
                if (start < slots.length) {
                    slots[start] = str;
                    for(let s=1; s<(end-start); s++) { if (start+s < slots.length) slots[start+s] = '-'; }
                }
            }

            const line = slots.join(' ');
            if (line.replace(/[.| -]/g, '').length > 0) {
                ligSource += `${instId.padEnd(20)} | ${formatBar(slots, slotsPerBar)} |\n`;
            }
        });
    }

    ligSource += `\n[PLAYLIST]\n`;
    ligSource += finalPlaylistOrder.join('\n');

    return { source: ligSource, presets, zipBlob: zip.generate() };
}