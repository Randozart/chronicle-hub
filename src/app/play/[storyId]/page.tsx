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
    const storyId = resolvedParams.storyId;
    const userId = (session.user as any).id;
    
    // 1. Fetch World Configuration
    const gameData = await getContent(storyId);
    if (!gameData) return <div>Story not found.</div>;

    // 2. Fetch Storylets
    const storylets = await getStorylets(storyId);

    // 3. Fetch Characters
    const availableCharacters = await getCharactersList(userId, storyId);
    
    // Determine active character
    let character = null;
    let initialLocation = null;
    let initialHand: any[] = [];
    let activeEvent = null;

    if (resolvedSearchParams.menu !== 'true' && availableCharacters.length > 0) {
        const charIdToLoad = typeof resolvedSearchParams.char === 'string' ? resolvedSearchParams.char : undefined;
        character = await getCharacter(userId, storyId, charIdToLoad);
    }

    // Hydration Logic
    if (character) {
        const locDef = gameData.locations[character.currentLocationId];
        initialLocation = locDef || null;

        if (initialLocation && initialLocation.deck) {
            const handIds = character.opportunityHands?.[initialLocation.deck] || [];
            
            initialHand = handIds.map(id => 
                storylets.find(s => s.id === id) as Opportunity
            ).filter(Boolean);
        }
        
        if (character.currentStoryletId) {
             const evt = await getAutofireStorylets(storyId).then(list => list.find(s => s.id === character.currentStoryletId)) 
                 || storylets.find(s => s.id === character.currentStoryletId);
             
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
    const safeStorylets = serialize(storylets);
    const safeAvailableChars = serialize(availableCharacters);

    return (
        <GameHub 
            storyId={storyId}
            initialCharacter={safeCharacter}
            initialLocation={safeLocation}
            initialHand={safeHand}
            availableCharacters={safeAvailableChars}
            
            qualityDefs={serialize(mergedQualityDefs)} 
            
            storyletDefs={safeStorylets.reduce((acc: any, s: Storylet | Opportunity) => { acc[s.id] = s; return acc; }, {})}
            opportunityDefs={safeStorylets.filter((s: Storylet | Opportunity) => 'deck' in s).reduce((acc: any, s: Storylet | Opportunity) => { acc[s.id] = s; return acc; }, {})}
            deckDefs={serialize(gameData.decks)}
            
            settings={serialize(gameData.settings)}
            locations={serialize(gameData.locations)}
            regions={serialize(gameData.regions)}
            locationStorylets={safeStorylets.filter((s: Storylet | Opportunity) => 'location' in s && s.location) as Storylet[]} 
            
            imageLibrary={serialize(gameData.images)}
            categories={serialize(gameData.categories || {})}
            markets={serialize(gameData.markets)}
            worldState={serialize(worldState)}
            instruments={serialize(gameData.instruments)}
            musicTracks={serialize(gameData.music)}
            
            activeEvent={safeActiveEvent}
        />
    );
}