'use client';

import { useState, useCallback, useEffect } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import ElysiumLayout from './layouts/ElysiumLayout';
import TabletopLayout from './layouts/TabletopLayout';
import { LayoutProps } from './layouts/LayoutProps';
import MapModal from './MapModal';

interface GameHubProps {
    initialCharacter: CharacterDocument | null; 
    initialLocation: LocationDefinition | null;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    availableCharacters: { characterId: string, name: string, currentLocationId: string, lastActionTimestamp?: string }[];
    
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    locations: Record<string, LocationDefinition>;
    regions: Record<string, MapRegion>;
    storyId: string; 
}

export default function GameHub(props: GameHubProps) {
    
    const [character, setCharacter] = useState<CharacterDocument | null>(props.initialCharacter);
    const [location, setLocation] = useState<LocationDefinition | null>(props.initialLocation);
    const [hand, setHand] = useState<Opportunity[]>(props.initialHand);
    
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);

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
        // Simply navigating to the base URL without the query param
        // triggers the Server Component to load the Lobby state.
        window.location.href = `/play/${props.storyId}`;
    }, [props.storyId]);


    // --- RENDER ---

    // 1. LOBBY VIEW
    if (!character) {
        return (
            <div className="theme-wrapper" /* ... styles ... */>
                <div style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
                    <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-primary)' }}>Select Character</h1>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {props.availableCharacters.map((c, index) => (
                            <div 
                                key={c.characterId || index} 
                                className="option-button"
                                onClick={() => window.location.href = `/play/${props.storyId}?charId=${c.characterId}`}
                                style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--accent-highlight)' }}>{c.name}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {props.locations[c.currentLocationId]?.name || c.currentLocationId}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.5rem' }}>→</span>
                                    <button 
                                        onClick={(e) => handleDeleteChar(c.characterId, e)}
                                        style={{ background: 'none', border: 'none', color: '#e06c75', cursor: 'pointer', padding: '0.5rem' }}
                                        title="Delete Character"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        <button 
                            onClick={() => window.location.href = `/play/${props.storyId}/creation`}
                            className="option-button"
                            style={{ border: '2px dashed var(--border-color)', background: 'transparent', color: 'var(--text-muted)', textAlign: 'center', justifyContent: 'center' }}
                        >
                            + Create New Character
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!location) return <div>Loading location data...</div>;

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

        onOptionClick: showEvent,
        onDrawClick: handleDrawCard,
        onEventFinish: handleEventFinish,
        onQualitiesUpdate: handleQualitiesUpdate,
        onCardPlayed: handleCardPlayed,
        onOpenMap: () => setShowMap(true),
        onExit: handleExit
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