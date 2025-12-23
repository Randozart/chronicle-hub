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

export interface FilterDef {
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' | 'peaking' | 'lowshelf' | 'highshelf';
    frequency: number; // Hz
    rolloff?: -12 | -24 | -48 | -96;
    Q?: number;
    gain?: number; // Used for shelving/peaking
    velocitySens?: number; // 0 to 1 (Depth of velocity modulation)
}

export interface EQDef {
    low: number;  // Gain in dB
    mid: number;
    high: number;
    lowFrequency?: number;
    highFrequency?: number;
}

export interface LFODef {
    target: 'pan' | 'filter' | 'volume';
    type: 'sine' | 'square' | 'triangle' | 'sawtooth';
    frequency: number; 
    depth: number;     
    min?: number;
    max?: number;
}

export interface EmbellishmentDef {
    url: string;
    probability: number; 
    volume?: number;     
    pitchOffset?: number; 
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
            crossfade?: number;
        };
        noteCut?: boolean; 
        portamento?: number; // Glide time in seconds (0 = off)

        // --- NEW MODULES ---
        filter?: FilterDef;
        eq?: EQDef;
        lfos?: LFODef[];
        
        // --- HUMANIZATION & ARTICULATION ---
        humanize?: {
            enabled: boolean;
            velocity?: number; // Variance (0-1)
            timing?: number;   // Variance (0-1)
        };
        
        embellishments?: EmbellishmentDef[];
        
        // Deprecated but kept for compatibility
        panning?: {
            enabled: boolean;
            type?: 'sine' | 'square' | 'triangle' | 'sawtooth';
            frequency?: number; 
            depth?: number;     
        };
        
        overrides?: any; 
    };
}

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
        
        reverb?: number;      
        delay?: number;       
        distortion?: number;  
        bitcrush?: number;    
        
        filter?: FilterDef;
        eq?: EQDef;
        
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