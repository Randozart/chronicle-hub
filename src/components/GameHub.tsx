'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion, DeckDefinition, MarketDefinition, SystemMessage, WorldConfig } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import ElysiumLayout from './layouts/ElysiumLayout';
import TabletopLayout from './layouts/TabletopLayout';
import MapModal from './MapModal';
import { GameEngine } from '@/engine/gameEngine';
import CharacterLobby from './CharacterLobby';

// Component Imports
import CharacterSheet from './CharacterSheet';
import LocationHeader from './LocationHeader';
import LocationStorylets from './LocationStorylets';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay from './StoryletDisplay';
import ProfilePanel from './ProfilePanel';
import Possessions from './Possessions';
import ActionTimer from './ActionTimer';
import WalletHeader from './WalletHeader';
import MarketInterface from './MarketInterface';
import GameImage from '@/components/GameImage';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';

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
    worldState: PlayerQualities;
    systemMessage?: SystemMessage | null;
    activeEvent?: Storylet | Opportunity | null;
    instruments?: Record<string, InstrumentDefinition>;
    musicTracks?: Record<string, LigatureTrack>;
}

export default function GameHub(props: GameHubProps) {
    // --- STATE ---
    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    const [location, setLocation] = useState<LocationDefinition | null>(props.initialLocation);
    const [hand, setHand] = useState<Opportunity[]>(props.initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showMarket, setShowMarket] = useState(false);
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');
    const { playTrack } = useAudio(); 
    
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        setCharacter(props.initialCharacter);
        setLocation(props.initialLocation);
        setHand(props.initialHand);
        setActiveEvent(props.activeEvent || null); 
        setShowMap(false);
        setShowMarket(false);
    }, [props.initialCharacter, props.initialLocation, props.initialHand, props.activeEvent]);

    useEffect(() => {
        if (!character || !location) return;
        
        if (character.currentLocationId !== location.id) {
            const newLoc = props.locations[character.currentLocationId];
            if (newLoc) {
                setIsTransitioning(true);
                setTimeout(() => {
                    setLocation(newLoc);
                    setTimeout(() => setIsTransitioning(false), 500); 
                }, 150);
            }
        }
    }, [character, location, props.locations]);


    // --- HANDLERS ---
    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) { setActiveEvent(null); return; }
        setIsLoading(true);
        try {
            if (!character) return;
            const response = await fetch(`/api/storylet/${eventId}?storyId=${props.storyId}&characterId=${character.characterId}`);
            if (!response.ok) throw new Error(`Event ${eventId} not found.`);
            const rawEventData = await response.json();
            setActiveEvent(rawEventData);
        } catch (error) { console.error(error); setActiveEvent(null); } finally { setIsLoading(false); }
    }, [props.storyId, character]);

    useEffect(() => {
        const trackId = (location as any)?.musicTrackId; 
        if (trackId && props.musicTracks && props.musicTracks[trackId]) {
            const trackSource = props.musicTracks[trackId].source;
            const instrumentList = props.instruments ? Object.values(props.instruments) : [];
            playTrack(trackSource, instrumentList);
        }
    }, [location, props.musicTracks, props.instruments, playTrack]);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prev => prev ? { ...prev, qualities: newQualities } : null);
    }, []);
    
    const handleCharacterUpdate = useCallback((newCharacterState: CharacterDocument) => {
        setCharacter(newCharacterState);
    }, []);

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string, moveToId?: string) => {
        setCharacter(prev => {
            if (!prev) return null;
            const newChar = { ...prev, qualities: newQualities };
            if (moveToId) {
                newChar.currentLocationId = moveToId;
            }
            return newChar;
        });
        showEvent(redirectId ?? null);
    }, [showEvent]);

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
                method: 'POST', body: JSON.stringify({ storyId: props.storyId, targetLocationId: targetId, characterId: character.characterId }) 
            });
            const data = await res.json();
            
            if (data.success) {
                window.location.reload();
            } else {
                alert(data.error);
                setIsLoading(false);
            }
        } catch(e) { 
            console.error(e); 
            setIsLoading(false);
        } 
    }, [character, props.storyId]);

    const handleExit = useCallback(() => {
        window.location.href = `/play/${props.storyId}?menu=true`;
    }, [props.storyId]);


    // --- LOBBY & LOADING ---
    if (!character) {
        return (
            <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper">
                <CharacterLobby availableCharacters={props.availableCharacters} storyId={props.storyId} imageLibrary={props.imageLibrary || {}} locations={props.locations || {}} settings={props.settings} initialCharacter={props.initialCharacter} systemMessage={props.systemMessage} />
            </div>
        );
    }
    if (!location) return <div>Loading location data...</div>;

    // --- ENGINE INIT ---
    const mergedQualityDefs = {
        ...props.qualityDefs,
        ...(character.dynamicQualities || {})
    };

    const worldConfig: WorldConfig = {
        settings: props.settings, 
        qualities: mergedQualityDefs, 
        decks: props.deckDefs,
        locations: props.locations, 
        regions: props.regions, 
        images: props.imageLibrary,
        categories: props.categories || {}, 
        char_create: {}, 
        markets: props.markets,
        instruments: props.instruments || {},
        music: props.musicTracks || {},
    };
    
    // Engine instance
    const renderEngine = new GameEngine(character.qualities, worldConfig, character.equipment, props.worldState);
    const displayQualities = renderEngine.getDisplayState();

    const visibleStorylets = useMemo(() => {
        if (!character || !location) return [];
        
        return Object.values(props.storyletDefs)
            .filter(s => {
                if (s.location !== character.currentLocationId) return false;
                return renderEngine.evaluateCondition(s.visible_if);
            })
            .sort((a, b) => (a.ordering || 0) - (b.ordering || 0));
            
    }, [character, location, props.storyletDefs, renderEngine]);

    // Render Data
    const renderedLocation = renderEngine.render(location);
    let renderedActiveEvent = activeEvent ? renderEngine.renderStorylet(activeEvent) : null;
    
    if (renderedActiveEvent && renderedActiveEvent.options) {
        renderedActiveEvent = {
            ...renderedActiveEvent,
            options: renderedActiveEvent.options.filter(opt => {
                return renderEngine.evaluateCondition(opt.visible_if);
            })
        };
    }

    // Deck Logic
    const deckDef = location?.deck ? props.deckDefs[location.deck] : null;
    const shouldShowDeck = !!deckDef;
    let currentDeckStats = undefined;
    if (deckDef) {
        const handVal = renderEngine.evaluateText(`{${deckDef.hand_size || 3}}`);
        const deckVal = renderEngine.evaluateText(`{${deckDef.deck_size || 0}}`);
        currentDeckStats = { handSize: parseInt(handVal, 10) || 3, deckSize: parseInt(deckVal, 10) || 0 };
    }

    // Market Data
    const locationMarket = location?.marketId;
    const regionMarket = (location?.regionId && props.regions[location.regionId]) ? props.regions[location.regionId].marketId : null;
    const activeMarketId = locationMarket || regionMarket || undefined;
    const activeMarketDefinition = activeMarketId && props.markets[activeMarketId] ? props.markets[activeMarketId] : null;

    // Action Points
    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;

    // --- HELPER COMPONENT: TAB BAR ---
    const TabBar = () => (
        <div className="tab-bar">
            <button onClick={() => setActiveTab('story')} data-tab-id="story" className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}>Story</button>
            <button onClick={() => setActiveTab('possessions')} data-tab-id="possessions" className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`}>Possessions</button>
            <button onClick={() => setActiveTab('profile')} data-tab-id="profile" className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}>Myself</button>
        </div>
    );

    // --- CONTENT BUILDERS ---
    const sidebarTab = props.settings.tabLocation === 'sidebar';

    const buildSidebar = () => {
        
        if (sidebarTab) {
            return (
                <div className="sidebar-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="sidebar-content-scroll">
                        <TabBar /> 
                        <div className="action-box">
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{currentActions} / {maxActions}</h3>
                            <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                        </div>
                        <CharacterSheet 
                            qualities={character.qualities} 
                            equipment={character.equipment} 
                            qualityDefs={mergedQualityDefs} 
                            settings={props.settings} 
                            categories={props.categories}
                            engine={renderEngine} 
                        />                    
                    </div>
                    <div className="sidebar-footer">
                        <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                    </div>
                </div>
            );
        }

        return (
            <div className="sidebar-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="sidebar-header">
                    <WalletHeader qualities={character.qualities} qualityDefs={mergedQualityDefs} settings={props.settings} imageLibrary={props.imageLibrary} />
                </div>
                <div className="sidebar-content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="action-box">
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                    </div>
                    <CharacterSheet 
                        qualities={character.qualities} 
                        equipment={character.equipment} 
                        qualityDefs={mergedQualityDefs} 
                        settings={props.settings} 
                        categories={props.categories}
                        engine={renderEngine}
                    />
                </div>
                <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                </div>
            </div>
        );
    };

    const buildMainContent = () => {
        const headerStyle = props.settings.locationHeaderStyle || 'standard';
        const isBannerMode = headerStyle === 'banner';
        
        // @ts-ignore - Engine renders generic objects
        const imageCode = renderedLocation?.imageId || renderedLocation?.image;

        let innerContent = null;

        // --- Reusable Header Rendering Logic ---
        const renderHeader = () => {
            if (headerStyle === 'hidden') return null;
            
            if (isBannerMode) {
                return (
                    <div className={`location-wrapper mode-banner`}>
                        {imageCode && (
                            <div className="banner-bg-layer">
                                <GameImage 
                                    code={imageCode} 
                                    type="location" 
                                    imageLibrary={props.imageLibrary} 
                                    className="banner-img" 
                                />
                            </div>
                        )}
                        <LocationHeader 
                            location={renderedLocation!} 
                            imageLibrary={props.imageLibrary} 
                            onOpenMap={() => setShowMap(true)} 
                            onOpenMarket={activeMarketId ? () => setShowMarket(true) : undefined} 
                            styleMode={headerStyle} 
                        />
                    </div>
                );
            }

            return (
                <div className="location-header-wrapper">
                    <LocationHeader 
                        location={renderedLocation!} 
                        imageLibrary={props.imageLibrary} 
                        onOpenMap={() => setShowMap(true)} 
                        onOpenMarket={activeMarketId ? () => setShowMarket(true) : undefined} 
                        styleMode={headerStyle}
                    />
                </div>
            );
        };

        if (activeTab === 'profile') {
            innerContent = (
                <div className="content-panel">
                    <ProfilePanel 
                        qualities={displayQualities} 
                        qualityDefs={mergedQualityDefs} 
                        imageLibrary={props.imageLibrary} 
                        categories={props.categories} 
                        settings={props.settings} 
                    />
                </div>
            );
        } else if (activeTab === 'possessions') {
            innerContent = (
                <div className="content-panel">
                    <Possessions 
                        qualities={character.qualities} 
                        equipment={character.equipment} 
                        qualityDefs={mergedQualityDefs} 
                        equipCategories={props.settings.equipCategories || []} 
                        onUpdateCharacter={handleCharacterUpdate} 
                        storyId={props.storyId} 
                        imageLibrary={props.imageLibrary} 
                        settings={props.settings} 
                        engine={renderEngine} 
                    />
                </div>
            );
        } else if (isLoading) {
            innerContent = <div className="loading-container"><p>Loading...</p></div>;
        } else if (showMarket && activeMarketId) {
            innerContent = (
                <div className="content-panel">
                    <MarketInterface market={props.markets[activeMarketId]!} qualities={character.qualities} qualityDefs={mergedQualityDefs} imageLibrary={props.imageLibrary} settings={props.settings} onClose={() => setShowMarket(false)} onUpdate={handleQualitiesUpdate} storyId={props.storyId} characterId={character.characterId} worldState={props.worldState} />
                </div>
            );
        } else if (renderedActiveEvent) {
             const showHeaderInStorylet = props.settings.showHeaderInStorylet === true;

            innerContent = (
                <div className="event-view">
                    {showHeaderInStorylet && renderHeader()}

                    <StoryletDisplay 
                        eventData={renderedActiveEvent} 
                        qualities={character.qualities} 
                        onFinish={handleEventFinish} 
                        onQualitiesUpdate={handleQualitiesUpdate} 
                        onCardPlayed={handleCardPlayed} 
                        qualityDefs={mergedQualityDefs} 
                        storyletDefs={props.storyletDefs} 
                        opportunityDefs={props.opportunityDefs} 
                        settings={props.settings} 
                        imageLibrary={props.imageLibrary} 
                        categories={props.categories} 
                        storyId={props.storyId} 
                        characterId={character.characterId} 
                    />
                </div>
            );
        } else {
            innerContent = (
                <div className="hub-view">
                    {renderHeader()}

                    {/* --- FIX: HIDE ACTIONS IF NO STORYLETS --- */}
                    {visibleStorylets.length > 0 && (
                        <div className="storylet-feed" style={{ marginTop: '2rem' }}>
                            <LocationStorylets 
                                storylets={visibleStorylets} 
                                onStoryletClick={showEvent} 
                                qualities={character.qualities} 
                                qualityDefs={mergedQualityDefs} 
                                imageLibrary={props.imageLibrary} 
                            />
                        </div>
                    )}

                    {/* --- FIX: HIDE OPPORTUNITIES IF NO DECK --- */}
                    {shouldShowDeck && (
                        <div className="deck-feed" style={{ marginTop: '3rem' }}>
                            <OpportunityHand 
                                hand={hand} 
                                onCardClick={showEvent} 
                                onDrawClick={handleDrawCard} 
                                isLoading={isLoading} 
                                qualities={character.qualities} 
                                qualityDefs={mergedQualityDefs} 
                                imageLibrary={props.imageLibrary} 
                                character={character} 
                                locationDeckId={location!.deck} 
                                deckDefs={props.deckDefs} 
                                settings={props.settings} 
                                currentDeckStats={currentDeckStats} 
                            />
                        </div>
                    )}
                </div>
            );
        }
        if (!sidebarTab) {
            return (
                <div className="main-content-wrapper">
                    <div className="tab-container" style={{ marginBottom: '2rem' }}><TabBar /></div>
                    {innerContent}
                </div>
            );
        } else {
            return (
                <div className="main-content-wrapper">
                    {innerContent}
                </div>
            );
        }
    };

    const renderLayout = () => {
        const layoutProps = {
            sidebarContent: buildSidebar(),
            mainContent: buildMainContent(),
            settings: props.settings,
            location: renderedLocation!,
            imageLibrary: props.imageLibrary,
            onExit: handleExit,
            onOpenMap: () => setShowMap(true),
            onOpenMarket: () => setShowMarket(true),
            currentMarketId: activeMarketId,
            isTransitioning: isTransitioning
        };

        switch (props.settings.layoutStyle) {
            case 'london': return <LondonLayout {...layoutProps} />;
            case 'elysium': return <ElysiumLayout {...layoutProps} />; 
            case 'tabletop': return <TabletopLayout {...layoutProps} />;
            default: return <NexusLayout {...layoutProps} />;
        }
    };
    return ( 
        <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            {renderLayout()}
            {showMap && <MapModal currentLocationId={character.currentLocationId} locations={props.locations} regions={props.regions} imageLibrary={props.imageLibrary} onTravel={handleTravel} onClose={() => setShowMap(false)} />}
        </div>
    );
}