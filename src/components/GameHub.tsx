'use client';

import { useState, useCallback } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition, MapRegion } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import ElysiumLayout from './layouts/ElysiumLayout';
import TabletopLayout from './layouts/TabletopLayout';
import { LayoutProps } from './layouts/LayoutProps';
import MapModal from './MapModal'; // Ensure this is imported

interface GameHubProps {
    initialCharacter: CharacterDocument;
    initialLocation: LocationDefinition;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    
    // Config Dictionaries
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
    
    // NEW: Full Location/Region Data for Map
    locations: Record<string, LocationDefinition>;
    regions: Record<string, MapRegion>;
}

export default function GameHub({
    initialCharacter,
    initialLocation,
    initialHand,
    locationStorylets,
    qualityDefs,
    storyletDefs,
    opportunityDefs,
    settings,
    imageLibrary,
    categories,
    locations,
    regions
}: GameHubProps) {
    
    const [character, setCharacter] = useState(initialCharacter);
    const [location, setLocation] = useState(initialLocation);
    const [hand, setHand] = useState(initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);

    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) { setActiveEvent(null); return; }
        setIsLoading(true);
        try {
            const preloadedEvent = locationStorylets.find(s => s.id === eventId) || hand.find(o => o.id === eventId);
            if (preloadedEvent) {
                setActiveEvent(preloadedEvent);
            } else {
                const response = await fetch(`/api/storylet/${eventId}?storyId=${character.storyId}`);
                if (!response.ok) throw new Error(`Event ${eventId} not found.`);
                const eventData = await response.json();
                setActiveEvent(eventData);
            }
        } catch (error) { console.error(error); setActiveEvent(null); } finally { setIsLoading(false); }
    }, [hand, locationStorylets, character.storyId]);

    const handleDrawCard = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/deck/draw', { 
                method: 'POST',
                body: JSON.stringify({ storyId: character.storyId }) 
            });
            const data = await response.json();
            const updatedCharacter: CharacterDocument = data.character || data;
            
            if (!response.ok && data.error) throw new Error(data.error);
            if (data.message) alert(data.message);
            
            if (updatedCharacter) {
                setCharacter(updatedCharacter);
                // If the API returns the updated hand IDs, we should technically re-fetch the card definitions here.
                // For this prototype, we rely on page refresh or optimistic updates, but ideally:
                // fetchCards(updatedCharacter.opportunityHands[location.deck]).then(setHand);
                
                // Temporary: Refresh page to see new card if we don't implement full hand fetch logic here
                if (!data.message) window.location.reload(); 
            }
        } catch (error) { console.error(error); alert((error as Error).message); } finally { setIsLoading(false); }
    }, [isLoading, location, character.storyId]);

    const handleTravel = useCallback(async (targetId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/travel', { 
                method: 'POST', 
                body: JSON.stringify({ storyId: character.storyId, targetLocationId: targetId }) 
            });
            const data = await res.json();
            if (data.success) {
                setCharacter(data.character);
                const newLoc = locations[targetId];
                if (newLoc) setLocation(newLoc);
                setShowMap(false);
                // We should also refresh storylets and hand for the new location
                window.location.reload(); // Simple fix for prototype: Full refresh loads correct context
            } else {
                alert(data.error);
            }
        } catch(e) { console.error(e); } finally { setIsLoading(false); }
    }, [character.storyId, locations]);

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string) => {
        setCharacter(prev => ({ ...prev, qualities: newQualities } as CharacterDocument));
        showEvent(redirectId ?? null);
    }, [showEvent]);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prev => ({ ...prev, qualities: newQualities } as CharacterDocument));
    }, []);

    const handleCardPlayed = useCallback((cardId: string) => {
        setHand(prev => prev.filter(c => c.id !== cardId));
    }, []);

    // --- LAYOUT ---

    const layoutProps: LayoutProps = {
        character,
        location,
        hand,
        activeEvent,
        isLoading,
        qualityDefs,
        storyletDefs,
        opportunityDefs,
        settings,
        imageLibrary,
        categories,
        locationStorylets,
        
        onOptionClick: showEvent,
        onDrawClick: handleDrawCard,
        onEventFinish: handleEventFinish,
        onQualitiesUpdate: handleQualitiesUpdate,
        onCardPlayed: handleCardPlayed,
        onOpenMap: () => setShowMap(true) 
    };

    const style = settings.layoutStyle || 'nexus';

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
            data-theme={settings.visualTheme || 'default'} 
            className="theme-wrapper" // Ensure this div wraps everything
            style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}
        >
            {renderLayout()}

            {showMap && (
                <MapModal 
                    currentLocationId={character.currentLocationId}
                    locations={locations}
                    regions={regions}
                    imageLibrary={imageLibrary}
                    onTravel={handleTravel}
                    onClose={() => setShowMap(false)}
                />
            )}
        </div>
    );
}