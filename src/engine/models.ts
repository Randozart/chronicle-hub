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

export interface LogicGates {
    visible_if?: string; 
    unlock_if?: string;  
}

export interface ResolveOption extends LogicGates {
    id: string;
    name: string;
    image_code?: string;
    short?: string;
    meta?: string;
    challenge?: string; 
    action_cost?: string; 
    tags?: string[]; 
    dynamic_tags?: string; 
    ordering?: number;
    pass_long: string;
    pass_meta?: string;    
    pass_quality_change?: string;
    pass_redirect?: string;
    pass_move_to?: string;
    fail_long?: string;
    fail_meta?: string;    
    fail_quality_change?: string;
    fail_redirect?: string;
    fail_move_to?: string;

    computed_action_cost?: number | string;
}

export type PublishStatus = 
    | 'draft'       // Hidden from players, visible in Playtest
    | 'playtest'    // Explicitly for testing, visible in Playtest
    | 'review'      // Functionally Published, but marked for creator review
    | 'published'   // Live
    | 'maintenance' // Visible but Locked (Excuse our mess)
    | 'archived';   // Soft deleted

export interface VersionedEntity {
    version?: number;
    lastModifiedBy?: string;
    lastModifiedAt?: Date;
}

interface ContentCommon extends VersionedEntity {
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
    image_style?: 'default' | 'square' | 'landscape' | 'portrait' | 'circle' | 'wide'; 
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

export interface QualityDefinition extends VersionedEntity {
    id: string;
    name?: string;
    description?: string;
    type: QualityType;
    category?: string; 
    folder?: string; 
    editor_name?: string; 
    image?: string;
    ordering?: number;
    max?: string;              
    grind_cap?: string;        
    cp_cap?: string;           
    singular_name?: string;
    plural_name?: string;
    increase_description?: string;
    decrease_description?: string;
    text_variants?: Record<string, string>; 
    tags?: string[];
    bonus?: string;
    storylet?: string;
    lock_message?: string;   
    [key: string]: any;
}

export interface CharCreateRule {
    type: 'string' | 'static' | 'label_select' | 'image_select' | 'labeled_image_select' | 'header';
    rule: string;
    visible: boolean;
    readOnly: boolean;
    required?: boolean; 
    visible_if?: string;
    hideIfZero?: boolean; 
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
    title?: string;
    publicationStatus?: 'private' | 'in_progress' | 'published';
    deletionScheduledAt?: string;
    useActionEconomy: boolean;
    maxActions: number | string;
    actionId: string;
    regenIntervalInMinutes: number;
    regenAmount: number | string;
    defaultActionCost?: number | string;
    defaultDrawCost?: string;
    deckDrawCostsAction?: boolean; 
    startLocation?: string;
    locationId?: string;
    characterSheetCategories: string[];
    equipCategories: string[];
    currencyQualities?: string[];
    playerName: string;
    playerImage: string;
    enablePortrait?: boolean;
    portraitStyle?: 'circle' | 'square' | 'rect' | 'rounded';
    portraitSize?: 'small' | 'medium' | 'large'; 
    modalImageSize?: 'small' | 'medium' | 'large'; 
    enableTitle?: boolean;
    titleQualityId?: string;
    layoutStyle: LayoutStyle;
    nexusCenteredLayout?: boolean; 
    locationHeaderStyle?: 'standard' | 'banner' | 'hidden' | 'square' | 'circle' | 'title-card'; 
    showHeaderInStorylet?: boolean; 
    tabLocation?: 'main' | 'header' | 'sidebar';
    imageConfig?: {
        storylet?: 'default' | 'square' | 'landscape' | 'portrait' | 'circle';
        icon?: 'default' | 'circle' | 'rounded';
        location?: 'default' | 'circle' | 'wide';
        
        inventory?: 'default' | 'square' | 'portrait' | 'landscape' | 'circle' | 'wide'; 
    };
    componentConfig?: {
        storyletListStyle?: 'rows' | 'cards' | 'compact' | 'polaroid' | 'scrolling' | 'images-only' | 'tarot';
        handStyle?: 'rows' | 'cards' | 'compact' | 'polaroid' | 'scrolling' | 'images-only' | 'tarot';

        storyletWidth?: 'full' | 'narrow' | 'centered';  
        inventoryCardSize?: 'small' | 'medium' | 'large'; 
        inventoryStyle?: 'standard' | 'portrait' | 'icon-grid' | 'list';
        inventoryPortraitMode?: 'cover' | 'icon'; 
    };
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
    hideProfileIdentity?: boolean;
    showQualityIconsInSheet?: boolean;
    showPortraitInSidebar?: boolean;
    attributions?: string;
    aiDisclaimer?: string; 
    isPublished?: boolean; 
    coverImage?: string;
    summary?: string;
    tags?: string[];
    skipCharacterCreation?: boolean;
    livingStoriesConfig?: {
        enabled: boolean;
        position: 'sidebar' | 'column' | 'tab';
        title?: string; 
        hideWhenEmpty?: boolean;
    };
     themeOverrides?: {
        condition: string;
        theme: string;
    }[];
    contentConfig?: {
        mature?: boolean;
        matureDetails?: string;
        erotica?: boolean;
        eroticaDetails?: string;
        triggers?: boolean;
        triggerDetails?: string;
    };
}

export interface DeckDefinition extends VersionedEntity { 
    id: string; 
    name?: string; 
    saved: string; 
    timer?: string; 
    draw_cost?: string; 
    hand_size: string; 
    deck_size?: string; 
    ordering?: number; 
    card_style?: 'default' | 'cards' | 'rows' | 'scrolling';
    always_show?: boolean;
}

export interface MapRegion extends VersionedEntity{ 
    id: string; 
    name: string; 
    image?: string; 
    marketId?: string; 
}

export interface LocationDefinition extends VersionedEntity {
    id: string; 
    name: string; 
    description?: string;
    image: string; 
    deck: string; 
    regionId?: string; 
    tags?: string[]; 
    coordinates: { x: number, y: number }; 
    unlockCondition?: string; 
    visibleCondition?: string; 
    marketId?: string; 
}
export interface ImageDefinition extends VersionedEntity{ 
    id: string; 
    url: string; 
    alt?: string; 
    category?: ImageCategory; 
    size?: number; 
    focus?: { x: number; y: number }; 
}
export interface CategoryDefinition extends VersionedEntity{ 
    id: string; 
    name?: string; 
    color?: string; 
    description?: string; 
}
export interface ShopListing { 
    id: string; 
    qualityId: string; 
    price: string; 
    currencyId?: string; 
    description?: string; 
    visible_if?: string; 
    unlock_if?: string; 
}
export interface ShopStall { id: string; 
    name: string; 
    mode: 'buy' | 'sell'; 
    source?: string; 
    listings: ShopListing[]; 
}
export interface MarketDefinition extends VersionedEntity { 
    id: string; 
    name: string; 
    image?: string; 
    defaultCurrencyId: string; 
    allowAllTypes?: boolean; 
    stalls: ShopStall[]; 
}

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

export interface BaseQualityState {
    qualityId: string;
    type: QualityType;
    text_variants?: Record<string, string | number | boolean>;
    tags?: string[];
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
    startTime?: Date;
    recurring: boolean; 
    intervalMs?: number;
    description?: string;
    completedTime?: Date;

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
    dynamicQualities?: Record<string, QualityDefinition>;
}

export interface UserDocument {
    _id: ObjectId | string; 
    username: string;
    email: string;
    password?: string;
    resetToken?: string;
    resetTokenExpiry?: Date;
    image?: string;
    emailVerified?: Date | null;
    roles?: ('admin' | 'premium' | 'writer')[];
    storageUsage?: number; 
    storageLimit?: number; 
    assets?: GlobalAsset[];
    acknowledgedPlatformMessages?: string[];
    tosAgreedAt?: Date;
    isBanned?: Boolean;
    banReason?: string;
}
export type AssetType = 'instrument' | 'track' | 'image';

export interface GlobalAsset {
    id: string;
    type?: AssetType; 
    url?: string;
    size?: number;
    category?: string;
    uploadedAt?: Date;
    folder?: string; 
    data?: InstrumentDefinition | LigatureTrack; 
    lastModified?: Date; 
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
    metatext?: string; 
    redirectId?: string;
    moveToId?: string;
    qualityChanges: QualityChangeInfo[];
    scheduledUpdates: any[];
    skillCheckDetails?: { description: string };
    title?: string;
    image_code?: string;
    errors?: string[]; 
    resolvedEffects?: string[]; 
}

export type WorldContent = WorldConfig;