// src/engine/audio/models.ts

export type SynthType = 
    | 'triangle' | 'sine' | 'square' | 'sawtooth' 
    | 'fmsine' | 'fmsquare' | 'fmsawtooth' | 'fmtriangle'
    | 'amsine' | 'amsquare' | 'amsawtooth' | 'amtriangle';

export interface EnvelopeDef {
    attack: number;
    decay?: number;   // <-- Made Optional
    sustain?: number; // <-- Made Optional
    release: number;
}

export interface InstrumentDefinition {
    id: string;
    name: string;
    type: 'synth' | 'sampler';
    category?: string; // <-- NEW FIELD FOR UI GROUPING
    config: {
        oscillator?: {
            type: SynthType;
            [key: string]: any; 
        };
        envelope?: EnvelopeDef;

        // SAMPLER SPECIFIC
        urls?: Record<string, string>;
        baseUrl?: string;
        
        // COMMON
        volume?: number;
        polyphony?: number;
    };
}

export interface LigatureTrack {
    id: string;
    name: string;
    source: string; 
}

// --- RUNTIME TYPES ---

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

export interface PatternModifier {
    transpose: number;
    volume: number;
    pan: number;
}

export interface PatternPlaylistItem {
    type: 'pattern',
    patterns: {
        id: string;
        transposition: number;
        volume?: number;
    }[];
    modifiers?: Record<string, PatternModifier>;
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
    trackModifiers: Record<string, PatternModifier>;
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