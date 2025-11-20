// src/engine/models.ts

export enum QualityType {
    Pyramidal = 'P',
    Counter = 'C',
    Tracker = 'T',
    Item = 'I',
    String = 'S',
}

export interface QualityDefinition {
    id: string;
    name?: string;
    description?: string;
    type: QualityType;
    category?: string;
    properties?: string;
}

export interface ResolveOption {
    id: string;
    name: string;
    image_code: string;
    short?: string;
    meta?: string;
    visible_if?: string;
    unlock_if?: string;
    pass_long: string;
    fail_long: string;
    pass_redirect?: string;
    fail_redirect?: string;
    pass_quality_change?: string;
    fail_quality_change?: string;
    random?: string;
    properties?: string;
}

export interface Storylet {
    id: string;
    name: string;
    image_code: string;
    text: string;
    metatext?: string;
    options: ResolveOption[];
    properties?: string;
    return?: string;
}

// --- REVISED QUALITY STATE MODELS ---

interface BaseQualityState {
    qualityId: string;
}

export interface CounterQualityState extends BaseQualityState {
    type: QualityType.Counter;
    level: number;
}
export interface PyramidalQualityState extends BaseQualityState {
    type: QualityType.Pyramidal;
    level: number;
    changePoints: number;
}
export interface ItemQualityState extends BaseQualityState {
    type: QualityType.Item;
    level: number;
    sources: string[];
    spentTowardsPrune: number;
}
export interface StringQualityState extends BaseQualityState {
    type: QualityType.String;
    stringValue: string;
}
export interface TrackerQualityState extends BaseQualityState {
    type: QualityType.Tracker;
    level: number;
}

// The Discriminated Union - each state now has a 'type' property.
export type QualityState = 
    | CounterQualityState 
    | PyramidalQualityState 
    | ItemQualityState 
    | StringQualityState 
    | TrackerQualityState;

export type PlayerQualities = Record<string, QualityState>;