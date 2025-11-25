import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getContent, getAutofireStorylets } from '@/engine/contentCache'; // Use CACHE
import { getCharacter, saveCharacterState, regenerateActions } from '@/engine/characterService';
import { GameEngine } from '@/engine/gameEngine';
import { evaluateText, calculateSkillCheckChance } from '@/engine/textProcessor';
import { getEvent } from '@/engine/worldService'; // Import this!


export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyletId, optionId, storyId } = await request.json(); // Pass storyId from client
    
// 1. Efficient Data Load (Config only)
    const gameData = await getContent(storyId || 'trader_johns_world');
    let character = await getCharacter(userId, storyId || 'trader_johns_world');
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // 2. CONTEXT VALIDATION
    // FETCH THE EVENT FROM DB
    const storyletDef = await getEvent(storyId || 'trader_johns_world', storyletId);
    
    if (!storyletDef) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    // A. Location Check
    if ('location' in storyletDef && storyletDef.location) {
        if (character.currentLocationId !== storyletDef.location) {
            return NextResponse.json({ error: 'You are not in the correct location.' }, { status: 403 });
        }
    }

    // B. Hand Check (if it's a card)
    if ('deck' in storyletDef) {
         const deck = storyletDef.deck;
         const hand = character.opportunityHands?.[deck] || [];
         if (!hand.includes(storyletDef.id)) {
             return NextResponse.json({ error: 'This card is not in your hand.' }, { status: 403 });
         }
    }


    // 3. Process Action Economy (Existing logic...)
    if (gameData.settings.useActionEconomy) {
        character = await regenerateActions(character);
        const actionQid = gameData.settings.actionId.replace('$', '');
        const actionsState = character.qualities[actionQid] as any;
        if (actionsState.level < 1) return NextResponse.json({ error: 'No actions.' }, { status: 429 });
        actionsState.level -= 1;
    }

    // 4. Resolve Option
    const option = storyletDef.options.find(o => o.id === optionId);
    if (!option) return NextResponse.json({ error: 'Option not found' }, { status: 404 });

    const engine = new GameEngine(character.qualities, gameData, character.equipment);
    const engineResult = engine.resolveOption(storyletDef, option);
    
    // 5. Update Character State
    character.qualities = engine.getQualities();
    
    // Handle Card Discard
    if ('deck' in storyletDef) {
        const deck = storyletDef.deck;
        // Fix the type error by adding (id: string)
        character.opportunityHands[deck] = character.opportunityHands[deck].filter((id: string) => id !== storyletId);
    }

    // 6. AUTOFIRE CHECK (The "Must" Event System)
    // Check if the player should be forced somewhere else (e.g., Menace area)

    const autofireEvents = await getAutofireStorylets(storyId || 'trader_johns_world');
    let forcedRedirectId: string | null = null;

    for (const event of autofireEvents) {
        // We use the engine to evaluate the condition against the NEW qualities
        // Note: We create a new engine instance with the *new* qualities to be safe
        const checkEngine = new GameEngine(character.qualities, gameData);
        
        if (checkEngine.evaluateCondition(event.autofire_if)) {
            console.log(`[Autofire] Triggered: ${event.id}`);
            forcedRedirectId = event.id;
            break; // Trigger the first valid one we find
        }
    }
    
    // If an autofire triggered, it overrides the result's redirect
    const finalRedirectId = forcedRedirectId || engineResult.redirectId || character.currentStoryletId;

    // Update the character's location/storylet based on the result
    // Note: If forcedRedirectId is set, they are trapped in that storylet until they play an option that moves them.
    if (finalRedirectId) {
        character.currentStoryletId = finalRedirectId;
    }
    
    await saveCharacterState(character);

    const rawTitle = option.name; 
    
    const cleanTitle = evaluateText(rawTitle, character.qualities, gameData.qualities);
    const cleanBody = evaluateText(engineResult.body, character.qualities, gameData.qualities);


    return NextResponse.json({ 
        newQualities: character.qualities, 
        result: {
            ...engineResult,
            title: cleanTitle,
            body: cleanBody,
            redirectId: finalRedirectId // <--- Use the calculated final ID
        }
    });
}