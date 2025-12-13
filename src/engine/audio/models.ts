// src/engine/audio/models.ts

// --- STORAGE TYPES (MongoDB) ---

export type SynthType = 
    | 'triangle' | 'sine' | 'square' | 'sawtooth' 
    | 'fmsine' | 'fmsquare' | 'fmsawtooth' | 'fmtriangle'
    | 'amsine' | 'amsquare' | 'amsawtooth' | 'amtriangle';

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
    type: 'synth' | 'sampler';
    config: {
        // --- THIS IS THE FIX ---
        // Allow any standard Tone.js oscillator options by using a flexible record type.
        oscillator?: {
            type: SynthType;
            [key: string]: any; // Allows properties like 'modulationType'
        };
        // -------------------------
        
        envelope?: EnvelopeDef;
        volume?: number;
        polyphony?: number;
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

export type PlaylistItem = PatternPlaylistItem | CommandPlaylistItem;


export interface PatternPlaylistItem {
    type: 'pattern',
    patterns: {
        id: string;
        transposition: number;
    }[];
}

export interface CommandPlaylistItem {
    type: 'command';
    command: 'BPM' | 'Scale';
    value: string;
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