import { CharacterDocument, DeckDefinition, WorldContent } from './models';
import { GameEngine } from './gameEngine';

export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldContent
): CharacterDocument => {
    
    if (!deckDef.timer) {
        return character;
    }

    const deckId = deckDef.id;
    
    // 1. Resolve Deck Size
    // Use a temporary engine to resolve soft-defined settings
    const tempEngine = new GameEngine(character.qualities, gameData);
    
    const deckSize = typeof deckDef.deck_size === 'string'
        ? parseInt(tempEngine.evaluateBlock(`{${deckDef.deck_size}}`), 10)
        : 0;
    
    // 2. Resolve Timer
    let timerValue = 0;

    if (deckDef.timer === 'sync_actions') {
        // Use the Global Action Timer setting
        // Ensure we parse it safely
        timerValue = Number(gameData.settings.regenIntervalInMinutes) || 10;
    } else {
        // Custom Timer (Logic or Number)
        const val = tempEngine.evaluateBlock(`{${deckDef.timer}}`);
        timerValue = parseInt(val, 10);
    }
    
    if (isNaN(deckSize) || deckSize <= 0 || isNaN(timerValue) || timerValue <= 0) {
        return character;
    }

    // 3. Calculate Regeneration
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
        // Advance the timestamp by exactly the amount of time used, 
        // so we don't lose "partial minutes" progress.
        character.lastDeckUpdate[deckId] = new Date(lastUpdate.getTime() + chargesEarned * timerValue * 60 * 1000);
        
        // console.log(`[Deck] Regenerated ${newChargeTotal - currentCharges} charges for deck '${deckId}'.`);
    }

    return character;
}