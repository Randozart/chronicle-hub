// src/app/page.tsx

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { loadGameData } from "@/engine/dataLoader";
import { getOrCreateCharacter } from '@/engine/characterService';
import { repositories } from "@/engine/repositories";
import { Opportunity } from '@/engine/models';

import GameHub from '@/components/GameHub';
import LocationStorylets from '@/components/LocationStorylets'; 

const STORY_ID = 'trader_johns_world';

export default async function Home() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect('/login');
    }
    const userId = (session.user as any).id;
    const username = session.user.name || 'Adventurer';

    const gameData = loadGameData();
    repositories.initialize(gameData);

    const characterFromDB = await getOrCreateCharacter(userId, STORY_ID, gameData);

    const initialLocation = repositories.getLocation(characterFromDB.currentLocationId);
    if (!initialLocation) {
        return <div>Error: Player is in an unknown location.</div>;
    }

    const initialHand: Opportunity[] = characterFromDB.opportunityHand
        .map(id => repositories.getEvent(id) as Opportunity)
        .filter(Boolean);

    const locationStorylets = Object.values(gameData.storylets).filter(
        storylet => storylet.location === characterFromDB.currentLocationId
    );

    const plainInitialCharacter = {
        ...characterFromDB,
        _id: characterFromDB._id.toString(), // Convert ObjectId to a string
    };

     return (
        <main className="container">
            <GameHub
                initialCharacter={plainInitialCharacter}
                initialLocation={initialLocation}
                initialHand={initialHand}
                locationStorylets={locationStorylets} // This was missing
                gameData={gameData}
            />
        </main>
    );
}