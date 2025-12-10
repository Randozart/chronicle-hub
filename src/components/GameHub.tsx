'use client';

import { useState, useCallback, useEffect } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion, DeckDefinition, MarketDefinition, SystemMessage, WorldConfig } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import ElysiumLayout from './layouts/ElysiumLayout';
import TabletopLayout from './layouts/TabletopLayout';
import { LayoutProps } from './layouts/LayoutProps';
import MapModal from './MapModal';
import GameImage from './GameImage';
import { GameEngine } from '@/engine/gameEngine';
import MarketInterface from './MarketInterface';
import SystemMessageBanner from './SystemMessageBanner';
import CharacterLobby from './CharacterLobby';

interface GameHubProps {
    initialCharacter: CharacterDocument | null; 
    initialLocation: LocationDefinition | null;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    availableCharacters: { 
        characterId: string; 
        name: string; 
        currentLocationId: string; 
        lastActionTimestamp?: string;
        portrait?: string | null; 
    }[];
    
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    locations: Record<string, LocationDefinition>;
    regions: Record<string, MapRegion>;
    storyId: string; 
    deckDefs: Record<string, DeckDefinition>;
    markets: Record<string, MarketDefinition>;
    worldState: PlayerQualities; // <--- ADD THIS
    systemMessage?: SystemMessage | null;
    activeEvent?: Storylet | Opportunity | null; // <--- Add this

}

