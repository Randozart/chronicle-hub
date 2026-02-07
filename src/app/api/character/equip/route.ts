import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent, getAutofireStorylets } from '@/engine/contentCache';
import { GameEngine } from '@/engine/gameEngine';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : 'guest';
    
    const { storyId, slot, itemId, guestState } = await request.json();

    let character = null;
    if (userId === 'guest' && guestState) {
        character = guestState;
    } else {
        character = await getCharacter(userId, storyId);
    }

    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const gameData = await getContent(storyId);
    
    // Instantiate Engine early to check ScribeScript evaluated tags on equipment
    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    const locationDef = gameData.locations[character.currentLocationId];
    if (locationDef?.tags?.includes('lock_equipment')) {
         return NextResponse.json({ 
             success: false, 
             isLocked: true, 
             error: 'You cannot change your equipment in this location.' 
         });
    }

    if (!itemId) {
        const currentItem = character.equipment[slot];
        
        if (currentItem) {
            const currentDef = gameData.qualities[currentItem];
            // Evaluate tags using the engine to support ScribeScript conditions
            const evaluatedTags = (currentDef?.tags || []).map(tag => engine.evaluateText(tag));
            
            if (evaluatedTags.includes('bound')) {
                 const msg = currentDef.lock_message || 'You cannot unequip this item.';
                 return NextResponse.json({ success: false, error: msg, isLocked: true });
            }
        }

        character.equipment[slot] = null;
    } 
    else {
        const itemDef = gameData.qualities[itemId];

        if (!itemDef) {
            return NextResponse.json({ error: 'Item definition not found' }, { status: 404 });
        }

        const ownedState = character.qualities[itemId];
        const amountOwned = (ownedState && 'level' in ownedState) ? ownedState.level : 0;
        
        // Count how many of this specific item are already equipped in other slots
        const currentlyEquippedCount = Object.values(character.equipment).filter(id => id === itemId).length;

        if (amountOwned <= currentlyEquippedCount) {
            return NextResponse.json({ error: `You only own ${amountOwned} of this item.` }, { status: 403 });
        }

        if (itemDef.type !== 'E') {
            return NextResponse.json({ error: 'This item cannot be equipped.' }, { status: 400 });
        }

        const allowedSlots = itemDef.category?.split(',').map(s => s.trim()) || [];
        
        const isValidSlot = allowedSlots.some(cat => {
            if (slot === cat) return true;
            if (slot.startsWith(`${cat}_`)) return true;
            return false;
        });

        if (!isValidSlot) {
            return NextResponse.json({ error: `This item does not go in the ${slot} slot.` }, { status: 400 });
        }

        character.equipment[slot] = itemId;
    }
    
    // Try to find any autofires that are pending, since some items can redirect the character to a storylet. 
    const pendingAutofires = await getAutofireStorylets(storyId);
    
    const eligibleAutofires = pendingAutofires.filter(e => 
        ((!e as any).location || (e as any).location === character.currentLocationId) && 
        engine.evaluateCondition(e.autofire_if || "")
    );
    
    eligibleAutofires.sort((a, b) => {
        const priority = { 'Must': 3, 'High': 2, 'Normal': 1 };
        const pA = priority[a.urgency || 'Normal'] || 1;
        const pB = priority[b.urgency || 'Normal'] || 1;
        return pB - pA; 
    });

    const activeAutofire = eligibleAutofires[0];

    if (activeAutofire) {
        character.currentStoryletId = activeAutofire.id;
    } else {
        if (character.currentStoryletId) {
             const currentIsAutofire = pendingAutofires.some(s => s.id === character.currentStoryletId);
             
             if (currentIsAutofire) {
                 character.currentStoryletId = "";
             }
        }
    }
    
    if (userId !== 'guest') {
        await saveCharacterState(character);
    }
    
    return NextResponse.json({ 
        success: true, 
        character,
        redirectId: activeAutofire ? activeAutofire.id : undefined 
    });
}