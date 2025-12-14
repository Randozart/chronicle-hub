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

export interface InstrumentDefinition {
    id: string;
    name: string;
    type: 'synth' | 'sampler';
    config: {
        oscillator?: {
            type: SynthType;
            [key: string]: any; 
        };
        envelope?: EnvelopeDef;
        volume?: number;
        polyphony?: number;
    };
}

export interface LigatureTrack {
    id: string;
    name: string;
    source: string; 
}

// --- RUNTIME TYPES (Parser Output) ---

export interface ParsedTrack {
    config: {
        bpm: number;
        grid: number;
        timeSig: [number, number];
        scaleRoot: string;
        scaleMode: string;
        swing: number;
        humanize: number;
    };
    instruments: Record<string, string>;
    definitions: Record<string, NoteGroup>;
    patterns: Record<string, ParsedPattern>;
    playlist: PlaylistItem[];
}

export type PlaylistItem = PatternPlaylistItem | CommandPlaylistItem;

// New: Defines volume/transpose changes
export interface PatternModifier {
    transpose: number;
    volume: number;
}

export interface PatternPlaylistItem {
    type: 'pattern',
    patterns: {
        id: string;
        transposition: number;
        // We can add 'volume' here later if needed for playlist-level mixing
    }[];
}

export interface CommandPlaylistItem {
    type: 'command';
    command: 'BPM' | 'Scale';
    value: string;
}

export interface ParsedPattern {
    id: string;
    duration: number;
    tracks: Record<string, SequenceEvent[]>; 
    trackModifiers: Record<string, PatternModifier>; // <--- THIS WAS MISSING
}

export interface SequenceEvent {
    time: number;       
    duration: number;   
    notes: NoteDef[];   
}

export interface NoteDef {
    degree: number;       
    octaveShift: number;  
    accidental: number;   
    isNatural: boolean;   
}

export type NoteGroup = NoteDef[];