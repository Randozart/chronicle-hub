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
    currentMarketId?: string; 
    
    // Handlers
    onOptionClick: (storyletId: string) => void; 
    onDrawClick: () => void;
    onEventFinish: (newQualities: PlayerQualities, redirectId?: string) => void;
    onQualitiesUpdate: (newQualities: PlayerQualities) => void;
    onCardPlayed: (cardId: string) => void;
    onOpenMap?: () => void; 
    onExit: () => void;
    onOpenMarket: () => void; 
    
    showMarket: boolean;
    activeMarket: MarketDefinition | null; 
    onCloseMarket: () => void;
    worldState: PlayerQualities;

    hasRightColumn?: boolean; 
}