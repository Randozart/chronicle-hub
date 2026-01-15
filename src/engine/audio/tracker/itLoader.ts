// src/engine/audio/tracker/itLoader.ts

export interface ItSample {
    name: string;
    filename: string;
    globalVol: number;
    defaultVol: number;
    c5Speed: number;
    length: number;
    is16Bit: boolean;
    data?: Int8Array | Int16Array;
    loop: {
        enabled: boolean;
        pingPong: boolean;
        start: number;
        end: number;
    }
}

export interface ItPattern {
    rows: number;
    data: Uint8Array;
    decoded?: ItRow[];
}

export interface ItRow {
    channels: {
        [key: number]: {
            note?: number;
            instrument?: number;
            volpan?: number;
            command?: number;
            commandVal?: number;
        }
    }
}

export interface ItSong {
    title: string;
    globalVol: number;
    mixVol: number;
    initialSpeed: number;
    initialTempo: number;
    orders: number[];
    samples: ItSample[];
    patterns: ItPattern[];
}
function decodeCString(buffer: Uint8Array): string {
    const nullIndex = buffer.indexOf(0);
    const cleanBuffer = nullIndex === -1 ? buffer : buffer.slice(0, nullIndex);
    return new TextDecoder().decode(cleanBuffer);
}

export function parseItFile(buffer: ArrayBuffer): ItSong {
    const dv = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    let p = 0;

    const magic = new TextDecoder().decode(u8.slice(0, 4));
    if (magic !== 'IMPM') throw new Error("Not an Impulse Tracker file");

    const title = decodeCString(u8.slice(4, 30));
    p = 32;
    const ordNum = dv.getUint16(p, true); p += 2;
    const insNum = dv.getUint16(p, true); p += 2;
    const smpNum = dv.getUint16(p, true); p += 2;
    const patNum = dv.getUint16(p, true); p += 2;
    p += 4;
    const flags = dv.getUint16(p, true); p += 2;
    p += 2;
    
    const globalVol = dv.getUint8(p); p += 1;
    const mixVol = dv.getUint8(p); p += 1;
    const initialSpeed = dv.getUint8(p); p += 1;
    const initialTempo = dv.getUint8(p); p += 1;
    const orders: number[] = [];
    p = 192;
    for(let i=0; i<ordNum; i++) {
        orders.push(u8[p + i]);
    }
    p = 192 + ordNum;
    
    const insOffsets: number[] = [];
    for(let i=0; i<insNum; i++) { insOffsets.push(dv.getUint32(p, true)); p+=4; }
    
    const smpOffsets: number[] = [];
    for(let i=0; i<smpNum; i++) { smpOffsets.push(dv.getUint32(p, true)); p+=4; }
    
    const patOffsets: number[] = [];
    for(let i=0; i<patNum; i++) { patOffsets.push(dv.getUint32(p, true)); p+=4; }

    const samples: ItSample[] = [];
    for(let i=0; i<smpOffsets.length; i++) {
        samples.push(parseSample(dv, smpOffsets[i]));
    }
    const patterns: ItPattern[] = [];
    for(let i=0; i<patOffsets.length; i++) {
        const offset = patOffsets[i];
        if (offset === 0) {
            patterns.push({ rows: 64, data: new Uint8Array(0), decoded: [] });
        } else {
            patterns.push(parsePattern(dv, offset));
        }
    }
    return {
        title, globalVol, mixVol, initialSpeed, initialTempo, orders, samples, patterns
    };
}

