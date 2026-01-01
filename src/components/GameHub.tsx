'use client';

import { useState, useCallback, useEffect } from 'react';
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

    useEffect(() => {
        setCharacter(props.initialCharacter);
        setLocation(props.initialLocation);
        setHand(props.initialHand);
        setActiveEvent(props.activeEvent || null); 
        setShowMap(false);
        setShowMarket(false);
    }, [props.initialCharacter, props.initialLocation, props.initialHand, props.activeEvent]);

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
        const trackId = (location as any).musicTrackId; 
        if (trackId && props.musicTracks && props.musicTracks[trackId]) {
            const trackSource = props.musicTracks[trackId].source;
            const instrumentList = props.instruments ? Object.values(props.instruments) : [];
            playTrack(trackSource, instrumentList);
        }
    }, [location, props.musicTracks, props.instruments]);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prev => prev ? { ...prev, qualities: newQualities } : null);
    }, []);
    
    const handleCharacterUpdate = useCallback((newCharacterState: CharacterDocument) => {
        setCharacter(newCharacterState);
    }, []);

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string) => {
        setCharacter(prev => prev ? { ...prev, qualities: newQualities } : null);
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
            if (data.success) window.location.reload(); else alert(data.error);
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    }, [character, props.storyId]);

    const handleExit = useCallback(() => {
        window.location.href = `/play/${props.storyId}?menu=true`;
    }, [props.storyId]);


    if (!character) {
        return (
            <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper">
                <CharacterLobby availableCharacters={props.availableCharacters} storyId={props.storyId} imageLibrary={props.imageLibrary || {}} locations={props.locations || {}} settings={props.settings} initialCharacter={props.initialCharacter} systemMessage={props.systemMessage} />
            </div>
        );
    }
    if (!location) return <div>Loading location data...</div>;

    const worldConfig: WorldConfig = {
        settings: props.settings, 
        qualities: props.qualityDefs, 
        decks: props.deckDefs,
        locations: props.locations, 
        regions: props.regions, 
        images: props.imageLibrary,
        categories: props.categories || {}, 
        char_create: {}, 
        markets: props.markets,
        instruments: props.instruments || {},
        music: props.musicTracks || {}
    };
    
    const renderEngine = new GameEngine(character.qualities, worldConfig, character.equipment, props.worldState);
    const renderedLocation = renderEngine.render(location);
    const renderedActiveEvent = activeEvent ? renderEngine.renderStorylet(activeEvent) : null;

    let currentDeckStats = undefined;
    const deckDef = props.deckDefs[location.deck];
    if (deckDef) {
        const handVal = renderEngine.evaluateText(`{${deckDef.hand_size || 3}}`);
        const deckVal = renderEngine.evaluateText(`{${deckDef.deck_size || 0}}`);
        currentDeckStats = { handSize: parseInt(handVal, 10) || 3, deckSize: parseInt(deckVal, 10) || 0 };
    }

    const locationMarket = location?.marketId;
    const regionMarket = (location?.regionId && props.regions[location.regionId]) ? props.regions[location.regionId].marketId : null;
    const activeMarketId = locationMarket || regionMarket || undefined;
    const activeMarketDefinition = activeMarketId && props.markets[activeMarketId] ? props.markets[activeMarketId] : null;

    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;

    const TabBar = () => (
        <div className="tab-bar">
            <button onClick={() => setActiveTab('story')} data-tab-id="story" className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}>Story</button>
            <button onClick={() => setActiveTab('possessions')} data-tab-id="possessions" className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`}>Possessions</button>
            <button onClick={() => setActiveTab('profile')} data-tab-id="profile" className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}>Myself</button>
        </div>
    );

    // --- CONTENT BUILDERS ---

    const buildSidebar = () => {
        const isBlackCrown = props.settings.visualTheme === 'black-crown';
        
        if (isBlackCrown) {
            return (
                <div className="sidebar-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="sidebar-content-scroll">
                        <TabBar /> 
                        <div className="action-box">
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{currentActions} / {maxActions}</h3>
                            <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                        </div>
                        <CharacterSheet qualities={character.qualities} equipment={character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                    </div>
                    <div className="sidebar-footer">
                        <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                    </div>
                </div>
            );
        }

        // Default Sidebar
        return (
            <div className="sidebar-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="sidebar-header">
                    <WalletHeader qualities={character.qualities} qualityDefs={props.qualityDefs} settings={props.settings} imageLibrary={props.imageLibrary} />
                </div>
                <div className="sidebar-content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="action-box">
                        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{currentActions} / {maxActions}</h3>
                        <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} onRegen={() => {}} />
                    </div>
                    <CharacterSheet qualities={character.qualities} equipment={character.equipment} qualityDefs={props.qualityDefs} settings={props.settings} categories={props.categories} />
                </div>
                <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                </div>
            </div>
        );
    };

    const buildMainContent = () => {
        const isBlackCrown = props.settings.visualTheme === 'black-crown';
        const isBannerMode = isBlackCrown && props.settings.locationHeaderStyle === 'banner';
        // @ts-ignore
        const imageCode = renderedLocation?.imageId || renderedLocation?.image;

        let innerContent = null;

        if (activeTab === 'profile') {
            innerContent = (
                <div className="content-panel">
                    <ProfilePanel qualities={character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} categories={props.categories} settings={props.settings} />
                </div>
            );
        } else if (activeTab === 'possessions') {
            innerContent = (
                <div className="content-panel">
                    <Possessions qualities={character.qualities} equipment={character.equipment} qualityDefs={props.qualityDefs} equipCategories={props.settings.equipCategories || []} onUpdateCharacter={handleCharacterUpdate} storyId={props.storyId} imageLibrary={props.imageLibrary} settings={props.settings} />
                </div>
            );
        } else if (isLoading) {
            innerContent = <div className="loading-container"><p>Loading...</p></div>;
        } else if (showMarket && activeMarketDefinition) {
            innerContent = (
                <div className="content-panel">
                    <MarketInterface market={activeMarketDefinition} qualities={character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} settings={props.settings} onClose={() => setShowMarket(false)} onUpdate={handleQualitiesUpdate} storyId={props.storyId} characterId={character.characterId} worldState={props.worldState} />
                </div>
            );
        } else if (renderedActiveEvent) {
            innerContent = (
                <div className="event-view">
                    {isBlackCrown && (
                        <div className={`location-wrapper mode-${props.settings.locationHeaderStyle || 'standard'}`}>
                            {isBannerMode && imageCode && (
                                <div className="banner-bg-layer">
                                    <GameImage code={imageCode} type="location" imageLibrary={props.imageLibrary} className="banner-img" />
                                </div>
                            )}
                            <LocationHeader location={renderedLocation!} imageLibrary={props.imageLibrary} onOpenMap={() => setShowMap(true)} onOpenMarket={activeMarketId ? () => setShowMarket(true) : undefined} />
                        </div>
                    )}
                    <StoryletDisplay eventData={renderedActiveEvent} qualities={character.qualities} onFinish={handleEventFinish} onQualitiesUpdate={handleQualitiesUpdate} onCardPlayed={handleCardPlayed} qualityDefs={props.qualityDefs} storyletDefs={props.storyletDefs} opportunityDefs={props.opportunityDefs} settings={props.settings} imageLibrary={props.imageLibrary} categories={props.categories} storyId={props.storyId} characterId={character.characterId} />
                </div>
            );
        } else {
            innerContent = (
                <div className="hub-view">
                    {isBlackCrown && (
                        <div className={`location-wrapper mode-${props.settings.locationHeaderStyle || 'standard'}`}>
                            {isBannerMode && imageCode && (
                                <div className="banner-bg-layer">
                                    <GameImage code={imageCode} type="location" imageLibrary={props.imageLibrary} className="banner-img" />
                                </div>
                            )}
                            <LocationHeader location={renderedLocation!} imageLibrary={props.imageLibrary} onOpenMap={() => setShowMap(true)} onOpenMarket={activeMarketId ? () => setShowMarket(true) : undefined} />
                        </div>
                    )}
                    <div className="storylet-feed" style={{ marginTop: '2rem' }}>
                        <LocationStorylets storylets={props.locationStorylets} onStoryletClick={showEvent} qualities={character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} />
                    </div>
                    <div className="deck-feed" style={{ marginTop: '3rem' }}>
                        <OpportunityHand hand={hand} onCardClick={showEvent} onDrawClick={handleDrawCard} isLoading={isLoading} qualities={character.qualities} qualityDefs={props.qualityDefs} imageLibrary={props.imageLibrary} character={character} locationDeckId={location!.deck} deckDefs={props.deckDefs} settings={props.settings} currentDeckStats={currentDeckStats} />
                    </div>
                </div>
            );
        }

        return (
            <div className="main-content-wrapper" style={{ maxWidth: '1600px', margin: '0 auto', width: '100%' }}>
                {!isBlackCrown && <div className="tab-container" style={{ marginBottom: '2rem' }}><TabBar /></div>}
                {innerContent}
            </div>
        );
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
            currentMarketId: activeMarketId
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