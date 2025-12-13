// src/engine/audio/models.ts

// --- STORAGE TYPES (MongoDB) ---

export type SynthType = 'triangle' | 'sine' | 'square' | 'sawtooth' | 'fmsquare' | 'fmsawtooth' | 'amsquare' | 'amsawtooth';

export interface EnvelopeDef {
    attack: number;
    decay: number;
    sustain: number; // 0-1 volume level
    release: number;
}

// Stored in the 'worlds' collection under content.instruments
export interface InstrumentDefinition {
    id: string;
    name: string;
    type: 'synth' | 'sampler'; // Sampler reserved for future phases
    config: {
        oscillator?: { type: SynthType };
        envelope?: EnvelopeDef;
        volume?: number; // dB (-infinity to 0)
        polyphony?: number; // Max simultaneous voices (default 4)
    };
}

// Stored in the 'worlds' collection under content.music
export interface LigatureTrack {
    id: string;
    name: string;
    source: string; // The raw .lig text content
}

// --- RUNTIME TYPES (Parser Output) ---

export interface ParsedTrack {
    config: {
        bpm: number;
        grid: number;       // Slots per Quarter Note
        timeSig: [number, number]; // [4, 4]
        scaleRoot: string;  // "C"
        scaleMode: string;  // "Minor"
        swing: number;      // 0.0 to 1.0
    };
    instruments: Record<string, string>; // TrackName -> InstrumentID
    definitions: Record<string, NoteGroup>; // @Alias -> [1, 3, 5]
    patterns: Record<string, ParsedPattern>;
    playlist: PlaylistItem[];
}

export interface PlaylistItem {
    patternIds: string[]; // Supports layering: ["Bass_A", "Lead_A"]
    transposition: number;
}

export interface ParsedPattern {
    id: string;
    duration: number; // In Quarter Notes
    tracks: Record<string, SequenceEvent[]>; // Key is Instrument Name
}

// A single event in time
export interface SequenceEvent {
    time: number;       // Absolute grid slot index (0, 1, 2...)
    duration: number;   // Length in grid slots
    notes: NoteDef[];   // Array to support polyphony/chords
}

export interface NoteDef {
    degree: number;       // 1-7
    octaveShift: number;  // +1, -1, 0
    accidental: number;   // +1 (#), -1 (b), 0
    isNatural: boolean;   // True if % symbol used
}

// Intermediate type for Aliases
export type NoteGroup = NoteDef[];