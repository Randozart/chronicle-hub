// src/engine/deckService.ts

import { CharacterDocument, DeckDefinition, WorldContent, WorldSettings } from './models';
import { GameEngine } from './gameEngine';

/**
 * Calculates and applies regenerated deck charges for a specific deck.
 * This function MUTATES the character object that is passed in.
 * @param character The character document to update.
 * @param deckDef The definition of the deck being checked.
 * @param gameData The full static world content.
 * @returns The mutated character document.
 */
export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldContent
): CharacterDocument => {
    
    // If the deck has no timer, it doesn't regenerate. Skip it.
    if (!deckDef.timer) {
        return character;
    }

    const deckId = deckDef.id;

    // Use a temporary engine to resolve soft-defined settings
    const tempEngine = new GameEngine(character.qualities, gameData);
    
    // Resolve deck_size (the cap)
    const deckSize = typeof deckDef.deck_size === 'string'
        ? parseInt(tempEngine.evaluateBlock(`{${deckDef.deck_size}}`), 10)
        : 0;
    
    // Resolve timer (in minutes)
    let timerValue = 0;

    if (deckDef.timer === 'sync_actions') {
        // Use the Global Action Timer setting
        timerValue = gameData.settings.regenIntervalInMinutes;
    } else {
        // Parse custom number
        timerValue = parseInt(deckDef.timer || '0', 10);
    }
        
    if (isNaN(deckSize) || deckSize <= 0 || isNaN(timerValue) || timerValue <= 0) {
        // Deck is not configured for regeneration
        return character;
    }

    const lastUpdate = character.lastDeckUpdate?.[deckId] || new Date(0);
    const now = new Date();

    const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    const chargesEarned = Math.floor(minutesPassed / timerValue);

    if (chargesEarned > 0) {
        const currentCharges = character.deckCharges?.[deckId] ?? 0;
        
        const newChargeTotal = Math.min(deckSize, currentCharges + chargesEarned);

        if (!character.deckCharges) character.deckCharges = {};
        if (!character.lastDeckUpdate) character.lastDeckUpdate = {};

        character.deckCharges[deckId] = newChargeTotal;
        character.lastDeckUpdate[deckId] = new Date(lastUpdate.getTime() + chargesEarned * timerValue * 60 * 1000);
        
        console.log(`[Deck] Regenerated ${newChargeTotal - currentCharges} charges for deck '${deckId}'. New total: ${newChargeTotal}`);
    }

    return character;
}