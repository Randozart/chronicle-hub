import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCharacter, saveCharacterState } from '@/engine/characterService';
import { getContent } from '@/engine/contentCache'; 
import { GameEngine } from '@/engine/gameEngine';
import { MarketDefinition, ShopStall, ShopListing } from '@/engine/models';

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = (session.user as any).id;
    const { storyId, characterId, marketId, stallId, listingId, quantity } = await request.json();

    if (!quantity || quantity < 1) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });

    // 1. Load State
    const gameData = await getContent(storyId);
    const character = await getCharacter(userId, storyId, characterId);
    if (!character) return NextResponse.json({ error: 'Character not found' }, { status: 404 });

    // 2. Validate Location (Anti-Teleport Hack)
    const currentLocation = gameData.locations[character.currentLocationId];
    const locationMarket = currentLocation?.marketId;
    const regionMarket = currentLocation?.regionId ? gameData.regions[currentLocation.regionId]?.marketId : null;
    
    if (locationMarket !== marketId && regionMarket !== marketId) {
        return NextResponse.json({ error: 'You are not at this market.' }, { status: 403 });
    }

    // 3. Find the Listing
    const market = gameData.markets[marketId];
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 });

    const stall = market.stalls.find(s => s.id === stallId);
    if (!stall) return NextResponse.json({ error: 'Stall not found' }, { status: 404 });

    const listing = stall.listings.find(l => l.id === listingId);
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

    // 4. Check Requirements (Visible/Unlock)
    const engine = new GameEngine(character.qualities, gameData, character.equipment);
    
    if (listing.visible_if && !engine.evaluateCondition(listing.visible_if)) {
        return NextResponse.json({ error: 'Item not available.' }, { status: 403 });
    }
    if (listing.unlock_if && !engine.evaluateCondition(listing.unlock_if)) {
        return NextResponse.json({ error: 'Item is locked.' }, { status: 403 });
    }

    // 5. Calculate Price
    // FIX: use evaluateText
    const unitPriceStr = engine.evaluateText(`{${listing.price}}`);
    const unitPrice = parseInt(unitPriceStr, 10);
    
    if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ error: 'Price calculation error.' }, { status: 500 });
    }

    const totalCost = unitPrice * quantity;
    
    const currencyId = listing.currencyId || market.defaultCurrencyId;
    const itemId = listing.qualityId;

    // 6. EXECUTE TRANSACTION
    
    if (stall.mode === 'buy') {
        const currencyState = character.qualities[currencyId];
        const currentFunds = (currencyState && 'level' in currencyState) ? currencyState.level : 0;
        
        if (currentFunds < totalCost) {
            return NextResponse.json({ error: `Cannot afford. Need ${totalCost} ${currencyId}, have ${currentFunds}.` }, { status: 400 });
        }

        // FIX: use applyEffects
        engine.applyEffects(`$${currencyId} -= ${totalCost}`);
        
        const sourceTag = stall.source || `bought at ${stall.name}`;
        engine.applyEffects(`$${itemId}[source:${sourceTag}] += ${quantity}`);

    } else {
        const itemState = character.qualities[itemId];
        const currentItems = (itemState && 'level' in itemState) ? itemState.level : 0;
        
        if (currentItems < quantity) {
            return NextResponse.json({ error: `Not enough items. Need ${quantity}, have ${currentItems}.` }, { status: 400 });
        }

        engine.applyEffects(`$${itemId} -= ${quantity}`);
        engine.applyEffects(`$${currencyId} += ${totalCost}`);
    }

    // 7. Save
    character.qualities = engine.getQualities();
    await saveCharacterState(character);

    return NextResponse.json({ 
        success: true, 
        newQualities: character.qualities,
        message: stall.mode === 'buy' 
            ? `Bought ${quantity}x ${itemId} for ${totalCost} ${currencyId}`
            : `Sold ${quantity}x ${itemId} for ${totalCost} ${currencyId}`
    });
}