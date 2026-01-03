// src/engine/models.ts

import { ObjectId } from 'mongodb';
import { InstrumentDefinition, LigatureTrack } from './audio/models';

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

export interface ResolveOption extends LogicGates {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    meta?: string;
    
    // Logic
    challenge?: string; // Expects 0-100: "{%chance[$stat >= 50 [10]]}"
    action_cost?: string; // Logic: "1" or "$stress++"
    
    // Hybrid Tag System
    tags?: string[]; // Static tags
    dynamic_tags?: string; // ScribeScript for conditional tags

    // Manual Ordering
    ordering?: number;

    // Outcomes
    pass_long: string;
    pass_quality_change?: string;
    pass_redirect?: string;
    pass_move_to?: string;

    fail_long?: string;
    fail_quality_change?: string;
    fail_redirect?: string;
    fail_move_to?: string;
    
    // Runtime computed (do not store in DB)
    computed_action_cost?: number | string;
}

// --- GAME CONTENT DEFINITIONS ---

export type PublishStatus = 'draft' | 'published' | 'archived';

interface ContentCommon {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    text: string;
    metatext?: string;
    tags?: string[];
    options: ResolveOption[];
    autofire_if?: string;
    status?: PublishStatus;
    folder?: string;
    return?: string;
    ordering?: number;
    urgency?: 'Must' | 'High' | 'Normal'; 
}

export interface Storylet extends ContentCommon, LogicGates {
    location?: string;
}

export interface Opportunity extends ContentCommon {
    deck: string;
    draw_condition?: string;
    frequency: "Always" | "Frequent" | "Standard" | "Infrequent" | "Rare";
    can_discard?: boolean;
    keep_if_invalid?: boolean;
    unlock_if?: string;
}

// --- CONFIGURATION DEFINITIONS ---

export interface QualityDefinition {
    id: string;
    name?: string;
    description?: string;
    type: QualityType;
    
    // LOGIC: Used for %pick, %list, and batch operations. Can be comma-separated: "Weapons, Swords, Iron"
    category?: string; 
    
    // UI: Used ONLY for grouping in the sidebar/editor. Does not affect game logic.
    folder?: string; 
    editor_name?: string; 

    image?: string;
    ordering?: number;

    // Advanced Caps
    max?: string;              // Hard Cap
    grind_cap?: string;        // Soft (Grindable) Cap
    cp_cap?: string;           // CP Requirement Cap

    // QoL Text Features
    singular_name?: string;
    plural_name?: string;
    increase_description?: string;
    decrease_description?: string;
    text_variants?: Record<string, string>; 
    
    // Tags and Item-specific fields
    tags?: string[];
    bonus?: string;
    storylet?: string;
}

export interface CharCreateRule {
    type: 'string' | 'static' | 'label_select' | 'image_select' | 'labeled_image_select' | 'header';
    rule: string;
    visible: boolean;
    readOnly: boolean;
    visible_if?: string;
    
    input_transform?: 'none' | 'lowercase' | 'uppercase' | 'capitalize';
    displayMode?: 'inline' | 'modal';
    ordering?: number;
    isModal?: boolean;
    showOnCard?: boolean;
}

export type LayoutStyle = "nexus" | "london" | "elysium" | "tabletop";
export type ImageCategory = 'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'cover' | 'location' | 'uncategorized';

export interface SystemMessage {
    id: string;
    enabled: boolean;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    content: string;
}

export interface WorldSettings {
    useActionEconomy: boolean;
    maxActions: number | string;
    actionId: string;
    regenIntervalInMinutes: number;
    regenAmount: number | string;
    defaultActionCost?: number | string;
    defaultDrawCost?: string;
    startLocation?: string;
    
    characterSheetCategories: string[];
    equipCategories: string[];
    currencyQualities?: string[];
    
    playerName: string;
    playerImage: string;
    enablePortrait?: boolean;
    portraitStyle?: 'circle' | 'square' | 'rect';
    enableTitle?: boolean;
    titleQualityId?: string;
    
    layoutStyle: LayoutStyle;
    locationHeaderStyle?: 'standard' | 'banner' | 'hidden' | 'square' | 'circle' | 'title-card'; 
    showHeaderInStorylet?: boolean; 
    tabLocation?: 'main' | 'header' | 'sidebar';
    visualTheme?: string;
    enableParallax?: boolean;
    
    challengeConfig?: {
        defaultMargin?: string;
        basePivot?: number;
        minCap?: number;
        maxCap?: number;
    };

    systemMessage?: SystemMessage;
    allowScribeScriptInInputs?: boolean;
    storynexusMode?: boolean; 
}

