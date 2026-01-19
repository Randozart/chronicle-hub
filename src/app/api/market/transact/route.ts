import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 
import { GameEngine } from '@/engine/gameEngine';
import { getWorldState } from '@/engine/worldService';
import { processAutoEquip } from '@/engine/resolutionService';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : 'guest';
    
    const { storyId, characterId, marketId, stallId, listingId, quantity, guestState } = await request.json();

    if (!quantity || quantity < 1) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });

    const gameData = await getContent(storyId);
    const worldState = await getWorldState(storyId);
    
    let character = null;
    if (userId === 'guest' && guestState) {
        character = guestState;
    } else {
        character = await getCharacter(userId, storyId, characterId);
    }
    
    
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    const currentLocation = gameData.locations[character.currentLocationId];
    const locationMarket = currentLocation?.marketId;
    const regionMarket = currentLocation?.regionId ? gameData.regions[currentLocation.regionId]?.marketId : null;
    
    if (locationMarket !== marketId && regionMarket !== marketId) {
        return NextResponse.json({ error: 'You are not at this market.' }, { status: 403 });
    }

    const market = gameData.markets[marketId];
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });

    const stall = market.stalls.find(s => s.id === stallId);
    if (!stall) return NextResponse.json({ error: 'Stall not found' }, { status: 404 });

    const listing = stall.listings.find(l => l.id === listingId);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    const engine = new GameEngine(character.qualities, gameData, character.equipment, worldState);
    
    if (listing.visible_if && !engine.evaluateCondition(listing.visible_if)) {
        return NextResponse.json({ error: 'Item not available.' }, { status: 403 });
    }
    if (listing.unlock_if && !engine.evaluateCondition(listing.unlock_if)) {
        return NextResponse.json({ error: 'Item is locked.' }, { status: 403 });
    }

    const unitPriceStr = engine.evaluateText(`{${listing.price}}`);
    const unitPrice = parseInt(unitPriceStr, 10);
    
    if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: 'Price calculation error.' }, { status: 500 });
    }

    const totalCost = unitPrice * quantity;
    
    const currencyId = listing.currencyId || market.defaultCurrencyId;
    const itemId = listing.qualityId;

    if (stall.mode === 'buy') {
        const currentFunds = engine.getEffectiveLevel(currencyId);
        
        if (currentFunds < totalCost) {
            return NextResponse.json({ error: `Cannot afford. Need ${totalCost} ${currencyId}, have ${currentFunds}.` }, { status: 400 });
        }

        const sourceTag = stall.source || `bought at ${stall.name}`;
        
        engine.applyEffects(`$${currencyId} -= ${totalCost}, $${itemId}[source:${sourceTag}] += ${quantity}`);
    } else {
        const currentItems = engine.getEffectiveLevel(itemId);
        
        if (currentItems < quantity) {
            return NextResponse.json({ error: `Not enough items. Need ${quantity}, have ${currentItems}.` }, { status: 400 });
        }

        engine.applyEffects(`$${itemId} -= ${quantity}, $${currencyId} += ${totalCost}`);
    }

    processAutoEquip(character, engine.changes, gameData);

    character.qualities = engine.getQualities();
    
    if (userId !== 'guest') {
        await saveCharacterState(character);
    }
    return NextResponse.json({ 
        success: true, 
        newQualities: character.qualities,
        equipment: character.equipment,
        message: stall.mode === 'buy' 
            ? `Bought ${quantity}x ${itemId} for ${totalCost} ${currencyId}`
            : `Sold ${quantity}x ${itemId} for ${totalCost} ${currencyId}`
    });
}