// src/engine/models.ts

export enum QualityType {
    Pyramidal = 'P',
    Counter = 'C',
    Tracker = 'T',
    Item = 'I',
    String = 'S',
    Equipable = 'E', 
}

// --- CORE LOGIC INTERFACES ---

export interface LogicGates {
    visible_if?: string; // ScribeScript Condition
    unlock_if?: string;  // ScribeScript Condition
}

export interface QualityDefinition {
    id: string;
    name?: string;       // Evaluable String
    description?: string;// Evaluable String
    type: QualityType;
    category?: string;   // Comma-separated tree
    tags?: string[];     // [REPLACES properties] e.g. ['cursed', 'auto_equip', 'hidden']
    bonus?: string;      // Logic: "$strength + 1"
    storylet?: string;   // ID of Use-Item event
    max?: string;        // Logic: "10" or "$level_cap"
    image?: string;      // Image ID
}

export interface ResolveOption extends LogicGates {
    id: string;
    name: string;
    image_code?: string;
    short?: string;      // Tooltip
    meta?: string;       // Instruction text (e.g. "Will consume item")
    
    // Logic
    challenge?: string;  // [REPLACES random] Logic: "$stat >= 50 [10]"
    action_cost?: string;// Logic: "1" or "$cost"
    tags?: string[];     // [REPLACES properties] e.g. ['instant_redirect', 'dangerous']

    // Outcomes - Standard
    pass_long: string;
    pass_quality_change?: string;
    pass_redirect?: string;      // Storylet ID
    pass_move_to?: string;       // Location ID

    // Outcomes - Failure
    fail_long?: string;
    fail_quality_change?: string;
    fail_redirect?: string;
    fail_move_to?: string;

    // Outcomes - Rare
    rare_pass_chance?: number;
    rare_pass_long?: string;
    rare_pass_quality_change?: string;
    rare_pass_redirect?: string;

    rare_fail_chance?: number;
    rare_fail_long?: string;
    rare_fail_quality_change?: string;
    rare_fail_redirect?: string;

    // Runtime computed (do not store in DB)
    computed_action_cost?: number; 
}

// --- GAME CONTENT INTERFACES ---
interface ContentCommon {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    text: string;        
    metatext?: string;   
    tags?: string[];     // [REPLACES properties]
    options: ResolveOption[];
    autofire_if?: string;
    status?: PublishStatus;
    folder?: string; 
}

export type PublishStatus = 'draft' | 'published' | 'archived';

export interface Storylet extends ContentCommon, LogicGates {
    location?: string;   // Location ID
    return?: string;     // Target ID for "Go Back" button
}

export interface Opportunity extends ContentCommon {
    deck: string;        // Deck ID
    draw_condition?: string;
    frequency: "Always" | "Frequent" | "Standard" | "Infrequent" | "Rare";
    
    // Card Lifecycle
    can_discard?: boolean;      // Default: True. If false, player must play it.
    keep_if_invalid?: boolean;  // Default: False. If true, stays in hand even if draw_condition becomes false.
    
    // Note: Cards technically support 'unlock_if' on options, but usually not on the card itself.
    // If you want "Locked" cards in hand, add LogicGates here too.
    unlock_if?: string; 
}

// --- CONFIGURATION INTERFACES ---

export interface QualityDefinition {
    id: string;
    name?: string;       
    description?: string;
    type: QualityType;
    category?: string;   
    tags?: string[];     // [REPLACES properties]
    bonus?: string;      // Logic: "$strength + 1"
    storylet?: string;   // ID of Use-Item event
    max?: string;        // Logic: "10" or "$level_cap"
    image?: string;      
}

export interface DeckDefinition {
    id: string;
    saved: string;       // 'True'/'False'
    timer?: string;      // "sync_actions" OR number OR logic
    draw_cost?: string;
    hand_size: string;   // Logic
    deck_size?: string;  // Logic
}

export interface MapRegion {
    id: string;
    name: string;
    image?: string;
    width?: number;
    height?: number;
}

