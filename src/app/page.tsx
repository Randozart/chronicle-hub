// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter } from '@/engine/characterService';
import { getWorldContent, getLocation, getEvent, getLocationStorylets, getQualityDefinitions } from '@/engine/worldService';
import { Opportunity } from '@/engine/models';
import GameHub from '@/components/GameHub';

const STORY_ID = 'trader_johns_world';

export default async function Home() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    
    const userId = (session.user as any).id;
    
    const character = await getCharacter(userId, STORY_ID);

    if (!character) {
        redirect(`/creation?storyId=${STORY_ID}`);
    }
    
    const gameData = await getWorldContent(STORY_ID); // Fetch full data ONCE on the server
    
     const initialLocation = gameData.locations[character.currentLocationId];
    if (!initialLocation) return <div>Error: Player in unknown location.</div>;

    const initialHandIds = character.opportunityHands?.[initialLocation.deck] || [];
    
    const initialHand: Opportunity[] = initialHandIds
        .map((id: string) => gameData.opportunities[id])
        .filter(Boolean);
        
    const locationStorylets = Object.values(gameData.storylets).filter(s => s.location === character.currentLocationId);

    const plainInitialCharacter = { ...character, _id: character._id.toString() };

    return (
        <main>
            <GameHub
                initialCharacter={plainInitialCharacter}
                initialLocation={initialLocation}
                initialHand={initialHand}
                locationStorylets={locationStorylets}
                qualityDefs={gameData.qualities}
                storyletDefs={gameData.storylets}
                opportunityDefs={gameData.opportunities} 
                settings={gameData.settings}
            />
        </main>
    );
}