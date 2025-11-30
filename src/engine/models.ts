// src/engine/models.ts

export enum QualityType {
    Pyramidal = 'P',
    Counter = 'C',
    Tracker = 'T',
    Item = 'I',
    String = 'S',
    Equipable = 'E', 
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
    image?: string; // New Field (Image Code)
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

    computed_action_cost?: number; 
}

export type PublishStatus = 'draft' | 'published' | 'archived';

interface BaseStorylet {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    text: string;
    metatext?: string;
    properties?: string;
    options: ResolveOption[];
    autofire_if?: string; 
    status?: PublishStatus; // Default: 'draft'
    folder?: string; // e.g. "Chapter 1/Prologue"
    return?: string;
}

export interface Storylet extends BaseStorylet {
    location?: string;
    visible_if?: string;
    unlock_if?: string;
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

export interface MapRegion {
    id: string;
    name: string;
    image?: string; // The Map background image code
    width?: number; // Optional, for scrolling maps (default 100%)
    height?: number;
}

export interface LocationDefinition {
    id: string;
    name: string;
    image: string;
    deck: string;
    store?: string;
    regionId?: string; // Links to MapRegion
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
    layoutStyle: LayoutStyle; // Default: "nexus"
    bannerHeight?: number; // For London
    enableParallax?: boolean; // New setting
    visualTheme?: string;
    currencyQualities: string[]; // e.g. ["gold", "jade", "favours"]
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
    characterId: string; // <--- NEW: Unique ID for this specific save slot
    userId: string;
    storyId: string;
    name: string;        // Cached name for the lobby
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

export type ImageCategory = 'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'location' | 'uncategorized';

export interface ImageDefinition {
    id: string;
    url: string;
    alt?: string;
    category?: ImageCategory;
}

export interface CategoryDefinition {
    id: string; // "menace"
    name?: string; // "Current Threats" (Display Name)
    color?: string; // "#e74c3c"
    description?: string; // Optional tooltip
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
    regions: Record<string, MapRegion>; // NEW
}

export type WorldContent = WorldConfig;
export type LayoutStyle = "nexus" | "london" | "elysium" | "tabletop";

export interface WorldDocument {
    _id?: any; // MongoDB ID
    worldId: string; // Unique URL slug (e.g. 'trader_johns_world')
    ownerId: string; // User ID
    title: string;
    summary?: string;
    published: boolean;
    createdAt: Date;
    coverImage?: string; 
    playerCount?: number;
    tags?: string[]; // ["Fantasy", "Horror"]

    // The "Hot Config" we've been using
    settings: WorldSettings;
    content: {
        qualities: Record<string, QualityDefinition>;
        locations: Record<string, LocationDefinition>;
        decks: Record<string, DeckDefinition>;
        regions: Record<string, MapRegion>;
        images: Record<string, ImageDefinition>;
        char_create: Record<string, string>;
    };
    
    // Optional: Collaborators array for future RBAC
    collaborators?: { userId: string, role: 'admin' | 'writer' }[];
}
