'use client';
import { useState, useCallback } from 'react';
import { PlayerQualities, Storylet, Opportunity, LocationDefinition, CharacterDocument, QualityDefinition, WorldSettings, ImageDefinition } from '@/engine/models';

import LocationHeader from './LocationHeader';
import OpportunityHand from './OpportunityHand';
import StoryletDisplay from './StoryletDisplay';
import LocationStorylets from './LocationStorylets';
import CharacterSheet from './CharacterSheet';
import Possessions from './Possessions'; 
import ActionTimer from './ActionTimer';
import ProfilePanel from './ProfilePanel';



interface GameHubProps {
    initialCharacter: CharacterDocument;
    initialLocation: LocationDefinition;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>; // Add type
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
}: GameHubProps) {
    
    const [character, setCharacter] = useState(initialCharacter);
    const [location, setLocation] = useState(initialLocation);
    const [hand, setHand] = useState(initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'story' | 'possessions' | 'profile'>('story');

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

    const handleActionRegen = () => {
        const actionQid = settings.actionId.replace('$', ''); // e.g., "actions"
        
        setCharacter(prev => {
            const currentActions = prev.qualities[actionQid];
            if (!currentActions || !('level' in currentActions)) return prev;

            // Don't go over max
            const max = typeof settings.maxActions === 'number' ? settings.maxActions : 20; 
            if (currentActions.level >= max) return prev;

            return {
                ...prev,
                qualities: {
                    ...prev.qualities,
                    [actionQid]: {
                        ...currentActions,
                        level: currentActions.level + 1
                    }
                },
                // We fake the timestamp update so the timer resets visually
                lastActionTimestamp: new Date() 
            };
        });
    };
    
    const actionQid = settings.actionId.replace('$', '');
    const actionState = character.qualities[actionQid];
    const currentActions = (actionState && 'level' in actionState) ? actionState.level : 0;
    const maxActions = typeof settings.maxActions === 'number' ? settings.maxActions : 20;

    return (
        <div className="hub-layout">
            <div className="sidebar-column left">
                <div className="action-display" style={{ marginBottom: '1rem', padding: '1rem', background: '#2c3e50', borderRadius: '4px' }}>
                    <h3>Actions: {currentActions} / {maxActions}</h3>
                    <ActionTimer 
                        currentActions={currentActions}
                        maxActions={maxActions}
                        lastTimestamp={character.lastActionTimestamp || new Date()}
                        regenIntervalMinutes={settings.regenIntervalInMinutes || 10}
                        onRegen={handleActionRegen}
                    />
                </div>

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
                    <button 
                        onClick={() => setActiveTab('profile')}
                        style={{ padding: '0.5rem 1rem', background: activeTab === 'profile' ? '#3e4451' : 'transparent', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Myself
                    </button>
                </div>

                {activeTab === 'profile' ? (
                    <ProfilePanel 
                        qualities={character.qualities}
                        qualityDefs={qualityDefs}
                        imageLibrary={imageLibrary} // <--- Pass this!
                    />
                ) : activeTab === 'possessions' ? (
                    <Possessions 
                        qualities={character.qualities}
                        equipment={character.equipment}
                        qualityDefs={qualityDefs}
                        equipCategories={settings.equipCategories || []}
                        onUpdateCharacter={handleCharacterUpdate}
                        storyId={character.storyId}
                        imageLibrary={imageLibrary}
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
                            imageLibrary={imageLibrary}
                        />
                    ) : (
                        <>
                            <LocationHeader location={location} imageLibrary={imageLibrary} />
                            <LocationStorylets
                                storylets={locationStorylets}
                                onStoryletClick={showEvent}
                                qualities={character.qualities}
                                qualityDefs={qualityDefs}
                                imageLibrary={imageLibrary}
                            />
                            <OpportunityHand 
                                hand={hand} 
                                onCardClick={showEvent}
                                onDrawClick={handleDrawCard}
                                isLoading={isLoading} 
                                qualities={character.qualities}
                                qualityDefs={qualityDefs}
                                imageLibrary={imageLibrary}
                            />
                        </>
                    )
                )}
            </div>
            <div className="sidebar-column right"></div>
        </div>
    );
}