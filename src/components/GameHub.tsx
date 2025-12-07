'use client';

import { useState, useCallback, useEffect } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion, DeckDefinition, MarketDefinition, SystemMessage } from '@/engine/models';
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
}

export default function GameHub(props: GameHubProps) {
    
    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    const [location, setLocation] = useState<LocationDefinition | null>(props.initialLocation);
    const [hand, setHand] = useState<Opportunity[]>(props.initialHand);
    
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showMarket, setShowMarket] = useState(false);

    // Sync state when Server Component sends new data
    useEffect(() => {
        if (props.initialCharacter) {
            setCharacter(props.initialCharacter);
            setLocation(props.initialLocation);
            setHand(props.initialHand);
            setShowMap(false); 
        }
    }, [props.initialCharacter, props.initialLocation, props.initialHand]);


    // --- HANDLERS ---
    const handleDismissMessage = async () => {
        if (!props.systemMessage || !character) return;
        try {
            await fetch('/api/character/acknowledge-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: character.characterId, messageId: props.systemMessage.id })
            });
        } catch (e) { console.error(e); }
    };

    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) { setActiveEvent(null); return; }
        setIsLoading(true);
        try {
            // FIX 2: Use props.locationStorylets
            const preloadedEvent = props.locationStorylets.find(s => s.id === eventId) || hand.find(o => o.id === eventId);
            if (preloadedEvent) {
                setActiveEvent(preloadedEvent);
            } else {
                const response = await fetch(`/api/storylet/${eventId}?storyId=${props.storyId}`);
                if (!response.ok) throw new Error(`Event ${eventId} not found.`);
                const eventData = await response.json();
                setActiveEvent(eventData);
            }
        } catch (error) { console.error(error); setActiveEvent(null); } finally { setIsLoading(false); }
    }, [hand, props.locationStorylets, props.storyId]); 

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

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string) => {
        if (character) {
            setCharacter({ ...character, qualities: newQualities });
        }
        showEvent(redirectId ?? null);
    }, [character, showEvent]);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        if (character) {
            setCharacter({ ...character, qualities: newQualities });
        }
    }, [character]);

    const handleCardPlayed = useCallback((cardId: string) => {
        setHand(prev => prev.filter(c => c.id !== cardId));
    }, []);

    const handleDeleteChar = async (charId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent clicking the card itself
        if (!confirm("Permanently delete this character? This cannot be undone.")) return;
        
        try {
            await fetch('/api/character/delete', {
                method: 'DELETE',
                body: JSON.stringify({ storyId: props.storyId, characterId: charId })
            });
            window.location.reload();
        } catch (err) { console.error(err); }
    };

    const handleExit = useCallback(() => {
        // Add ?menu=true to force the server to show the lobby
        // even if we only have one character.
        window.location.href = `/play/${props.storyId}?menu=true`;
    }, [props.storyId]);

    
    // --- RENDER ---

    // 1. LOBBY VIEW
    if (!character) {
        // Use the theme from settings
        const theme = props.settings.visualTheme || 'default';
        
        return (
            <div 
                className="theme-wrapper" 
                data-theme={theme} 
                style={{ 
                    minHeight: '100vh', 
                    width: '100vw',
                    background: 'var(--bg-main)', // Loads theme background (image/color)
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    position: 'fixed', // Lock to screen
                    top: 0, left: 0
                }}
            >
                {props.systemMessage && (
                    <SystemMessageBanner 
                        message={props.systemMessage} 
                        type="world" 
                        onDismiss={handleDismissMessage} 
                    />
                )}

                {/* Overlay for readability if background is busy */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 0 }} />
                
                <div style={{ 
                    width: '100%', maxWidth: '500px', padding: '2rem', 
                    zIndex: 10, position: 'relative',
                    background: 'var(--bg-panel)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <h1 style={{ 
                        textAlign: 'center', marginBottom: '2rem', marginTop: 0,
                        color: 'var(--text-primary)', fontFamily: 'var(--font-main)',
                        textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.5rem'
                    }}>
                        Select Character
                    </h1>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {props.availableCharacters.map((c, index) => (
                            <button 
                                key={c.characterId || index} 
                                onClick={() => window.location.href = `/play/${props.storyId}?charId=${c.characterId}`}
                                className="option-button" // Use standard class for hover effects
                                style={{ 
                                    padding: '1rem', 
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    textAlign: 'left', width: '100%'
                                }}
                            >
                                {/* PORTRAIT */}
                                <div style={{ 
                                    width: '60px', height: '60px', borderRadius: '50%', 
                                    overflow: 'hidden', border: '2px solid var(--accent-primary)',
                                    flexShrink: 0, background: '#000'
                                }}>
                                    <GameImage 
                                        code={c.portrait || "default_avatar"} 
                                        imageLibrary={props.imageLibrary} 
                                        type="portrait" 
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--accent-highlight)', fontSize: '1.1rem' }}>
                                        {c.name}
                                    </h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {props.locations[c.currentLocationId]?.name || "Unknown Location"}
                                    </p>
                                </div>
                                
                                {/* DELETE BUTTON */}
                                <div 
                                    onClick={(e) => handleDeleteChar(c.characterId, e)}
                                    style={{ 
                                        color: 'var(--danger-color)', padding: '0.5rem', 
                                        cursor: 'pointer', fontSize: '1.2rem', opacity: 0.6
                                    }}
                                    title="Delete Save"
                                    className="hover:opacity-100"
                                >
                                    ✕
                                </div>
                            </button>
                        ))}
                        
                        <button 
                            onClick={() => window.location.href = `/play/${props.storyId}/creation`}
                            className="option-button"
                            style={{ 
                                border: '2px dashed var(--border-color)', 
                                background: 'transparent', 
                                color: 'var(--text-muted)', 
                                textAlign: 'center', justifyContent: 'center',
                                padding: '1rem'
                            }}
                        >
                            + Create New Character
                        </button>
                    </div>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button 
                            onClick={() => window.location.href = '/'}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!location) return <div>Loading location data...</div>;
    
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
        
        const deckDef = props.deckDefs[location.deck];
        
        if (deckDef) {
            // Parse Hand Size
            const handVal = engine.evaluateText(`{${deckDef.hand_size || 3}}`);
            const handSize = parseInt(handVal, 10) || 3;

            // Parse Deck Size
            const deckVal = engine.evaluateText(`{${deckDef.deck_size || 0}}`);
            const deckSize = parseInt(deckVal, 10) || 0;

            currentDeckStats = { handSize, deckSize };
        }
    }

    const locationMarket = location?.marketId;
    const regionMarket = (location?.regionId && props.regions[location.regionId]) 
        ? props.regions[location.regionId].marketId 
        : null;
    
    const activeMarketId = locationMarket || regionMarket || undefined;
    
    const activeMarketDefinition = activeMarketId && props.markets[activeMarketId] ? props.markets[activeMarketId] : null;

    // FIX 3: Use props.PropertyName for values not in local scope
    const layoutProps: LayoutProps = {
        character,
        location, 
        hand,
        activeEvent,
        isLoading,
        
        qualityDefs: props.qualityDefs,
        storyletDefs: props.storyletDefs,
        opportunityDefs: props.opportunityDefs,
        settings: props.settings,
        imageLibrary: props.imageLibrary,
        categories: props.categories,
        locationStorylets: props.locationStorylets, 
        storyId: props.storyId,
        deckDefs: props.deckDefs,
        currentDeckStats,
        currentMarketId: activeMarketId, // <--- THIS MUST BE HER

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
        
        <div 
            data-theme={props.settings.visualTheme || 'default'} 
            className="theme-wrapper"
            style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}
        >
            {renderLayout()}
            
            {showMap && (
                <MapModal 
                    currentLocationId={character.currentLocationId}
                    locations={props.locations}
                    regions={props.regions}
                    imageLibrary={props.imageLibrary}
                    onTravel={handleTravel}
                    onClose={() => setShowMap(false)}
                />
            )}
        </div>
    );
}