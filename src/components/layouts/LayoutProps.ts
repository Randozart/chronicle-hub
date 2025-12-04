import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, DeckDefinition, MarketDefinition } from "@/engine/models";

export interface DeckStats {
    handSize: number;
    deckSize: number;
}

export interface LayoutProps {
    // State
    character: CharacterDocument;
    location: LocationDefinition;
    hand: Opportunity[];
    activeEvent: Storylet | Opportunity | null;
    isLoading: boolean;
    
    // Config
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>;
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    locationStorylets: Storylet[];
    storyId: string;
    deckDefs: Record<string, DeckDefinition>;
    currentDeckStats?: DeckStats;
    currentMarketId?: string; // The ID of the active market (if any)

    // Handlers
    onOptionClick: (storyletId: string) => void; // This maps to 'showEvent'
    onDrawClick: () => void;
    onEventFinish: (newQualities: PlayerQualities, redirectId?: string) => void;
    onQualitiesUpdate: (newQualities: PlayerQualities) => void;
    onCardPlayed: (cardId: string) => void;
    onOpenMap: () => void; // New Handler
    onExit: () => void;
    onOpenMarket: () => void; // The function to open the UI

    showMarket: boolean;
    activeMarket: MarketDefinition | null; // The full object, resolved in GameHub
    onCloseMarket: () => void;
    worldState: PlayerQualities;
}