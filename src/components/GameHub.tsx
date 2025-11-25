'use client';
import { useState, useCallback } from 'react';
import { PlayerQualities, Storylet, Opportunity, LocationDefinition, CharacterDocument, QualityDefinition, WorldSettings } from '@/engine/models';

import LocationHeader from './LocationHeader';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay from './StoryletDisplay';
import LocationStorylets from './LocationStorylets';
import CharacterSheet from './CharacterSheet';
import Possessions from './Possessions'; 


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
    const [activeTab, setActiveTab] = useState<'story' | 'possessions'>('story');

    const handleQualitiesUpdate = useCallback((newQualities: PlayerQualities) => {
        setCharacter(prev => ({ ...prev, qualities: newQualities } as CharacterDocument));
    }, []);

    const handleCharacterUpdate = (updatedCharacter: CharacterDocument) => {
        setCharacter(updatedCharacter);
    };

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

    const handleCardPlayed = useCallback((cardId: string) => {
        setHand(prevHand => prevHand.filter(card => card.id !== cardId));
        
        // Also update character ref to be safe
        setCharacter(prev => {
             const deckId = initialLocation.deck; // Simplified assumption
             const newHands = { ...prev.opportunityHands };
             if(newHands[deckId]) {
                 newHands[deckId] = newHands[deckId].filter(id => id !== cardId);
             }
             return { ...prev, opportunityHands: newHands };
        });
    }, [initialLocation]);

    return (
        <div className="hub-layout">
            <div className="sidebar-column left">
                <CharacterSheet 
                    qualities={character.qualities} 
                    equipment={character.equipment} // <--- ADD THIS PROP
                    qualityDefs={qualityDefs}
                    settings={settings}
                />
            </div>
            
            <div className="main-content-column">
                
                {/* --- NAVIGATION TABS --- */}
                <div className="hub-tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #444' }}>
                    <button 
                        onClick={() => setActiveTab('story')}
                        style={{ padding: '0.5rem 1rem', background: activeTab === 'story' ? '#3e4451' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Story
                    </button>
                    <button 
                        onClick={() => setActiveTab('possessions')}
                        style={{ padding: '0.5rem 1rem', background: activeTab === 'possessions' ? '#3e4451' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Possessions
                    </button>
                </div>

                {/* --- CONDITIONAL RENDERING --- */}
                {activeTab === 'possessions' ? (
                    <Possessions 
                        qualities={character.qualities}
                        equipment={character.equipment}
                        qualityDefs={qualityDefs}
                        equipCategories={settings.equipCategories || []}
                        onUpdateCharacter={handleCharacterUpdate}
                        storyId={character.storyId}
                    />
                ) : (
                    /* Existing Story View Logic */
                    isLoading ? ( <div className="storylet-container loading-container"><p>Loading...</p></div> ) 
                    : activeEvent ? (
                        <StoryletDisplay
                            eventData={activeEvent}
                            qualities={character.qualities}
                            onFinish={handleEventFinish}
                            onQualitiesUpdate={handleQualitiesUpdate}
                            onCardPlayed={handleCardPlayed}
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
                    )
                )}
            </div>
            <div className="sidebar-column right"></div>
        </div>
    );
}