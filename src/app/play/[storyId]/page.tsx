import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { checkLivingStories, getCharacter, getCharactersList } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 
import { getLocationStorylets, getEvent, getWorldState } from '@/engine/worldService';
import { Storylet, Opportunity, CharacterDocument } from '@/engine/models';
import GameHub from '@/components/GameHub';
import { GameEngine } from '@/engine/gameEngine';
import { getAutofireStorylets } from '@/engine/contentCache'; // Ensure this is imported
import CharacterLobby from '@/components/CharacterLobby';


const sanitize = (obj: any) => JSON.parse(JSON.stringify(obj));

export default async function GamePage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ storyId: string }>, 
    searchParams: Promise<{ charId?: string; menu?: string }>
}) {
    const { storyId } = await params;
    const { charId, menu } = await searchParams;
    
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/login');
    const userId = (session.user as any).id;

    const [charList, gameData, worldState] = await Promise.all([
        getCharactersList(userId, storyId),
        getContent(storyId),
        getWorldState(storyId)
    ]);

    if (charList.length === 0) redirect(`/play/${storyId}/creation`);

    let activeCharId = charId;
    if (!activeCharId && charList.length > 0 && !menu) {
        activeCharId = charList[0].characterId;
    }
    
    let character: CharacterDocument | null = null;
    if (activeCharId) {
        character = await getCharacter(userId, storyId, activeCharId);
        if (character) character = await checkLivingStories(character);
    }

    if (!character) {
        return (
             <div data-theme={gameData.settings.visualTheme || 'default'} className="theme-wrapper">
                <CharacterLobby 
                    availableCharacters={charList} 
                    storyId={storyId}
                    imageLibrary={gameData.images || {}}
                    locations={gameData.locations || {}}
                    settings={gameData.settings}
                    initialCharacter={sanitize(character)}
                />
            </div>
        );
    }

    let initialLocation = gameData.locations[character.currentLocationId];
    
    // --- AUTOFIRE LOGIC START ---
    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    const pendingAutofires = await getAutofireStorylets(storyId);
    
    const eligibleAutofires = pendingAutofires.filter(e => engine.evaluateCondition(e.autofire_if));
    
    // Sort: Must > High > Normal
    eligibleAutofires.sort((a, b) => {
        const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
        const pA = priority[a.urgency as keyof typeof priority || 'Normal'];
        const pB = priority[b.urgency as keyof typeof priority || 'Normal'];
        return pB - pA;
    });

    let activeEvent = null;
    if (eligibleAutofires.length > 0) {
        // Force the highest priority autofire event
        activeEvent = await getEvent(storyId, eligibleAutofires[0].id);
        if (activeEvent) {
             activeEvent = engine.renderStorylet(activeEvent) as Storylet;
        }
    }
    // --- AUTOFIRE LOGIC END ---

    let initialHand: Opportunity[] = [];
    if (!activeEvent) {
        const initialHandIds = character.opportunityHands?.[initialLocation?.deck] || [];
        const rawHand = (await Promise.all(initialHandIds.map((id: string) => getEvent(storyId, id)))).filter((item): item is Opportunity => item !== null && 'deck' in item);
        initialHand = rawHand.map(card => engine.renderStorylet(card) as Opportunity);
    }

    const rawStorylets = await getLocationStorylets(storyId, character.currentLocationId);
    const locationStorylets = rawStorylets.map(s => engine.renderStorylet(s) as Storylet);
    
    const visibleStoryletsMap: Record<string, Storylet> = {};
    const visibleOpportunitiesMap: Record<string, Opportunity> = {};
    locationStorylets.forEach(s => visibleStoryletsMap[s.id] = s);
    initialHand.forEach(o => visibleOpportunitiesMap[o.id] = o);
    
    // Also include the active autofire event in the definition map so it can render
    if (activeEvent) {
        visibleStoryletsMap[activeEvent.id] = activeEvent as Storylet;
    }
    
    let activeMessage = null;
    if (gameData.settings.systemMessage?.enabled && !character.acknowledgedMessages?.includes(gameData.settings.systemMessage.id)) {
        activeMessage = gameData.settings.systemMessage;
    }

    return (
        <main>
            <GameHub
                initialCharacter={sanitize(character)}
                initialLocation={sanitize(initialLocation)}
                initialHand={sanitize(initialHand)}
                locationStorylets={sanitize(locationStorylets)}
                availableCharacters={sanitize(charList)}
                
                // Pass the auto-detected event
                activeEvent={sanitize(activeEvent)}
                
                qualityDefs={sanitize(gameData.qualities)}
                storyletDefs={sanitize(visibleStoryletsMap)}
                opportunityDefs={sanitize(visibleOpportunitiesMap)} 
                settings={sanitize(gameData.settings)}
                deckDefs={sanitize(gameData.decks || {})} 
                markets={sanitize(gameData.markets || {})}
                imageLibrary={sanitize(gameData.images || {})}
                categories={sanitize(gameData.categories || {})}
                locations={sanitize(gameData.locations)} 
                regions={sanitize(gameData.regions || {})}
                storyId={storyId}
                worldState={sanitize(worldState)}
                systemMessage={sanitize(activeMessage)}
            />
        </main>
    );
}
