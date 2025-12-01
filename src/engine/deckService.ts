import { CharacterDocument, DeckDefinition, WorldContent } from './models';
import { GameEngine } from './gameEngine';

export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldContent
): CharacterDocument => {
    
    if (!deckDef.timer) return character;

    const deckId = deckDef.id;
    const tempEngine = new GameEngine(character.qualities, gameData);
    
    // Resolve deck_size (The Cap)
    const deckSizeStr = tempEngine.evaluateBlock(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10);

    // If deck_size is 0 or NaN, it means "Unlimited Draws", so we never regenerate charges.
    // We just return.
    if (isNaN(deckSize) || deckSize <= 0) return character;
    
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

    if (character.deckCharges[deckId] === undefined) {
        character.deckCharges[deckId] = deckSize; // Start full if undefined? Or 0? 
        // Usually start full or 0 depending on game design. Let's assume 0 if not in creation.
        // Actually, Character Creation should have set this. 
        // If it's missing, let's default to 0 to prevent crashes.
        // character.deckCharges[deckId] = 0; 
        // Nevermind, we want to start with a full deck.
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