export interface DeckDefinition { id: string; saved: string; timer?: string; draw_cost?: string; hand_size: string; deck_size?: string; ordering?: number; }
export interface MapRegion { id: string; name: string; image?: string; marketId?: string; }
export interface LocationDefinition { id: string; name: string; image: string; deck: string; regionId?: string; tags?: string[]; coordinates: { x: number, y: number }; unlockCondition?: string; visibleCondition?: string; marketId?: string; }
export interface ImageDefinition { 
    id: string; 
    url: string; 
    alt?: string; 
    category?: ImageCategory;
    size?: number;
    focus?: { x: number; y: number }; 
}
export interface CategoryDefinition { id: string; name?: string; color?: string; description?: string; }
export interface ShopListing { id: string; qualityId: string; price: string; currencyId?: string; description?: string; visible_if?: string; unlock_if?: string; }
export interface ShopStall { id: string; name: string; mode: 'buy' | 'sell'; source?: string; listings: ShopListing[]; }
export interface MarketDefinition { id: string; name: string; image?: string; defaultCurrencyId: string; allowAllTypes?: boolean; stalls: ShopStall[]; }

// --- WORLD DOCUMENT ---

export interface WorldConfig {
    qualities: Record<string, QualityDefinition>;
    locations: Record<string, LocationDefinition>;
    decks: Record<string, DeckDefinition>;
    settings: WorldSettings;
    char_create: Record<string, CharCreateRule>;
    images: Record<string, ImageDefinition>;
    categories?: Record<string, CategoryDefinition>;
    regions: Record<string, MapRegion>;
    markets: Record<string, MarketDefinition>;

    instruments: Record<string, InstrumentDefinition>;
    music: Record<string, LigatureTrack>;
}

// --- RUNTIME STATE ---

export interface BaseQualityState {
    qualityId: string;
    type: QualityType;
    customProperties?: Record<string, string | number | boolean>;
}

export interface CounterQualityState extends BaseQualityState { type: QualityType.Counter | QualityType.Tracker; level: number; }
export interface PyramidalQualityState extends BaseQualityState { type: QualityType.Pyramidal; level: number; changePoints: number; }
export interface ItemQualityState extends BaseQualityState { type: QualityType.Item | QualityType.Equipable; level: number; sources: string[]; spentTowardsPrune: number; }
export interface StringQualityState extends BaseQualityState { type: QualityType.String; stringValue: string; }

export type QualityState = CounterQualityState | PyramidalQualityState | ItemQualityState | StringQualityState;
export type PlayerQualities = Record<string, QualityState>;

export interface PendingEvent {
    instanceId: string;
    scope: 'quality' | 'category';
    targetId: string;
    op: '=' | '+=' | '-=';
    value: number;
    triggerTime: Date;
    recurring: boolean; 
    intervalMs?: number;
    description?: string;
}

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
    pendingEvents?: PendingEvent[];
    acknowledgedMessages?: string[];
}

export interface UserDocument {
    // FIX: Allow both ObjectId (DB) and string (Client) to prevent type errors
    _id: ObjectId | string; 
    username: string;
    email: string;
    password?: string;
    image?: string;
    
    // Auth & Permissions
    emailVerified?: Date | null;
    roles?: ('admin' | 'premium' | 'writer')[];
    
    // Storage Features
    storageUsage?: number; // Bytes used
    storageLimit?: number; // Byte limit override
    assets?: GlobalAsset[];
    
    // System
    acknowledgedPlatformMessages?: string[];
}
export type AssetType = 'instrument' | 'track' | 'image';

export interface GlobalAsset {
    id: string;
    type?: AssetType; // Make optional as legacy images might not have it yet
    
    // --- IMAGE FIELDS ---
    url?: string;
    size?: number;
    category?: string;
    uploadedAt?: Date;

    // --- AUDIO/LEGACY FIELDS ---
    folder?: string; 
    data?: InstrumentDefinition | LigatureTrack; // Old audio wrapper
    lastModified?: Date; // Old timestamp field
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
    overrideDescription?: string; 
    scope?: 'character' | 'world';
    hidden?: boolean; 
}

export interface EngineResult {
    wasSuccess?: boolean;
    body: string;
    redirectId?: string;
    moveToId?: string;
    qualityChanges: QualityChangeInfo[];
    scheduledUpdates: any[];
    skillCheckDetails?: { description: string };
    title?: string;
    image_code?: string;
    errors?: string[]; 
    resolvedEffects?: string[]; // TRACE: New field for debugger logs
}

export type WorldContent = WorldConfig;