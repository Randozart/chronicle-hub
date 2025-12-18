// src/engine/audio/models.ts

export type SynthType = 
    | 'triangle' | 'sine' | 'square' | 'sawtooth' 
    | 'fmsine' | 'fmsquare' | 'fmsawtooth' | 'fmtriangle'
    | 'amsine' | 'amsquare' | 'amsawtooth' | 'amtriangle';

export interface EnvelopeDef {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
}

export interface EffectCommand {
    code: string; 
    value: number;
}

export interface InstrumentDefinition {
    id: string;
    name: string;
    type: 'synth' | 'sampler';
    category?: string;
    mapping?: 'diatonic' | 'chromatic';

    config: {
        oscillator?: {
            type: SynthType;
            [key: string]: any; 
        };
        envelope?: EnvelopeDef;
        urls?: Record<string, string>;
        baseUrl?: string;
        octaveOffset?: number;
        volume?: number;
        polyphony?: number;
        loop?: {
            enabled: boolean;
            type?: 'forward' | 'pingpong';
            start?: number;
            end?: number;
            crossfade?: number; // Crossfade time in seconds (e.g., 0.01)
        };
        noteCut?: boolean; 
    };
}

// ... (Rest of the file remains unchanged, ParsedTrack, etc.)
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
    instruments: Record<string, InstrumentConfig>; 
    definitions: Record<string, NoteGroup>;
    patterns: Record<string, ParsedPattern>;
    playlist: PlaylistItem[];
}

export interface InstrumentConfig {
    id: string; 
    overrides: {
        volume?: number;
        attack?: number;
        decay?: number;
        sustain?: number;
        release?: number;
        octaveOffset?: number;
        effects?: EffectCommand[];
    };
}

export type PlaylistItem = PatternPlaylistItem | CommandPlaylistItem;

export interface PatternModifier {
    transpose: number;
    volume: number;
    pan: number;
    effects?: EffectCommand[];
}

export interface PatternPlaylistItem {
    type: 'pattern',
    layers: Layer[];
}

export interface Layer {
    items: ChainItem[];
}

export interface ChainItem {
    id: string;
    transposition: number;
    volume?: number;
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
    volume?: number;
    effects?: EffectCommand[];
}

export interface LigatureTrack {
    id: string;
    name: string;
    source: string; 
    category?: string;
}

export type NoteGroup = NoteDef[];