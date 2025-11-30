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

    const gameData = await getContent(storyId);

    // If itemId is null, we are UNEQUIPPING
    if (!itemId) {
        const currentItem = character.equipment[slot];
        if (currentItem) {
            const currentDef = gameData.qualities[currentItem];
            // SECURITY CHECK: Is it cursed?
            if (currentDef?.properties?.includes('cursed')) {
                 return NextResponse.json({ error: 'You cannot unequip a cursed item.' }, { status: 403 });
            }
        }
        
        character.equipment[slot] = null;
        await saveCharacterState(character);
        return NextResponse.json({ success: true, character });
    }

    // If itemId is present, we are EQUIPPING
    const itemDef = gameData.qualities[itemId];

    if (!itemDef) {
        return NextResponse.json({ error: 'Item definition not found' }, { status: 404 });
    }

    // 1. Validation: Does the player own this item?
    const ownedState = character.qualities[itemId];
    const amountOwned = (ownedState && 'level' in ownedState) ? ownedState.level : 0;
    
    if (amountOwned < 1) {
        return NextResponse.json({ error: 'You do not own this item.' }, { status: 403 });
    }

    // 2. Validation: Is this item actually equipable?
    if (itemDef.type !== 'E') {
        return NextResponse.json({ error: 'This item cannot be equipped.' }, { status: 400 });
    }

    // 3. Validation: Does the item fit in this slot?
    // We expect itemDef.category to be "body" or "head, something_else"
    const allowedSlots = itemDef.category?.split(',').map(s => s.trim()) || [];
    if (!allowedSlots.includes(slot)) {
        return NextResponse.json({ error: `This item does not go in the ${slot} slot.` }, { status: 400 });
    }

    // Apply change
    character.equipment[slot] = itemId;
    
    await saveCharacterState(character);
    return NextResponse.json({ success: true, character });
}