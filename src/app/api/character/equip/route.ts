import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth";
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyId, slot, itemId } = await request.json();

    const character = await getCharacter(userId, storyId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const gameData = await getContent(storyId);
    
    // 1. CHECK LOCATION LOCK
    const locationDef = gameData.locations[character.currentLocationId];
    if (locationDef?.tags?.includes('lock_equipment')) {
         // Return specific flag to trigger the Modal instead of an Alert
         return NextResponse.json({ 
             success: false, 
             isLocked: true, 
             error: 'You cannot change your equipment in this location.' 
         });
    }

    // 2. HANDLE UNEQUIP
    if (!itemId) {
        const currentItem = character.equipment[slot];
        
        if (currentItem) {
            const currentDef = gameData.qualities[currentItem];
            if (currentDef?.tags?.includes('cursed')) {
                 const msg = currentDef.lock_message || 'You cannot unequip this item.';
                 return NextResponse.json({ success: false, error: msg, isLocked: true });
            }
        }

        character.equipment[slot] = null;
        await saveCharacterState(character);
        return NextResponse.json({ success: true, character });
    }

    // 3. HANDLE EQUIP
    const itemDef = gameData.qualities[itemId];

    if (!itemDef) {
        return NextResponse.json({ error: 'Item definition not found' }, { status: 404 });
    }

    const ownedState = character.qualities[itemId];
    const amountOwned = (ownedState && 'level' in ownedState) ? ownedState.level : 0;
    
    if (amountOwned < 1) {
        return NextResponse.json({ error: 'You do not own this item.' }, { status: 403 });
    }

    if (itemDef.type !== 'E') {
        return NextResponse.json({ error: 'This item cannot be equipped.' }, { status: 400 });
    }

    const allowedSlots = itemDef.category?.split(',').map(s => s.trim()) || [];
    if (!allowedSlots.includes(slot)) {
        return NextResponse.json({ error: `This item does not go in the ${slot} slot.` }, { status: 400 });
    }

    character.equipment[slot] = itemId;
    
    await saveCharacterState(character);
    return NextResponse.json({ success: true, character });
}