export interface LocationDefinition {
    id: string;
    name: string;
    image: string;
    deck: string;
    store?: string;      
    regionId?: string;   
    tags?: string[];     // [REPLACES properties]
    coordinates: { x: number, y: number };
    unlockCondition?: string; // Logic
    visibleCondition?: string; // Logic (New)
}

export interface WorldSettings {
    // Mechanics
    useActionEconomy: boolean;
    maxActions: number | string;
    actionId: string;
    regenIntervalInMinutes: number;
    regenAmount: number | string; 
    defaultActionCost?: number;
    startLocation?: string; // <--- NEW
    
    // UI / Categories
    characterSheetCategories: string[];
    equipCategories: string[];
    currencyQualities?: string[]; 
    
    // Identity
    playerName: string;
    playerImage: string;
    enablePortrait?: boolean; // New
    portraitStyle?: 'circle' | 'square' | 'rect'; // New
    enableTitle?: boolean; // New
    titleQualityId?: string; // New
    
    // System
    deckDrawCostsAction?: boolean;
    alwaysPurgeHandOnTravel?: boolean;
    
    // Visuals
    layoutStyle: LayoutStyle;
    bannerHeight?: number;
    enableParallax?: boolean;
    visualTheme?: string;
}

export interface WorldSettings {
    useActionEconomy: boolean;
    maxActions: number | string;
    actionId: string;
    regenIntervalInMinutes: number;
    regenAmount: number | string; // Allow logic
    
    // Removed old operators (handled by ScribeScript)
    
    characterSheetCategories: string[];
    equipCategories: string[];
    currencyQualities?: string[]; // [NEW]
    
    playerName: string;
    playerImage: string;
    
    deckDrawCostsAction?: boolean;
    alwaysPurgeHandOnTravel?: boolean;
    
    layoutStyle: LayoutStyle;
    bannerHeight?: number;
    enableParallax?: boolean;
    visualTheme?: string;
    defaultActionCost?: number; // [NEW]
}

// --- RUNTIME STATE INTERFACES ---

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

export type QualityState = CounterQualityState | PyramidalQualityState | ItemQualityState | StringQualityState | EquipableQualityState; 
export type PlayerQualities = Record<string, QualityState>;

export interface CharacterDocument {
    _id?: any;
    characterId: string;
    userId: string;
    storyId: string;
    name: string;
    qualities: PlayerQualities;
    currentLocationId: string;
    currentStoryletId: string;
    opportunityHands: Record<string, string[]>; 
    deckCharges: Record<string, number>;
    lastDeckUpdate: Record<string, Date>;
    lastActionTimestamp?: Date; 
    equipment: Record<string, string | null>;
    // pendingEvents?: any[]; // Future
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

export type ImageCategory = 'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'location' | 'uncategorized';

export interface ImageDefinition {
    id: string;
    url: string;
    alt?: string;
    category?: ImageCategory;
}

export interface CategoryDefinition {
    id: string;
    name?: string;
    color?: string;
    description?: string;
}

export interface WorldConfig {
    qualities: Record<string, QualityDefinition>;
    locations: Record<string, LocationDefinition>;
    decks: Record<string, DeckDefinition>;
    settings: WorldSettings;
    char_create: Record<string, string>;
    storylets?: Record<string, Storylet>;
    opportunities?: Record<string, Opportunity>;
    images: Record<string, ImageDefinition>; 
    categories?: Record<string, CategoryDefinition>;
    regions: Record<string, MapRegion>;
}

export type WorldContent = WorldConfig;
export type LayoutStyle = "nexus" | "london" | "elysium" | "tabletop";

export interface WorldDocument {
    _id?: any;
    worldId: string;
    ownerId: string;
    title: string;
    summary?: string;
    published: boolean;
    createdAt: Date;
    coverImage?: string; 
    playerCount?: number;
    tags?: string[];

    settings: WorldSettings;
    content: {
        qualities: Record<string, QualityDefinition>;
        locations: Record<string, LocationDefinition>;
        decks: Record<string, DeckDefinition>;
        regions: Record<string, MapRegion>;
        images: Record<string, ImageDefinition>;
        char_create: Record<string, string>;
    };
    collaborators?: { userId: string, role: 'admin' | 'writer' }[];
}