function parseSample(dv: DataView, offset: number): ItSample {
    let p = offset;
    p += 4;
    const filename = decodeCString(new Uint8Array(dv.buffer).slice(p, p+12));
    p += 13;
    const globalVol = dv.getUint8(p); p+=1;
    const flags = dv.getUint8(p); p+=1;
    const defaultVol = dv.getUint8(p); p+=1;
    const name = decodeCString(new Uint8Array(dv.buffer).slice(p, p+26));
    p += 26;
    p += 2;
    const length = dv.getUint32(p, true); p+=4;
    const loopStart = dv.getUint32(p, true); p+=4;
    const loopEnd = dv.getUint32(p, true); p+=4;
    const c5Speed = dv.getUint32(p, true); p+=4;
    p += 8;
    const samplePointer = dv.getUint32(p, true); p+=4;

    const hasLoop = (flags & 16) !== 0;
    const isPingPong = (flags & 32) !== 0;
    const is16Bit = (flags & 2) !== 0;
    const isCompressed = (flags & 8) !== 0;

    let sampleData: Int8Array | Int16Array | undefined;

    if (samplePointer > 0 && length > 0 && !isCompressed) {
        if (samplePointer + length * (is16Bit?2:1) <= dv.byteLength) {
            if (is16Bit) {
                sampleData = new Int16Array(length);
                for(let i=0; i<length; i++) sampleData[i] = dv.getInt16(samplePointer + (i*2), true);
            } else {
                sampleData = new Int8Array(length);
                for(let i=0; i<length; i++) sampleData[i] = dv.getInt8(samplePointer + i);
            }
        }
    }

    return {
        name: name || filename, filename, globalVol, defaultVol, c5Speed, length, is16Bit, data: sampleData,
        loop: { enabled: hasLoop, pingPong: isPingPong, start: loopStart, end: loopEnd }
    };
}

function parsePattern(dv: DataView, offset: number): ItPattern {
    let p = offset;
    const len = dv.getUint16(p, true); p+=2;
    const rows = dv.getUint16(p, true); p+=2;
    p += 4; 
    
    const data = new Uint8Array(dv.buffer.slice(p, p + len));
    const decoded = decodePattern(data, rows);

    return { rows, data, decoded };
}

function decodePattern(data: Uint8Array, rowCount: number): ItRow[] {
    const rows: ItRow[] = [];
    let p = 0;
    
    const lastMasks = new Uint8Array(64);
    const lastNote = new Uint8Array(64);
    const lastInst = new Uint8Array(64);
    const lastVol = new Uint8Array(64);
    const lastCmd = new Uint8Array(64);
    const lastCmdVal = new Uint8Array(64);

    let eventCount = 0;

    for (let r = 0; r < rowCount; r++) {
        const row: ItRow = { channels: {} };
        
        while (p < data.length) {
            const channelVar = data[p++];
            if (channelVar === 0) break;

            const channel = (channelVar - 1) & 63;
            if (!row.channels[channel]) row.channels[channel] = {};
            const cell = row.channels[channel];

            if (channelVar & 128) {
                if (p >= data.length) break;
                lastMasks[channel] = data[p++];
            }
            const mask = lastMasks[channel];

            if (mask & 1) {
                if (p >= data.length) break;
                const n = data[p++];
                lastNote[channel] = n;
                cell.note = n; 
                eventCount++;
            } else if (mask & 16) {
                cell.note = lastNote[channel];
                eventCount++;
            }

            if (mask & 2) {
                if (p >= data.length) break;
                const i = data[p++];
                lastInst[channel] = i;
                cell.instrument = i;
                eventCount++;
            } else if (mask & 32) {
                cell.instrument = lastInst[channel];
                eventCount++;
            }

            if (mask & 4) {
                if (p >= data.length) break;
                const v = data[p++];
                lastVol[channel] = v;
                cell.volpan = v;
            } else if (mask & 64) {
                cell.volpan = lastVol[channel];
            }

            if (mask & 8) {
                if (p + 1 >= data.length) break;
                const c = data[p++];
                const v = data[p++];
                lastCmd[channel] = c;
                lastCmdVal[channel] = v;
                cell.command = c;
                cell.commandVal = v;
                eventCount++;
            } else if (mask & 128) {
                cell.command = lastCmd[channel];
                cell.commandVal = lastCmdVal[channel];
                eventCount++;
            }
        }
        rows.push(row);
    }
    
    if (eventCount === 0) console.warn(`  ! Pattern decoded but 0 events found. Check masks.`);
    
    return rows;
}