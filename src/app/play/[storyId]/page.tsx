import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getContent, getAutofireStorylets, getStorylets } from '@/engine/contentCache';
import { getCharacter, getCharactersList } from '@/engine/characterService';
import { getWorldState } from '@/engine/worldService';
import { Storylet, Opportunity } from '@/engine/models';
import GameHub from '@/components/GameHub';

function serialize<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
}

type Props = {
    params: Promise<{ storyId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PlayPage({ params, searchParams }: Props) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        const resolvedParams = await params;
        redirect(`/auth/signin?callbackUrl=/play/${resolvedParams.storyId}`);
    }

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;
    const isPlaytest = resolvedSearchParams.playtest === 'true'; 
    const storyId = resolvedParams.storyId;
    const userId = (session.user as any).id;
    
    // 1. Fetch World Configuration
    const gameData = await getContent(storyId);
    if (!gameData) return <div>Story not found.</div>;

    // 2. Fetch All Events (Storylets + Opportunities)
    const allContent = await getStorylets(storyId);

    // 3. Fetch Characters
    const availableCharacters = await getCharactersList(userId, storyId);
    
    // Determine active character
    let character = null;
    let initialLocation = null;
    let initialHand: Opportunity[] = [];
    let activeEvent = null;

    if (resolvedSearchParams.menu !== 'true' && availableCharacters.length > 0) {
        const charIdToLoad = typeof resolvedSearchParams.char === 'string' ? resolvedSearchParams.char : undefined;
        character = await getCharacter(userId, storyId, charIdToLoad);
    }

    // Hydration Logic
    if (character) {
        const locDef = gameData.locations[character.currentLocationId];
        initialLocation = locDef || null;

        // --- FIX: AGGREGATE CARDS FROM ALL DECKS ---
        // The character might have cards in "deck_a" and "deck_b". 
        // We collect ALL of them here. GameHub will filter them visually based on the location.
        if (character.opportunityHands) {
            const allCardIds = Object.values(character.opportunityHands).flat();
            
            initialHand = allCardIds.map(id => {
                const def = allContent.find(s => s.id === id);
                return def as Opportunity;
            }).filter((item): item is Opportunity => !!item);
        }
        
        // Active Event Hydration
        if (character.currentStoryletId) {
             const autofires = await getAutofireStorylets(storyId);
             const evt = autofires.find(s => s.id === character.currentStoryletId) 
                 || allContent.find(s => s.id === character.currentStoryletId);
             
             if (evt) activeEvent = evt;
        }
    }

    const worldState = await getWorldState(storyId);

    // --- MERGE DYNAMIC DEFINITIONS ---
    const mergedQualityDefs = {
        ...gameData.qualities,
        ...(character?.dynamicQualities || {}) 
    };

    // Serialize everything before passing to Client Component
    const safeCharacter = serialize(character);
    const safeLocation = serialize(initialLocation);
    const safeHand = serialize(initialHand);
    const safeActiveEvent = serialize(activeEvent);
    
    // Create Lookup Maps to avoid passing huge arrays if possible, or just pass the array
    const storyletMap = allContent.reduce((acc: any, s: Storylet | Opportunity) => { acc[s.id] = s; return acc; }, {});
    const opportunityMap = allContent
        .filter((s: any) => 'deck' in s)
        .reduce((acc: any, s: Storylet | Opportunity) => { acc[s.id] = s; return acc; }, {});

    const safeAvailableChars = serialize(availableCharacters);

    return (
        <GameHub 
            storyId={storyId}
            initialCharacter={safeCharacter}
            initialLocation={safeLocation}
            initialHand={safeHand}
            availableCharacters={safeAvailableChars}
            
            qualityDefs={serialize(mergedQualityDefs)} 
            
            storyletDefs={storyletMap}
            opportunityDefs={opportunityMap}
            deckDefs={serialize(gameData.decks)}
            
            settings={serialize(gameData.settings)}
            locations={serialize(gameData.locations)}
            regions={serialize(gameData.regions)}
            locationStorylets={serialize(allContent.filter((s: any) => 'location' in s && s.location))} 
            
            imageLibrary={serialize(gameData.images)}
            categories={serialize(gameData.categories || {})}
            markets={serialize(gameData.markets)}
            worldState={serialize(worldState)}
            instruments={serialize(gameData.instruments)}
            musicTracks={serialize(gameData.music)}
            
            activeEvent={safeActiveEvent}
            isPlaytesting={isPlaytest}
        />
    );
}