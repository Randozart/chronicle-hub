import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyId, slot, itemId } = await request.json();

    const character = await getCharacter(userId, storyId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // Load definitions
    const gameData = await getContent(storyId);
    
    // 1. CHECK LOCATION LOCK
    // If the player is in a location like "Prison", they shouldn't be able to change gear.
    const locationDef = gameData.locations[character.currentLocationId];
    // We check if the properties string contains 'lock_equipment'
    // Note: property strings are comma-separated, e.g., "safe_zone, lock_equipment"
    if (locationDef?.properties?.includes('lock_equipment')) {
         return NextResponse.json({ error: 'You cannot change your equipment in this location.' }, { status: 403 });
    }

    // 2. HANDLE UNEQUIP
    // If itemId is null, we are UNEQUIPPING
    if (!itemId) {
        const currentItem = character.equipment[slot];
        
        // Check if the item currently equipped is Cursed
        if (currentItem) {
            const currentDef = gameData.qualities[currentItem];
            if (currentDef?.properties?.includes('cursed')) {
                 return NextResponse.json({ error: 'You cannot unequip a cursed item.' }, { status: 403 });
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

    // Validation: Does the player own this item?
    const ownedState = character.qualities[itemId];
    const amountOwned = (ownedState && 'level' in ownedState) ? ownedState.level : 0;
    
    if (amountOwned < 1) {
        return NextResponse.json({ error: 'You do not own this item.' }, { status: 403 });
    }

    // Validation: Is this item actually equipable?
    if (itemDef.type !== 'E') {
        return NextResponse.json({ error: 'This item cannot be equipped.' }, { status: 400 });
    }

    // Validation: Does the item fit in this slot?
    const allowedSlots = itemDef.category?.split(',').map(s => s.trim()) || [];
    if (!allowedSlots.includes(slot)) {
        return NextResponse.json({ error: `This item does not go in the ${slot} slot.` }, { status: 400 });
    }

    // Apply change
    character.equipment[slot] = itemId;
    
    await saveCharacterState(character);
    return NextResponse.json({ success: true, character });
}