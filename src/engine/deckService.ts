// src/engine/deckService.ts

import { CharacterDocument, DeckDefinition, WorldConfig } from './models';
import { GameEngine } from './gameEngine';

export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldConfig
): CharacterDocument => {
    
    if (!deckDef.timer) return character;

    const deckId = deckDef.id;
    // We create a temporary engine just to evaluate the logic against the character's state
    const tempEngine = new GameEngine(character.qualities, gameData, character.equipment);
    
    // 1. Resolve Deck Size (Cap)
    // Supports logic: "{ 3 + $extra_slots }"
    const deckSizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10);

    // If deck_size is 0 or NaN, it means "Unlimited Draws" (or logic failed), so we don't regen.
    if (isNaN(deckSize) || deckSize <= 0) return character;
    
    // 2. Resolve Timer
    let timerValue = 0;

    if (deckDef.timer === 'sync_actions') {
        // Sync with global settings
        timerValue = Number(gameData.settings.regenIntervalInMinutes) || 10;
    } else {
        // Custom Timer with Logic support
        // e.g. "{ 60 - $speed }"
        const val = tempEngine.evaluateText(`{${deckDef.timer}}`);
        timerValue = parseInt(val, 10);
    }

    // Safety check to prevent infinite loops or divide-by-zero
    if (isNaN(timerValue) || timerValue <= 0) {
        return character;
    }

    // Initialize state if missing
    if (character.deckCharges === undefined) character.deckCharges = {};
    if (character.deckCharges[deckId] === undefined) {
        character.deckCharges[deckId] = deckSize; // Default to full if new
    }
    if (!character.lastDeckUpdate) character.lastDeckUpdate = {};

    // 3. Calculate Regeneration
    const lastUpdate = character.lastDeckUpdate[deckId] ? new Date(character.lastDeckUpdate[deckId]) : new Date(0);
    const now = new Date();

    const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    const chargesEarned = Math.floor(minutesPassed / timerValue);

    if (chargesEarned > 0) {
        const currentCharges = character.deckCharges[deckId] ?? 0;
        
        const newChargeTotal = Math.min(deckSize, currentCharges + chargesEarned);
        
        character.deckCharges[deckId] = newChargeTotal;
        
        // Advance timestamp by the exact time consumed to preserve partial progress
        character.lastDeckUpdate[deckId] = new Date(lastUpdate.getTime() + chargesEarned * timerValue * 60 * 1000);
    }

    return character;
}