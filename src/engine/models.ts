// src/engine/models.ts

export enum QualityType {
    Pyramidal = 'P',
    Counter = 'C',
    Tracker = 'T',
    Item = 'I',
    String = 'S',
    Equipable = 'E', // <-- Added 'E' type
}

export interface QualityDefinition {
    id: string;
    name?: string;
    description?: string;
    type: QualityType;
    category?: string;
    properties?: string;
    bonus?: string; // For Equipables
    storylet?: string; // For clickable items
    max?: string; // For max value constraints
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
    action_cost?: string; // <-- ADDED THIS PROPERTY
    pass_move_to?: string; // New: ID of the location to move to on success
    fail_move_to?: string; // New: ID of the location to move to on failure
    
    rare_pass_chance?: number; // Percentage (0-100)
    rare_pass_long?: string;
    rare_pass_quality_change?: string;
    rare_pass_redirect?: string;

    rare_fail_chance?: number;
    rare_fail_long?: string;
    rare_fail_quality_change?: string;
    rare_fail_redirect?: string;
}

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
    autofire_if?: string; 
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

export interface DeckDefinition {
    id: string;
    saved: string; // 'True'/'False'
    timer?: string;
    draw_cost?: string;
    hand_size: string;
    deck_size?: string;
}

interface MapRegion {
    id: string;
    name: string;
    settingId: string; // e.g. "london_surface"
    backgroundImage: string;
    gridWidth: number;  // For visual placement
    gridHeight: number;
}

export interface LocationDefinition {
    id: string;
    name: string;
    image: string;
    deck: string;
    store?: string;
    map?: string; // Links to MapRegion
    properties?: string;
    coordinates: { x: number, y: number }; // Where it sits on the map
    unlockCondition?: string; // e.g., "$route_to_docks >= 1"
    isHidden?: boolean; // If true, doesn't show on map until visited
}

export interface WorldSettings {
    useActionEconomy: boolean;
    maxActions: number | string; // Can be number or soft-defined
    actionId: string;
    actionUseOperator: string;
    regenIntervalInMinutes: number;
    regenAmount: number;
    regenOperator: string;
    characterSheetCategories: string[];
    playerName: string;
    playerImage: string;
    equipCategories: string[];
    deckDrawCostsAction?: boolean; // Make this optional for backward compatibility
    alwaysPurgeHandOnTravel?: boolean; // Make this optional
}

// export interface WorldContent {
//     storylets: Record<string, Storylet>;
//     qualities: Record<string, QualityDefinition>;
//     opportunities: Record<string, Opportunity>;
//     locations: Record<string, LocationDefinition>;
//     decks: Record<string, DeckDefinition>; // <-- ADDED DECKS
//     char_create: Record<string, string>; // <-- ADDED CHAR_CREATE
//     settings: WorldSettings; 
// }

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

export interface EquipableQualityState extends BaseQualityState {
    type: QualityType.Equipable;
    level: number; 
}

export type QualityState = 
    | CounterQualityState 
    | PyramidalQualityState 
    | ItemQualityState 
    | StringQualityState
    | EquipableQualityState; 

export type PlayerQualities = Record<string, QualityState>;

export interface CharacterDocument {
    _id?: any;
    userId: string;
    storyId: string;
    qualities: PlayerQualities;
    currentLocationId: string;
    currentStoryletId: string;
    opportunityHands: Record<string, string[]>; 
    deckCharges: Record<string, number>;
    lastDeckUpdate: Record<string, Date>;
    lastActionTimestamp?: Date; 
    equipment: Record<string, string | null>; // e.g., { body: "thick_coat", head: null }
}

export interface QualityChangeInfo {
    qid: string;
    qualityName: string;
    type: QualityType;
    category?: string;
    levelBefore: number;
    cpBefore: number;
    levelAfter: number;
    cpAfter: number;
    stringValue?: string;
    changeText: string;
}

export interface ImageDefinition {
    id: string; // The code, e.g. "trader_john"
    url: string; // "/images/local.png" OR "https://cloudinary..."
    alt?: string; // Default alt text
}

// Base config needed for math and logic
export interface WorldConfig {
    qualities: Record<string, QualityDefinition>;
    locations: Record<string, LocationDefinition>;
    decks: Record<string, DeckDefinition>;
    settings: WorldSettings;
    char_create: Record<string, string>;
    storylets?: Record<string, Storylet>;
    opportunities?: Record<string, Opportunity>;
    images: Record<string, ImageDefinition>; 
}

export type WorldContent = WorldConfig;
