'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion, DeckDefinition, MarketDefinition, SystemMessage, WorldConfig } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import ElysiumLayout from './layouts/ElysiumLayout';
import TabletopLayout from './layouts/TabletopLayout';
import MapModal from './MapModal';
import { GameEngine } from '@/engine/gameEngine';
import CharacterLobby from './CharacterLobby';
import CharacterSheet from './CharacterSheet';
import LocationHeader from './LocationHeader';
import LocationStorylets from './LocationStorylets';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay, { ResolutionState } from './StoryletDisplay'; 
import ProfilePanel from './ProfilePanel';
import Possessions from './Possessions';
import ActionTimer from './ActionTimer';
import WalletHeader from './WalletHeader';
import MarketInterface from './MarketInterface';
import GameImage from '@/components/GameImage';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import { useAudio } from '@/providers/AudioProvider';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import CharacterInspector from '@/app/create/[storyId]/players/components/CharacterInspector';
import { ToastProvider } from '@/providers/ToastProvider';
import GameModal from './GameModal';
import LivingStories from './LivingStories';
import { useTheme } from '@/providers/ThemeProvider';


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
    isPlaytesting?: boolean;
}

const PlaytestLogger = ({ logs, onClear }: { logs: { message: string, type: string }[], onClear: () => void }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const typeColor: Record<string, string> = {
        'EVAL': 'var(--accent-highlight)',
        'COND': 'var(--warning-color)',
        'FX': 'var(--success-color)'
    };

    return (
        <div style={{
            position: 'fixed', bottom: 20, left: 20, width: '450px', height: '300px',
            background: 'var(--bg-panel)', border: '1px solid var(--tool-border)',
            borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-modal)',
            zIndex: 10000, display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--tool-border)'}}>
                <h4 style={{ margin: 0, color: 'var(--tool-text-header)'}}>ScribeScript Live Log</h4>
                <button onClick={onClear} style={{ background: 'var(--bg-item)', border: '1px solid var(--tool-border)', color: 'var(--tool-text-dim)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            </div>
            <div ref={logContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {logs.map((log, index) => (
                    <div key={index} style={{ display: 'flex', borderBottom: '1px solid var(--tool-bg-header)' }}>
                        <span style={{ color: typeColor[log.type] || 'var(--tool-text-dim)', padding: '4px 8px', flexShrink: 0 }}>[{log.type}]</span>
                        <pre style={{ margin: 0, padding: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--tool-text-main)' }}>{log.message}</pre>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ZoomControls = () => {
    const { zoom, setZoom } = useTheme();
    
    const btnStyle = {
        background: 'transparent',
        border: '1px solid var(--border-light)',
        color: 'var(--text-secondary)',
        borderRadius: '4px',
        width: '32px', height: '32px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.9rem',
        padding: 0
    };

    return (
        <div className="theme-zoom-controls" style={{ display: 'flex', gap: '2px', background: 'var(--bg-item)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button 
                onClick={() => setZoom(zoom - 10)}
                style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                title="Zoom Out"
                className="hover:text-emphasis"
            >
                −
            </button>
            
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0 4px', minWidth: '35px', justifyContent: 'center', userSelect: 'none' }}>
                {zoom}%
            </div>

            <button 
                onClick={() => setZoom(zoom + 10)}
                style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                title="Zoom In"
                className="hover:text-emphasis"
            >
                +
            </button>
        </div>
    );
};

export default function GameHub(props: GameHubProps) {
    const router = useRouter();

    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    const [location, setLocation] = useState<LocationDefinition | null>(props.initialLocation);
    const [hand, setHand] = useState<Opportunity[]>(props.initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [showMarket, setShowMarket] = useState(false);
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile' | 'living'>('story');
    const [eventSource, setEventSource] = useState<'story' | 'item'>('story');
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string } | null>(null);

    const { playTrack } = useAudio(); 
    const [activeResolution, setActiveResolution] = useState<ResolutionState | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showHiddenQualities, setShowHiddenQualities] = useState(false);
    const [showInspector, setShowInspector] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [logs, setLogs] = useState<{ message: string, type: 'EVAL' | 'COND' | 'FX', timestamp: number }[]>([]);
    const [showLogger, setShowLogger] = useState(false);
    const logQueue = useRef<{ message: string, type: 'EVAL' | 'COND' | 'FX' }[]>([]); 
    
    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth <= 900);
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    const handleAcknowledgeEvent = useCallback(async (instanceId: string) => {
        if (!character) return;
        try {
            const res = await fetch('/api/character/acknowledge-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storyId: props.storyId, 
                    characterId: character.characterId,
                    instanceId: instanceId 
                })
            });
            const data = await res.json();
            if (data.success && data.character) {
                setCharacter(data.character);
            } else {
                console.error("Failed to acknowledge event:", data.error);
            }
        } catch (e) {
            console.error("Network error while acknowledging event:", e);
        }
    }, [character, props.storyId]);

    const handleLog = useCallback((message: string, type: 'EVAL' | 'COND' | 'FX') => {
        logQueue.current.push({ message, type });
    }, []);

    useEffect(() => {
        setIsMounted(true); 
    }, []);

    useEffect(() => {
        if (logQueue.current.length > 0) {
            setLogs(prev => [...prev, ...logQueue.current.map(log => ({ ...log, timestamp: Date.now() }))]);
            logQueue.current = [];
        }
    }, [character, location, activeEvent, activeResolution]);

    const deckIds = useMemo(() => 
        location?.deck ? location.deck.split(',').map(s => s.trim()).filter(Boolean) : [],
        [location?.deck]
    );

    useEffect(() => {
        setCharacter(props.initialCharacter);
        setLocation(props.initialLocation);
        setHand(props.initialHand);
        setActiveEvent(props.activeEvent || null); 
        setActiveResolution(null); 
        setShowMap(false);
        setShowMarket(false);
        setIsTransitioning(false);
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

    const showEvent = useCallback(async (eventId: string | null, source: 'story' | 'item' = 'story') => {
        if (!eventId) { 
            setActiveEvent(null); 
            setActiveResolution(null); 
            return; 
        }
        
        setEventSource(source);
        
        setIsLoading(true);
        try {
            if (!character) return;
            setActiveResolution(null);
            
            const response = await fetch(`/api/storylet/${eventId}?storyId=${props.storyId}&characterId=${character.characterId}`);
            if (!response.ok) throw new Error(`Event ${eventId} not found.`);
            const rawEventData = await response.json();
            setActiveEvent(rawEventData);
        } catch (error) { console.error(error); setActiveEvent(null); } finally { setIsLoading(false); }
    }, [props.storyId, character]);

    useEffect(() => {
        const trackId = (location as any)?.musicTrackId; 
        if (trackId && props.musicTracks?.[trackId]) {
            const trackSource = props.musicTracks[trackId].source;
            const instrumentList = props.instruments ? Object.values(props.instruments) : [];
            playTrack(trackSource, instrumentList);
        }
    }, [location, props.musicTracks, props.instruments, playTrack]);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities, newDefinitions?: Record<string, QualityDefinition>, newEquipment?: Record<string, string | null>, newPendingEvents?: any[]) => {
        setCharacter(prev => {
            if (!prev) return null;
            const updated: CharacterDocument = { ...prev, qualities: { ...newQualities } };
            if (newDefinitions) updated.dynamicQualities = { ...(prev.dynamicQualities || {}), ...newDefinitions };
            if (newEquipment) updated.equipment = { ...newEquipment };
            if (newPendingEvents) updated.pendingEvents = newPendingEvents;
            return updated;
        });
    }, []);
    
    const handleCharacterUpdate = useCallback((newCharacterState: CharacterDocument) => {
        setCharacter({ ...newCharacterState, qualities: { ...newCharacterState.qualities } });
    }, []);

    const handleEventFinish = useCallback((
        newQualities: PlayerQualities, 
        redirectId?: string, 
        moveToId?: string,
        newEquipment?: Record<string, string | null>,
        newPendingEvents?: any[] 
    ) => {
        setActiveResolution(null);
        if (eventSource === 'item' && !redirectId && !moveToId) setActiveTab('possessions');
        
        setCharacter(prev => {
            if (!prev) return null;
            const newChar: CharacterDocument = { ...prev, qualities: { ...newQualities } };
            if (moveToId) newChar.currentLocationId = moveToId;
            if (newEquipment) newChar.equipment = { ...newEquipment };
            if (newPendingEvents) newChar.pendingEvents = newPendingEvents; 
            return newChar;
        });
        
        showEvent(redirectId ?? null, 'story');
    }, [showEvent, eventSource]);


    const handleCardPlayed = useCallback((cardId: string) => {
        setHand(prev => prev.filter(c => c.id !== cardId));
    }, []);

    const handleDrawForDeck = useCallback(async (deckId: string) => {
        if (isLoading || !character) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/deck/draw', { 
                method: 'POST',
                body: JSON.stringify({ storyId: props.storyId, characterId: character.characterId, deckId }) 
            });
            const data = await response.json();
            
            if (data.success) {
                const newCards = (data.hand || []) as Opportunity[];
                
                setHand(prev => {
                    const currentHand = prev || [];
                    const otherDecksCards = currentHand.filter(c => c.deck !== deckId);
                    return [...otherDecksCards, ...newCards];
                });
                
                setCharacter(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        opportunityHands: {
                            ...(prev.opportunityHands || {}),
                            [deckId]: newCards.map(c => c.id)
                        },
                        qualities: data.newQualities || prev.qualities,
                        deckCharges: data.newCharges || prev.deckCharges 
                    };
                });
            } else {
                setAlertState({ isOpen: true, title: "Cannot Draw", message: data.message || "Failed to draw." });
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [isLoading, character, props.storyId]);
    
    const handleDeckRegen = useCallback(async () => {
        if (!character) return;
        try {
            const res = await fetch('/api/deck/regen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storyId: props.storyId, 
                    characterId: character.characterId 
                })
            });
            const data = await res.json();
            if (data.success) {
                setCharacter(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        deckCharges: data.deckCharges,
                        lastDeckUpdate: data.lastDeckUpdate
                    };
                });
            }
        } catch (e) {
            console.error("Failed to regen deck:", e);
        }
    }, [character, props.storyId]);

    const handleDiscard = useCallback(async (deckId: string, cardId: string) => {
        if (!character) return;
        try {
            const res = await fetch('/api/deck/draw', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: props.storyId, characterId: character.characterId, cardId, deckId })
            });
            const data = await res.json();
            if (data.success) {
                setHand(prev => prev.filter(c => c.id !== cardId));
                setCharacter(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        opportunityHands: {
                            ...(prev.opportunityHands || {}),
                            [deckId]: data.hand.map((c: Opportunity) => c.id)
                        }
                    };
                });
            }
        } catch (e) { console.error(e); }
    }, [character, props.storyId]);
    
    const handleTravel = useCallback(async (targetId: string) => {
        if (activeEvent) {
            setAlertState({ isOpen: true, title: "Cannot Travel", message: "You must finish the current event before travelling." });
            return;
        }
        if (!character) return;

        setIsTransitioning(true); 
        try {
            const res = await fetch('/api/travel', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: props.storyId, targetLocationId: targetId, characterId: character.characterId }) 
            });
            const data = await res.json();

            if (data.success) {
                setShowMap(false);
                
                if (data.newLocation) {
                    setLocation(data.newLocation);
                    
                    setCharacter(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            currentLocationId: data.currentLocationId,
                            opportunityHands: data.handCleared ? {} : prev.opportunityHands
                        };
                    });
                    
                    if (data.handCleared) setHand([]);
                }

                router.refresh();
                
                setTimeout(() => setIsTransitioning(false), 300);

            } else {
                setAlertState({ isOpen: true, title: "Travel Failed", message: data.error });
                setIsTransitioning(false); 
            }
        } catch(e) { 
            console.error("Travel failed:", e); 
            setAlertState({ isOpen: true, title: "Travel Error", message: "A network error occurred." });
            setIsTransitioning(false); 
        } 
    }, [character, props.storyId, activeEvent, router]);


    const handleExit = useCallback(() => {
        window.location.href = `/play/${props.storyId}?menu=true`;
    }, [props.storyId]);

    if (!character) {
        return <div data-theme={props.settings.visualTheme || 'default'} className="theme-wrapper"><CharacterLobby {...props} /></div>;
    }
    if (!location) return <div>Loading location data...</div>;

    const mergedQualityDefs = useMemo(() => ({
        ...props.qualityDefs,
        ...(character.dynamicQualities || {})
    }), [props.qualityDefs, character.dynamicQualities]);

    const worldConfig: WorldConfig = useMemo(() => ({
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
    }), [props.settings, mergedQualityDefs, props.deckDefs, props.locations, props.regions, props.imageLibrary, props.categories, props.markets, props.instruments, props.musicTracks]);
    
    const renderEngine = useMemo(() => 
        new GameEngine(character.qualities, worldConfig, character.equipment, props.worldState, props.isPlaytesting ? handleLog : undefined),
        [character.qualities, worldConfig, character.equipment, props.worldState, props.isPlaytesting, handleLog]
    );
    
    const lsConfig = props.settings.livingStoriesConfig;
    const livingStoriesEnabled = lsConfig?.enabled !== false;
    
    let columnLivingStories = null;
    let sidebarLivingStories = null;

    if (livingStoriesEnabled) {
        const hideBecauseEmpty = lsConfig?.hideWhenEmpty && (!character.pendingEvents || character.pendingEvents.length === 0);
        
        if (!hideBecauseEmpty) {
            const position = isMobile && lsConfig?.position === 'column' ? 'sidebar' : lsConfig?.position;

            const livingStoriesComponent = (
                <LivingStories 
                    pendingEvents={character.pendingEvents || []}
                    qualityDefs={mergedQualityDefs}
                    imageLibrary={props.imageLibrary}
                    settings={props.settings}
                    engine={renderEngine}
                    onAcknowledge={handleAcknowledgeEvent}
                />
            );
            
            if (position === 'column') {
                columnLivingStories = livingStoriesComponent;
            } else if (position === 'sidebar' || !position) {
                sidebarLivingStories = (
                    <div style={{ padding: '0 1.5rem', marginTop: '1.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        {livingStoriesComponent}
                    </div>
                );
            }
        }
    }


    const rawRegen = props.settings.regenAmount || 1;
    const evaluatedRegen = parseInt(renderEngine.evaluateText(`{${rawRegen}}`), 10) || 1;

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

    const locationMarket = location?.marketId;
    const regionMarket = (location?.regionId && props.regions[location.regionId]) ? props.regions[location.regionId].marketId : null;
    const activeMarketId = locationMarket || regionMarket || undefined;
    
    const actionQid = props.settings.actionId.replace('$', '');
    const actionState = character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof props.settings.maxActions === 'number' ? props.settings.maxActions : 20;
    
    const TabBar = () => {
        const showLivingStoriesTab = lsConfig?.position === 'tab' && character?.pendingEvents && character.pendingEvents.length > 0;
        return (
            <div className="tab-bar">
                <button onClick={() => setActiveTab('story')} data-tab-id="story" className={`tab-btn ${activeTab === 'story' ? 'active' : ''}`}>Story</button>
                <button onClick={() => setActiveTab('possessions')} data-tab-id="possessions" className={`tab-btn ${activeTab === 'possessions' ? 'active' : ''}`}>Possessions</button>
                {!props.settings.hideProfileIdentity && (
                     <button onClick={() => setActiveTab('profile')} data-tab-id="profile" className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}>Myself</button>
                )}
                {livingStoriesEnabled && showLivingStoriesTab && (
                    <button onClick={() => setActiveTab('living')} data-tab-id="living" className={`tab-btn ${activeTab === 'living' ? 'active' : ''}`}>
                        {props.settings.livingStoriesConfig?.title || "Living Stories"}
                    </button>
                )}
            </div>
        );
    };

    const sidebarTab = props.settings.tabLocation === 'sidebar';

    const buildSidebar = () => {
        if (sidebarTab) {
            return (
                <div className="sidebar-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="sidebar-content-scroll" style={{ overflowY: 'auto' }}>
                        <TabBar /> 
                        <div className="action-box">
                            <ActionTimer currentActions={currentActions} maxActions={maxActions} lastTimestamp={character.lastActionTimestamp || new Date()} regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} regenAmount={evaluatedRegen} onRegen={() => {}} />                        
                        </div>
                        <CharacterSheet qualities={character.qualities} equipment={character.equipment} qualityDefs={mergedQualityDefs} settings={props.settings} categories={props.categories} engine={renderEngine} showHidden={showHiddenQualities} />                    
                        
                        {sidebarLivingStories}

                        {props.isPlaytesting && (
                            <div style={{ marginTop: '2rem', padding: '0 1.5rem', borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem', paddingBottom: '2rem' }}>
                                <h4 style={{ color: 'var(--warning-color)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>GM Controls</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--tool-text-dim)' }}>
                                        <input type="checkbox" checked={showHiddenQualities} onChange={e => setShowHiddenQualities(e.target.checked)} /> Show Hidden Qualities
                                    </label>
                                    <button onClick={() => setShowInspector(true)} style={{ background: 'var(--tool-bg-input)', color: 'var(--tool-accent)', border: '1px solid var(--tool-border)', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Open Character Inspector</button>
                                    <button onClick={() => setShowLogger(prev => !prev)} style={{ background: showLogger ? 'var(--tool-accent)' : 'var(--tool-bg-input)', color: showLogger ? 'var(--tool-text-header)' : 'var(--tool-accent)', border: '1px solid var(--tool-border)', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{showLogger ? 'Hide Live Log' : 'Show Live Log'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="sidebar-footer">
                        <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                        <ZoomControls />
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
                            <ActionTimer 
                                currentActions={currentActions} 
                                maxActions={maxActions} 
                                lastTimestamp={character.lastActionTimestamp || new Date()} 
                                regenIntervalMinutes={props.settings.regenIntervalInMinutes || 10} 
                                regenAmount={evaluatedRegen} 
                                onRegen={() => {}} 
                            />                      
                    </div>
                    <CharacterSheet 
                        qualities={character.qualities} 
                        equipment={character.equipment} 
                        qualityDefs={mergedQualityDefs} 
                        settings={props.settings} 
                        categories={props.categories} 
                        engine={renderEngine} 
                        showHidden={showHiddenQualities} 
                    />
                    
                    {sidebarLivingStories}

                    {props.isPlaytesting && (
                        <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem', paddingBottom: '2rem' }}>
                           <h4 style={{ color: 'var(--warning-color)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>GM Controls</h4>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                               <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--tool-text-dim)' }}>
                                   <input type="checkbox" checked={showHiddenQualities} onChange={e => setShowHiddenQualities(e.target.checked)} /> Show Hidden Qualities
                               </label>
                               <button onClick={() => setShowInspector(true)} style={{ background: 'var(--tool-bg-input)', color: 'var(--tool-accent)', border: '1px solid var(--tool-border)', padding: '5px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Open Character Inspector</button>
                           </div>
                        </div>
                    )}
                </div>
                
                <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button onClick={handleExit} className="switch-char-btn">← Switch Character</button>
                    <ZoomControls />
                </div>
            </div>
        );
    };

    const buildMainContent = () => {
        const headerStyle = props.settings.locationHeaderStyle || 'standard';
        const isBannerMode = headerStyle === 'banner';
        const imageCode = renderedLocation?.imageId || renderedLocation?.image;

        let innerContent = null;

        const renderHeader = () => {
            if (headerStyle === 'hidden') return null;
            
            const canTravel = !activeEvent;

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
                            onOpenMap={canTravel ? () => setShowMap(true) : undefined} 
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
                        onOpenMap={canTravel ? () => setShowMap(true) : undefined} 
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
                        showHidden={showHiddenQualities}
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
                        onUseItem={(id) => showEvent(id, 'item')} 
                        onRequestTabChange={(tab) => setActiveTab(tab)} 
                        storyId={props.storyId} 
                        imageLibrary={props.imageLibrary} 
                        settings={props.settings} 
                        engine={renderEngine} 
                        showHidden={showHiddenQualities}
                        onAutofire={(id) => {
                            setActiveTab('story'); 
                            showEvent(id, 'story');
                        }}
                    />
                </div>
            );
        } else if (activeTab === 'living') {
            innerContent = (
                <div className="content-panel">
                    <LivingStories 
                        pendingEvents={character?.pendingEvents || []}
                        qualityDefs={mergedQualityDefs}
                        imageLibrary={props.imageLibrary}
                        settings={props.settings}
                        engine={renderEngine}
                        onAcknowledge={handleAcknowledgeEvent}
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
        } else if (activeEvent) { 
            const showHeaderInStorylet = props.settings.showHeaderInStorylet === true;

            innerContent = (
                <div className="event-view">
                    {showHeaderInStorylet && renderHeader()}

                    <StoryletDisplay 
                        eventData={activeEvent} 
                        qualities={character.qualities} 
                        resolution={activeResolution}
                        onResolve={setActiveResolution}
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
                        engine={renderEngine} 
                        isPlaytesting={props.isPlaytesting}
                        onLog={props.isPlaytesting ? handleLog : undefined} 
                        eventSource={eventSource}
                    />
                </div>
            );
        } else {
            innerContent = (
                <div className="hub-view">
                    {renderHeader()}
                    {visibleStorylets.length > 0 && (
                        <div className="storylet-feed" style={{ marginTop: '2rem' }}>
                            <LocationStorylets 
                                storylets={visibleStorylets} 
                                onStoryletClick={showEvent} 
                                qualities={character.qualities} 
                                qualityDefs={mergedQualityDefs} 
                                imageLibrary={props.imageLibrary} 
                                settings={props.settings}
                                engine={renderEngine}
                            />
                        </div>
                    )}
                    {deckIds.map(deckId => {
                        const deckDef = props.deckDefs[deckId];
                        if (!deckDef) return null;

                        const handVal = renderEngine.evaluateText(`{${deckDef.hand_size || 3}}`);
                        const deckVal = renderEngine.evaluateText(`{${deckDef.deck_size || 0}}`);
                        const stats = { handSize: parseInt(handVal, 10) || 3, deckSize: parseInt(deckVal, 10) || 0 };
                        
                        const deckTitle = deckDef.name || "Opportunities";

                        return (
                            <div key={deckId} className="storylet-feed" style={{ marginTop: '3rem' }}>
                                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--text-highlight)', textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '1px' }}>
                                    {renderEngine.evaluateText(deckTitle)}
                                </h3>
                                <OpportunityHand 
                                    hand={hand.filter(c => c.deck === deckId)}
                                    onCardClick={showEvent}
                                    onDrawClick={() => handleDrawForDeck(deckId)}
                                    onDiscard={(cardId) => handleDiscard(deckId, cardId)}
                                    onRegen={handleDeckRegen}
                                    actionTimestamp={character.lastActionTimestamp}
                                    isLoading={isLoading}
                                    qualities={character.qualities}
                                    qualityDefs={mergedQualityDefs}
                                    imageLibrary={props.imageLibrary}
                                    character={character}
                                    locationDeckId={deckId}
                                    deckDefs={props.deckDefs}
                                    settings={props.settings}
                                    currentDeckStats={stats}
                                    engine={renderEngine} 
                                />
                            </div>
                        );
                    })}
                </div>
            );
        }
        const contentWithLivingStories = columnLivingStories ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1', minWidth: 0 }}>{innerContent}</div>
                <div style={{ width: '320px', flexShrink: 0, marginTop: '2rem' }}>{columnLivingStories}</div>
            </div>
        ) : innerContent;

        if (!sidebarTab) {
            return (
                <div className="main-content-wrapper">
                    <div className="tab-container" style={{ marginBottom: '2rem' }}><TabBar /></div>
                    {contentWithLivingStories}
                </div>
            );
        } else {
            return (
                <div className="main-content-wrapper">
                    {contentWithLivingStories}
                </div>
            );
        }
    };
    
    const renderLayout = () => {
        const canTravel = !activeEvent;

        const hasRightColumn = !!columnLivingStories;

        const layoutProps: any = {
            sidebarContent: buildSidebar(),
            mainContent: buildMainContent(),
            settings: props.settings,
            location: renderedLocation!,
            imageLibrary: props.imageLibrary,
            onExit: handleExit,
            onOpenMap: canTravel ? () => setShowMap(true) : undefined,
            onOpenMarket: () => setShowMarket(true),
            currentMarketId: activeMarketId,
            isTransitioning: isTransitioning,
            hasRightColumn: hasRightColumn 
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
            <ToastProvider>
                {alertState && (
                    <GameModal 
                        isOpen={alertState.isOpen}
                        title={alertState.title}
                        message={alertState.message}
                        onConfirm={() => setAlertState(null)}
                        onClose={() => setAlertState(null)}
                        confirmLabel="Dismiss"
                    />
                )}
                
                {renderLayout()}
                
                {showMap && <MapModal currentLocationId={character.currentLocationId} locations={props.locations} regions={props.regions} imageLibrary={props.imageLibrary} onTravel={handleTravel} onClose={() => setShowMap(false)} />}
                
                {isMounted && props.isPlaytesting && showInspector && character && createPortal(
                    <CharacterInspector 
                        characterId={character.characterId}
                        storyId={props.storyId}
                        worldQualities={mergedQualityDefs}
                        settings={props.settings}
                        onClose={() => setShowInspector(false)}
                    />,
                    document.body 
                )}
                {isMounted && props.isPlaytesting && showLogger && createPortal(
                <div data-theme="default">
                    <PlaytestLogger logs={logs} onClear={() => setLogs([])} />
                </div>,
                document.body
            )}
            </ToastProvider>
        </div>
    );
}