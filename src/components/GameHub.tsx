'use client';
import { useState, useCallback } from 'react';
import { PlayerQualities, Storylet, Opportunity, LocationDefinition, CharacterDocument, QualityDefinition, WorldSettings } from '@/engine/models';

import LocationHeader from './LocationHeader';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay from './StoryletDisplay';
import LocationStorylets from './LocationStorylets';
import CharacterSheet from './CharacterSheet';

interface GameHubProps {
    initialCharacter: CharacterDocument;
    initialLocation: LocationDefinition;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
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
}: GameHubProps) {
    
    const [character, setCharacter] = useState(initialCharacter);
    const [location, setLocation] = useState(initialLocation);
    const [hand, setHand] = useState(initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prev => ({ ...prev, qualities: newQualities } as CharacterDocument));
    }, []);

    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setActiveEvent(null); return;
        }
        setIsLoading(true);
        try {
            const preloadedEvent = locationStorylets.find(s => s.id === eventId) || hand.find(o => o.id === eventId);
            if (preloadedEvent) {
                setActiveEvent(preloadedEvent);
            } else {
                const response = await fetch(`/api/storylet/${eventId}`);
                if (!response.ok) throw new Error(`Event ${eventId} not found.`);
                const eventData = await response.json();
                setActiveEvent(eventData);
            }
        } catch (error) {
            console.error(error);
            setActiveEvent(null);
        } finally {
            setIsLoading(false);
        }
    }, [hand, locationStorylets]);

    const handleDrawCard = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/deck/draw', { method: 'POST' });
            const data = await response.json();

            const updatedCharacter: CharacterDocument = data.character || data;
            
            if (!response.ok && data.error) {
                throw new Error(data.error);
            }
            
            if (data.message) {
                alert(data.message);
            }

            
            if (updatedCharacter) {
                setCharacter(updatedCharacter);

                const currentDeckId = location.deck; 
                const newHandIds = updatedCharacter.opportunityHands?.[currentDeckId] || [];

                const newHandData: Opportunity[] = await Promise.all(
                    newHandIds.map(id => 
                        fetch(`/api/storylet/${id}`).then(res => res.json())
                    )
                ).then(results => results.filter(Boolean));

                setHand(newHandData);
            }
        } catch (error) {
            console.error("Failed to draw card:", error);
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, location]); // <-- `location` is now a dependency

    const handleEventFinish = useCallback((newQualities: PlayerQualities, redirectId?: string) => {
        setCharacter(prev => ({ ...prev, qualities: newQualities } as CharacterDocument));
        showEvent(redirectId ?? null);
    }, [showEvent]);

     return (
        <div className="hub-layout">
            <div className="sidebar-column left">
                <CharacterSheet 
                    qualities={character.qualities} 
                    qualityDefs={qualityDefs}
                    settings={settings}
                />
            </div>
            
            <div className="main-content-column">
                {isLoading ? ( <div className="storylet-container loading-container"><p>Loading...</p></div> ) 
                : activeEvent ? (
                    <StoryletDisplay
                        eventData={activeEvent}
                        qualities={character.qualities}
                        onFinish={handleEventFinish}
                        onQualitiesUpdate={handleQualitiesUpdate} // <--- PASS THIS PROP
                        qualityDefs={qualityDefs}
                        storyletDefs={storyletDefs} // <-- Pass it down
                        opportunityDefs={opportunityDefs} 
                        settings={settings}
                    />
                ) : (
                    <>
                        <LocationHeader location={location} />
                        <LocationStorylets
                            storylets={locationStorylets}
                            onStoryletClick={showEvent}
                            qualities={character.qualities}
                            qualityDefs={qualityDefs}
                        />
                        <OpportunityHand 
                            hand={hand} 
                            onCardClick={showEvent}
                            onDrawClick={handleDrawCard}
                            isLoading={isLoading} 
                            qualities={character.qualities}
                            qualityDefs={qualityDefs}
                        />
                    </>
                )}
            </div>
            <div className="sidebar-column right"></div>
        </div>
    );
}