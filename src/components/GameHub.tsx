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
            const data = await response.json(); // This will now be { character, message? }

            if (!response.ok) {
                throw new Error(data.error || "Could not draw a card.");
            }
            
            // --- THIS IS THE FIX ---
            const updatedCharacter: CharacterDocument = data.character;
            if (!updatedCharacter?.opportunityHand) {
                throw new Error("Received invalid character data from server.");
            }

            // We no longer use the client-side repo. Fetch the full card data for the new hand.
            const newHandData: Opportunity[] = await Promise.all(
                updatedCharacter.opportunityHand.map(id => 
                    fetch(`/api/storylet/${id}`).then(res => res.json())
                )
            ).then(results => results.filter(Boolean));
            // --- END OF FIX ---

            setCharacter(updatedCharacter);
            setHand(newHandData);

            if (data.message) {
                alert(data.message);
            }

        } catch (error) {
            console.error("Failed to draw card:", error);
            alert((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]);

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
                        qualityDefs={qualityDefs}
                        storyletDefs={storyletDefs} 
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