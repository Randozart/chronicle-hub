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

    /** Social action: this option is performed ON another player's character. */
    social?: boolean;
    /** Where candidate targets come from. Phase B adds 'known' (relationship rows). */
    social_scope?: 'here' | 'anywhere';
    /** Per-candidate condition string, evaluated against the candidate's qualities. */
    social_if?: string;
    /** Skip the accept/decline step — gift-like acts apply on the target's next tick. */
    auto_accept?: boolean;
    /** Effect string applied to the TARGET on the actor's success (or unchallenged resolve). */
    target_pass_quality_change?: string;
    /** Effect string applied to the TARGET on the actor's failure. */
    target_fail_quality_change?: string;
    /** Narration delivered to the target. Evaluated in actor context after actor effects; snapshot stored. */
    target_text?: string;

    lock_message?: string;
    computed_action_cost?: number | string;
    /** Sound URL played immediately when the player clicks this option (before resolution). */
    clickSoundId?: string;
    /** Sound URL played when the option resolves with no skill check (guaranteed pass). */
    soundId?: string;
    /** Sound URL played when the option resolves as a success (skill check passed). */
    passSoundId?: string;
    /** Sound URL played when the option resolves as a failure. */
    failSoundId?: string;
}

export type PublishStatus = 
    | 'draft'
    | 'playtest'
    | 'review'
    | 'published'
    | 'maintenance'
    | 'archived';

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
    musicTrackId?: string;
    musicMode?: 'replace' | 'duck';
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
    hideAsBonus?: boolean;
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

export type LayoutStyle = "nexus" | "london" | "elysium" | "tabletop" | "cinematic";
export type ImageCategory = 'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'cover' | 'location' | 'uncategorized';

export interface SystemMessage {
    id: string;
    enabled: boolean;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    content: string;
}

export type BlendMode = 'over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion';

export interface CompositionLayer {
    id: string;
    assetId: string;
    name: string;
    zIndex: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    
    groupId?: string;
    variantValue?: string;
    
    tintColor?: string;
    enableThemeColor?: boolean;

    editorHidden?: boolean;
    locked?: boolean;

    blendMode?: BlendMode; 
    
    effects?: {
        shadow?: { enabled: boolean; color: string; blur: number; x: number; y: number; blendMode?: BlendMode };
        glow?: { enabled: boolean; color: string; blur: number; blendMode?: BlendMode }; 
        stroke?: { enabled: boolean; color: string; width: number; opacity: number }; 
    };
}

export interface ImageComposition extends VersionedEntity {
    id: string;
    storyId: string;
    name: string;
    width: number;
    height: number;
    backgroundColor?: string;
    layers: CompositionLayer[];
    parameters: Record<string, 'hex' | 'variant' | 'number'>; 
    defaultParams?: Record<string, string>; 
    focus?: { x: number; y: number };
    thumbZoom?: number; 
}


export interface WorldSettings {
    title?: string;
    publicationStatus?: 'private' | 'in_progress' | 'published';
    deletionScheduledAt?: string;
    isOpenSource?: boolean;
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
    disableForcedStyles?: boolean;

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
    defaultMusicTrackId?: string;
    musicFadeDuration?: number;
    /** Default sound URL played when any option is clicked (before resolution), if the option has no clickSoundId. */
    defaultClickSoundUrl?: string;
    /** Default sound URL played when any guaranteed (no-challenge) option resolves, if the option has no soundId. */
    defaultSoundUrl?: string;
    /** Default sound URL played when any option resolves as success, if the option has no passSoundId. */
    defaultPassSoundUrl?: string;
    /** Default sound URL played when any option resolves as failure, if the option has no failSoundId. */
    defaultFailSoundUrl?: string;
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
    drawSoundId?: string;
}

export interface MapRegion extends VersionedEntity{
    id: string;
    name: string;
    image?: string;
    marketId?: string;
    musicTrackId?: string;
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
    equipmentLockMessage?: string;
    musicTrackId?: string;
    travelSoundId?: string;
    storyletDisplayOverride?: 'default' | 'cards' | 'rows' | 'scrolling' | 'polaroid' | 'images-only' | 'tarot';
}
export interface ImageDefinition extends VersionedEntity{ 
    id: string; 
    url: string; 
    alt?: string; 
    category?: ImageCategory; 
    size?: number; 
    focus?: { x: number; y: number }; 
    thumbZoom?: number;
}
export interface CategoryDefinition extends VersionedEntity{ 
    id: string; 
    name?: string; 
    color?: string; 
    description?: string;
    /// Member qualities stay queryable (%pick/%all, sidebar grouping) but are
    /// excluded from the profile listing and the possessions/item listing.
    hidden?: boolean; 
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

/** Timer/effect event produced by %schedule macros. Absent `type` means 'living'. */
export interface LivingEvent {
    instanceId: string;
    type?: 'living';
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

/** Player-to-player social act delivered to the target for consent. */
export interface SocialEvent {
    instanceId: string;
    type: 'social';
    triggerTime: Date;
    /**
     * Narration delivered to the target. Stored raw; evaluated in the TARGET's
     * context on accept, where `$target` is the ACTOR ("$target.name groomed
     * you") and plain `$quality` reads the target's own state.
     */
    description?: string;
    completedTime?: Date;
    fromCharacterId: string;
    fromName?: string;
    socialOptionId?: string;
    socialOptionName?: string;
    /** Effect strings from the option; the outcome's set applies on accept. */
    effects?: { pass?: string; fail?: string };
    /** The actor's resolution result; keys which effect set applies. */
    outcome?: 'pass' | 'fail';
    /** Auto-accept acts apply on the target's next tick without consent. */
    autoAccept?: boolean;
    accepted?: boolean;
    /** The actor's name + post-act quality state, snapshotted for mirroring reads. */
    actorSnapshot?: { name?: string; qualities: PlayerQualities };
    /** Filled on accept so the target's card can list their changes. */
    changes?: QualityChangeInfo[];
}

export type PendingEvent = LivingEvent | SocialEvent;

/** Quality ids reserved for engine scopes; authors should not create these. */
export const RESERVED_QUALITY_IDS = ['target', 'rel', 'world', 'platform'] as const;

/**
 * Evaluation context for the `$target.*` scope (social actions).
 * While set, `$target.name` resolves to the counterpart's character name and
 * `$target.<qid>` reads a quality from their state (StoryNexus "mirroring").
 */
export interface TargetEvalContext {
    name?: string;
    qualities: PlayerQualities;
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
export type AssetType = 'instrument' | 'track' | 'image' | 'sample';

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
    maxLevel?: number;
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