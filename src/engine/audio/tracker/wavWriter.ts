// src/engine/audio/tracker/wavWriter.ts

export function createWavUrl(sampleData: Int8Array | Int16Array, sampleRate: number, is16Bit: boolean): Blob {
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * (is16Bit ? 2 : 1);
    const blockAlign = numChannels * (is16Bit ? 2 : 1);
    const byteLength = sampleData.byteLength;
    
    const buffer = new ArrayBuffer(44 + byteLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, is16Bit ? 16 : 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, byteLength, true);
    const dataOffset = 44;
    
    if (is16Bit) {
        const src = sampleData as Int16Array;
        for (let i = 0; i < src.length; i++) {
            view.setInt16(dataOffset + (i * 2), src[i], true);
        }
    } else {
        const src = sampleData as Int8Array;
        for (let i = 0; i < src.length; i++) {
            view.setUint8(dataOffset + i, src[i] + 128);
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}