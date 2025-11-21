// src/engine/models.ts

export enum QualityType {
    Pyramidal = 'P',
    Counter = 'C',
    Tracker = 'T',
    Item = 'I',
    String = 'S',
}

// --- STATIC DEFINITIONS ---
// These interfaces describe the data loaded from your JSON files.

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
    image_code?: string;
    short?: string; // This was your 'short_desc'
    meta?: string;
    visible_if?: string;
    unlock_if?: string;
    pass_long: string;
    fail_long?: string;
    pass_redirect?: string;
    fail_redirect?: string;
    pass_quality_change?: string;
    fail_quality_change?: string;
    random?: string;
    properties?: string;
}

// Storylets and Opportunities are very similar, so they can share a base
interface BaseStorylet {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    text: string;
    metatext?: string;
    visible_if?: string;
    unlock_if?: string;
    properties?: string;
    options: ResolveOption[];
}

export interface Storylet extends BaseStorylet {
    return?: string;
    location?: string;
}

export interface Opportunity extends BaseStorylet {
    deck: string;
    draw_condition?: string;
    frequency: "Always" | "Frequent" | "Standard" | "Infrequent" | "Rare";
}

export interface LocationDefinition {
    id: string;
    name: string;
    image: string;
    deck: string;
    hand_size: string; // e.g., "$hand_size"
    deck_size: string; // e.g., "$deck_size"
    store?: string;
    map?: string;
    properties?: string;
}

export interface WorldContent {
    storylets: Record<string, Storylet>;
    qualities: Record<string, QualityDefinition>;
    opportunities: Record<string, Opportunity>;
    locations: Record<string, LocationDefinition>;
    starting: Record<string, string>;
}

interface BaseQualityState {
    qualityId: string;
    type: QualityType;
}

export interface CounterQualityState extends BaseQualityState {
    type: QualityType.Counter | QualityType.Tracker;
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

export type QualityState = 
    | CounterQualityState 
    | PyramidalQualityState 
    | ItemQualityState 
    | StringQualityState;

export type PlayerQualities = Record<string, QualityState>;

export interface CharacterDocument {
    _id?: any;
    userId: string;
    storyId: string;
    qualities: PlayerQualities;
    currentLocationId: string;
    currentStoryletId: string;
    opportunityHand: string[];
}