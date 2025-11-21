// src/components/GameHub.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlayerQualities, Storylet, Opportunity, WorldContent, LocationDefinition, CharacterDocument } from '@/engine/models';
import { repositories } from '@/engine/repositories';

import LocationHeader from './LocationHeader';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay from './StoryletDisplay';
import LocationStorylets from './LocationStorylets';
import CharacterSheet from './CharacterSheet'; 

export default function GameHub({
    initialCharacter,
    initialLocation,
    initialHand,
    locationStorylets,
    gameData,
}: {
    initialCharacter: CharacterDocument;
    initialLocation: LocationDefinition;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    gameData: WorldContent;
}) {
    
    const [isClientReady, setIsClientReady] = useState(false);

    useEffect(() => {
        repositories.initialize(gameData);
        setIsClientReady(true);
    }, [gameData]);

    const [character, setCharacter] = useState(initialCharacter);
    const [location, setLocation] = useState(initialLocation);
    const [hand, setHand] = useState(initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) {
            setActiveEvent(null);
            return;
        }
        const eventData = repositories.getEvent(eventId);
        setActiveEvent(eventData ?? null);
    }, []);

    const handleDrawCard = useCallback(async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/deck/draw', { method: 'POST' });
            const data = await response.json(); // Always expect a JSON response

            if (!response.ok) {
                throw new Error(data.error || "Could not draw a card.");
            }
            
            const updatedCharacter: CharacterDocument = data.character || data;

            if (updatedCharacter?.opportunityHand) {
                setCharacter(updatedCharacter);
                setHand(updatedCharacter.opportunityHand.map(id => repositories.getEvent(id) as Opportunity).filter(Boolean));
            }

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
        setCharacter(prev => ({ ...prev!, qualities: newQualities }));
        showEvent(redirectId ?? null);
    }, [showEvent]);

    if (isLoading) {
        return <div className="storylet-container loading-container"><p>Loading...</p></div>;
    }

    // if (activeEvent) {
    //     return (
    //         <StoryletDisplay
    //             eventData={activeEvent}
    //             initialQualities={character.qualities}
    //             onFinish={handleEventFinish}
    //             gameData={gameData}
    //         />
    //     );
    // }
    
    return (
        <div className="hub-layout">
            
            {/* The left sidebar with the Character Sheet is always rendered. */}
            <div className="sidebar-column left">
                {/* It only appears when the client is ready to prevent hydration crashes. */}
                {isClientReady && <CharacterSheet qualities={character.qualities} gameData={gameData} />}
            </div>
            
            <div className="main-content-column">
                {/* 
                    This is the only place where we decide what to show in the middle.
                    The layout itself is now permanent.
                */}
                {isLoading ? (
                    <div className="storylet-container loading-container"><p>Loading...</p></div>
                ) : activeEvent ? (
                    <StoryletDisplay
                        eventData={activeEvent}
                        initialQualities={character.qualities} // Use the most up-to-date qualities
                        onFinish={handleEventFinish}
                        gameData={gameData}
                    />
                ) : isClientReady ? ( // Don't show hub until client is ready
                    <>
                        <LocationHeader location={location} />
                        <LocationStorylets
                            storylets={locationStorylets}
                            onStoryletClick={showEvent}
                            qualities={character.qualities}
                            gameData={gameData}
                        />
                        <OpportunityHand 
                            hand={hand} 
                            onCardClick={showEvent}
                            onDrawClick={handleDrawCard}
                            isLoading={isLoading} 
                            qualities={character.qualities}
                            gameData={gameData}
                        />
                    </>
                ) : (
                    // On initial server-render and first client-render, show a loading state
                    <div className="storylet-container loading-container"><p>Initializing...</p></div>
                )}
            </div>

            <div className="sidebar-column right">
                {/* The empty right sidebar is always rendered for layout stability. */}
            </div>
        </div>
    );
}