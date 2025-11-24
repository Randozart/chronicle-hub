// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateCharacter } from '@/engine/characterService';
import { getWorldContent, getLocation, getEvent, getLocationStorylets, getQualityDefinitions } from '@/engine/worldService';
import { Opportunity } from '@/engine/models';
import GameHub from '@/components/GameHub';

const STORY_ID = 'trader_johns_world';

export default async function Home() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    
    const userId = (session.user as any).id;
    const gameData = await getWorldContent(STORY_ID); // Fetch full data ONCE on the server

    const character = await getOrCreateCharacter(userId, STORY_ID);
    
    const initialLocation = gameData.locations[character.currentLocationId];
    if (!initialLocation) return <div>Error: Player in unknown location.</div>;

    const initialHand: Opportunity[] = Object.values(gameData.opportunities).filter(opp => character.opportunityHand.includes(opp.id));

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
                settings={gameData.settings}
            />
        </main>
    );
}