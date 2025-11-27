// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 
import { getLocationStorylets, getEvent } from '@/engine/worldService'; // Import these!
import { Storylet, Opportunity } from '@/engine/models'; // Import types
import GameHub from '@/components/GameHub';
import { GameEngine } from '@/engine/gameEngine';


const STORY_ID = 'trader_johns_world';

const sanitize = (obj: any) => {
    return JSON.parse(JSON.stringify(obj));
};

export default async function Home() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    
    const userId = (session.user as any).id;
    
    const character = await getCharacter(userId, STORY_ID);

    if (!character) {
        redirect(`/creation?storyId=${STORY_ID}`);
    }
    
    const gameData = await getContent(STORY_ID); // Config only

    const initialLocation = gameData.locations[character.currentLocationId];
    if (!initialLocation) return <div>Error: Player in unknown location.</div>;

    // Setup Engine
    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    // 1. Fetch & Render Hand
    const initialHandIds = character.opportunityHands?.[initialLocation.deck] || [];
    const rawHand = (await Promise.all(
        initialHandIds.map((id: string) => getEvent(STORY_ID, id))
    )).filter((item): item is Opportunity => item !== null && 'deck' in item);
    
    // FIX: Cast the result of renderStorylet back to Opportunity
    const initialHand = rawHand.map(card => engine.renderStorylet(card) as Opportunity);

    // 2. Fetch & Render Location Storylets
    const rawStorylets = await getLocationStorylets(STORY_ID, character.currentLocationId);
    // FIX: Cast result to Storylet
    const locationStorylets = rawStorylets.map(s => engine.renderStorylet(s) as Storylet);
    
    // 3. BUILD MINI DICTIONARIES
    // We create a map of { [id]: object } for just the things we are showing.
    // This satisfies GameHub's requirement without loading the whole DB.
    const visibleStoryletsMap: Record<string, Storylet> = {};
    locationStorylets.forEach(s => visibleStoryletsMap[s.id] = s);

    const visibleOpportunitiesMap: Record<string, Opportunity> = {};
    initialHand.forEach(o => visibleOpportunitiesMap[o.id] = o);
    
    const plainInitialCharacter = sanitize({ ...character });
    const plainLocation = sanitize(initialLocation);
    const plainHand = sanitize(initialHand);
    const plainLocationStorylets = sanitize(locationStorylets);
    const plainStoryletDefs = sanitize(visibleStoryletsMap);
    const plainOpportunityDefs = sanitize(visibleOpportunitiesMap);

    return (
        <main>
            <GameHub
                initialCharacter={plainInitialCharacter}
                initialLocation={plainLocation}
                initialHand={plainHand}
                locationStorylets={plainLocationStorylets}
                qualityDefs={sanitize(gameData.qualities)}
                storyletDefs={plainStoryletDefs}
                opportunityDefs={plainOpportunityDefs} 
                settings={sanitize(gameData.settings)}
                imageLibrary={gameData.images || {}}
            />
        </main>
    );
}