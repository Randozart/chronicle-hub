import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getCharacter, getCharactersList } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 
import { getLocationStorylets, getEvent } from '@/engine/worldService';
import { Storylet, Opportunity } from '@/engine/models';
import GameHub from '@/components/GameHub';
import { GameEngine } from '@/engine/gameEngine';

const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

export default async function GamePage({ params, searchParams }: { params: Promise<{ storyId: string }>, searchParams: Promise<{ charId?: string }> }) {
    const { storyId } = await params;
    const { charId } = await searchParams; 
    
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    const userId = (session.user as any).id;

    // 1. Fetch Character List
    const charList = await getCharactersList(userId, storyId);

    // 2. Determine Active Character
    let activeCharId = charId;
    
    // If no ID in URL, and only 1 char exists, auto-select it
    if (!activeCharId && charList.length === 1) {
        activeCharId = charList[0].characterId;
    }

    let character = null;
    if (activeCharId) {
        character = await getCharacter(userId, storyId, activeCharId);
    }

    // If no chars at all, redirect to creation
    if (!character && charList.length === 0) {
        redirect(`/play/${storyId}/creation`);
    }

    // 3. Load Game Data
    const gameData = await getContent(storyId);
    
    // 4. If we have a character, prepare the game state
    let initialLocation = null;
    let initialHand: Opportunity[] = [];
    let locationStorylets: Storylet[] = [];
    
    // FIX 1: Explicitly type these objects so TypeScript allows assignment
    const visibleStoryletsMap: Record<string, Storylet> = {};
    const visibleOpportunitiesMap: Record<string, Opportunity> = {};

    if (character) {
        initialLocation = gameData.locations[character.currentLocationId];
        const engine = new GameEngine(character.qualities, gameData, character.equipment);

        const initialHandIds = character.opportunityHands?.[initialLocation?.deck] || [];
        const rawHand = (await Promise.all(
            initialHandIds.map((id: string) => getEvent(storyId, id))
        )).filter((item): item is Opportunity => item !== null && 'deck' in item);
        initialHand = rawHand.map(card => engine.renderStorylet(card) as Opportunity);

        const rawStorylets = await getLocationStorylets(storyId, character.currentLocationId);
        locationStorylets = rawStorylets.map(s => engine.renderStorylet(s) as Storylet);
        
        // Build maps
        locationStorylets.forEach(s => visibleStoryletsMap[s.id] = s);
        initialHand.forEach(o => visibleOpportunitiesMap[o.id] = o);
    }

    return (
        <main>
            <GameHub
                initialCharacter={sanitize(character)}
                initialLocation={sanitize(initialLocation)}
                initialHand={sanitize(initialHand)}
                locationStorylets={sanitize(locationStorylets)}
                availableCharacters={sanitize(charList)}
                
                qualityDefs={sanitize(gameData.qualities)}
                storyletDefs={sanitize(visibleStoryletsMap)}
                opportunityDefs={sanitize(visibleOpportunitiesMap)} 
                settings={sanitize(gameData.settings)}
                imageLibrary={gameData.images || {}}
                categories={sanitize(gameData.categories || {})}
                locations={sanitize(gameData.locations)} 
                regions={sanitize(gameData.regions || {})}
                storyId={storyId}
            />
        </main>
    );
}