export default function GameHub(props: GameHubProps) {
    
    
    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    const [location, setLocation] = useState<LocationDefinition | null>(props.initialLocation);
    const [hand, setHand] = useState<Opportunity[]>(props.initialHand);
    
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showMarket, setShowMarket] = useState(false);

    // Update useEffect to sync activeEvent
    useEffect(() => {
        setCharacter(props.initialCharacter);
        setLocation(props.initialLocation);
        setHand(props.initialHand);
        // If the server passes a forced event (Autofire), use it. Otherwise clear it.
        setActiveEvent(props.activeEvent || null); 
        setShowMap(false);
        setShowMarket(false);
    }, [props.initialCharacter, props.initialLocation, props.initialHand, props.activeEvent]);



    // // --- HANDLERS ---
    // const handleDismissMessage = async () => {
    //     if (!props.systemMessage || !character) return;
    //     try {
    //         await fetch('/api/character/acknowledge-message', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ characterId: character.characterId, messageId: props.systemMessage.id })
    //         });
    //     } catch (e) { console.error(e); }
    // };

    
    
    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) { 
            setActiveEvent(null); 
            return; 
        }
        setIsLoading(true);
        try {
            // We always fetch the RAW template. The client is the source of truth for rendering.
            if (!character) return; // Add a safety check
            const response = await fetch(`/api/storylet/${eventId}?storyId=${props.storyId}&characterId=${character.characterId}`);            if (!response.ok) throw new Error(`Event ${eventId} not found.`);
                        
            const rawEventData = await response.json();
            setActiveEvent(rawEventData); // Set the raw, un-rendered event data

        } catch (error) { 
            console.error(error); 
            setActiveEvent(null); 
        } finally { 
            setIsLoading(false); 
        }
    }, [props.storyId]); 

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prevCharacter => {
            if (!prevCharacter) return null;
            return { ...prevCharacter, qualities: newQualities };
        });
    }, []);

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string) => {
        // First, update the character state immediately.
        handleQualitiesUpdate(newQualities);
        // Then, trigger the navigation to the next event.
        showEvent(redirectId ?? null);
    }, [handleQualitiesUpdate, showEvent]);

    const handleCardPlayed = useCallback((cardId: string) => {
        setHand(prev => prev.filter(c => c.id !== cardId));
    }, []);

    const handleDrawCard = useCallback(async () => {
        if (isLoading || !character) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/deck/draw', { 
                method: 'POST',
                body: JSON.stringify({ storyId: props.storyId, characterId: character.characterId }) 
            });
            const data = await response.json();
            if (data.message) alert(data.message);
            else window.location.reload(); 
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [isLoading, character, props.storyId]);

    const handleTravel = useCallback(async (targetId: string) => {
        if (!character) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/travel', { 
                method: 'POST', 
                body: JSON.stringify({ storyId: props.storyId, targetLocationId: targetId, characterId: character.characterId }) 
            });
            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.error);
            }
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    }, [character, props.storyId]);

    // const handleDeleteChar = async (charId: string, e: React.MouseEvent) => {
    //     e.stopPropagation(); // Prevent clicking the card itself
    //     if (!confirm("Permanently delete this character? This cannot be undone.")) return;
        
    //     try {
    //         await fetch('/api/character/delete', {
    //             method: 'DELETE',
    //             body: JSON.stringify({ storyId: props.storyId, characterId: charId })
    //         });
    //         window.location.reload();
    //     } catch (err) { console.error(err); }
    // };

    const handleExit = useCallback(() => {
        // Add ?menu=true to force the server to show the lobby
        // even if we only have one character.
        window.location.href = `/play/${props.storyId}?menu=true`;
    }, [props.storyId]);

    
    // --- RENDER ---

    // 1. LOBBY VIEW
    if (!character) {
        return (
                <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper">
                <CharacterLobby 
                    availableCharacters={props.availableCharacters} 
                    storyId={props.storyId}
                    imageLibrary={props.imageLibrary || {}}
                    locations={props.locations || {}}
                    settings={props.settings}
                    initialCharacter={props.initialCharacter}
                    systemMessage={props.systemMessage}
                />
            </div>
        );
    }

    if (!location) return <div>Loading location data...</div>;
    
    const worldConfig: WorldConfig = {
        settings: props.settings, qualities: props.qualityDefs, decks: props.deckDefs,
        locations: props.locations, regions: props.regions, images: props.imageLibrary,
        categories: props.categories || {}, char_create: {}, markets: props.markets,
    };
    const renderEngine = new GameEngine(character.qualities, worldConfig, character.equipment, props.worldState);
    
    // Render the active event using the LATEST character state
    const renderedActiveEvent = activeEvent ? renderEngine.renderStorylet(activeEvent) : null;

    // --- CALCULATE DECK STATS ---
    let currentDeckStats = undefined;

    if (character && location) {
        // FIX: Construct a WorldConfig object from the individual props
        const worldConfig = {
            settings: props.settings,
            qualities: props.qualityDefs,
            decks: props.deckDefs,
            locations: props.locations,
            regions: props.regions,
            images: props.imageLibrary,
            categories: props.categories,
            char_create: {}, 
            markets: props.markets,
        };

        // Pass the full config to the engine
        const engine = new GameEngine(character.qualities, worldConfig, character.equipment, props.worldState);
        
        let currentDeckStats;
        const deckDef = props.deckDefs[location.deck];
        if (deckDef) {
            const handVal = renderEngine.evaluateText(`{${deckDef.hand_size || 3}}`);
            const handSize = parseInt(handVal, 10) || 3;
            const deckVal = renderEngine.evaluateText(`{${deckDef.deck_size || 0}}`);
            const deckSize = parseInt(deckVal, 10) || 0;
            currentDeckStats = { handSize, deckSize };
        }
    }

    const locationMarket = location?.marketId;
    const regionMarket = (location?.regionId && props.regions[location.regionId]) ? props.regions[location.regionId].marketId : null;
    const activeMarketId = locationMarket || regionMarket || undefined;
    const activeMarketDefinition = activeMarketId && props.markets[activeMarketId] ? props.markets[activeMarketId] : null;

    const layoutProps: LayoutProps = {
        character, location, hand, isLoading, storyId: props.storyId,
        activeEvent: renderedActiveEvent, // Pass the newly rendered event
        
        // Pass down all definitions and handlers
        qualityDefs: props.qualityDefs, storyletDefs: props.storyletDefs, opportunityDefs: props.opportunityDefs,
        settings: props.settings, imageLibrary: props.imageLibrary, categories: props.categories,
        locationStorylets: props.locationStorylets, deckDefs: props.deckDefs, currentDeckStats,
        currentMarketId: activeMarketId, 
        
        onOptionClick: showEvent,
        onDrawClick: handleDrawCard,
        onEventFinish: handleEventFinish,
        onQualitiesUpdate: handleQualitiesUpdate,
        onCardPlayed: handleCardPlayed,
        onOpenMap: () => setShowMap(true),
        onOpenMarket: () => setShowMarket(true),
        onExit: handleExit,

        showMarket: showMarket,
        activeMarket: activeMarketDefinition,
        onCloseMarket: () => setShowMarket(false),
        worldState: props.worldState
    };

    const style = props.settings.layoutStyle || 'nexus';
    const renderLayout = () => {
        switch (style) {
            case 'london': return <LondonLayout {...layoutProps} />;
            case 'elysium': return <ElysiumLayout {...layoutProps} />;
            case 'tabletop': return <TabletopLayout {...layoutProps} />;
            default: return <NexusLayout {...layoutProps} />;
        }
    };

    return (
        <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            {renderLayout()}
            {showMap && (
                <MapModal 
                    currentLocationId={character.currentLocationId}
                    locations={props.locations} regions={props.regions}
                    imageLibrary={props.imageLibrary}
                    onTravel={handleTravel} onClose={() => setShowMap(false)}
                />
            )}
        </div>
    );
}


