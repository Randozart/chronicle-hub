'use client';

import { useState, useCallback } from 'react';
import { CharacterDocument, LocationDefinition, Opportunity, PlayerQualities, QualityDefinition, Storylet, WorldSettings, ImageDefinition, CategoryDefinition } from '@/engine/models';
import NexusLayout from './layouts/NexusLayout';
import LondonLayout from './layouts/LondonLayout';
import { LayoutProps } from './layouts/LayoutProps';
import ElysiumLayout from './layouts/ElysiumLayout';

interface GameHubProps {
    initialCharacter: CharacterDocument;
    initialLocation: LocationDefinition;
    initialHand: Opportunity[];
    locationStorylets: Storylet[];
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>; 
    settings: WorldSettings;
    imageLibrary: Record<string, ImageDefinition>;
    categories: Record<string, CategoryDefinition>;
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
    categories
}: GameHubProps) {
    
    const [character, setCharacter] = useState(initialCharacter);
    const [location, setLocation] = useState(initialLocation);
    const [hand, setHand] = useState(initialHand);
    const [activeEvent, setActiveEvent] = useState<Storylet | Opportunity | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const showEvent = useCallback(async (eventId: string | null) => {
        if (!eventId) { setActiveEvent(null); return; }
        setIsLoading(true);
        try {
            const preloadedEvent = locationStorylets.find(s => s.id === eventId) || hand.find(o => o.id === eventId);
            if (preloadedEvent) {
                setActiveEvent(preloadedEvent);
            } else {
                // NOTE: Dynamic storyId should eventually replace hardcoded 'trader_johns_world'
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
                body: JSON.stringify({ storyId: character.storyId }) // Send ID!
            });
            const data = await response.json();
            const updatedCharacter: CharacterDocument = data.character || data;
            if (!response.ok && data.error) throw new Error(data.error);
            if (data.message) alert(data.message);
            
            if (updatedCharacter) {
                setCharacter(updatedCharacter);
                // Refresh hand logic... (Simplified for brevity)
                // In a real refactor, you might refetch hand here or trust server response
            }
        } catch (error) { console.error(error); alert((error as Error).message); } finally { setIsLoading(false); }
    }, [isLoading, location, character.storyId]);

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

    // BUNDLE PROPS
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
        onCardPlayed: handleCardPlayed
    };

    const style = settings.layoutStyle || 'nexus';

    if (style === 'london') return <LondonLayout {...layoutProps} />;
    if (style === 'elysium') return <ElysiumLayout {...layoutProps} />;
    return <NexusLayout {...layoutProps} />;
}