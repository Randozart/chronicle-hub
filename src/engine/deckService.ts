import { CharacterDocument, DeckDefinition, WorldConfig, Opportunity } from './models';
import { GameEngine } from './gameEngine';
// We use require here to avoid circular dependency issues with contentCache if it imports models
const { getStorylets } = require('@/engine/contentCache');

export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldConfig
): CharacterDocument => {
    
    if (!deckDef.timer) return character;

    const deckId = deckDef.id;
    const tempEngine = new GameEngine(character.qualities, gameData, character.equipment);
    
    // 1. Resolve Deck Size
    const deckSizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10); // 0 = Unlimited

    // If deck is unlimited, we don't need to regen charges
    if (isNaN(deckSize) || deckSize <= 0) return character;
    
    // 2. Resolve Timer
    let timerValue = 0;
    if (deckDef.timer === 'sync_actions') {
        timerValue = Number(gameData.settings.regenIntervalInMinutes) || 10;
    } else {
        const val = tempEngine.evaluateText(`{${deckDef.timer}}`);
        timerValue = parseInt(val, 10);
    }

    if (isNaN(timerValue) || timerValue <= 0) return character;

    // Init state
    if (!character.deckCharges) character.deckCharges = {};
    // If undefined, default to FULL deck (new deck logic)
    if (character.deckCharges[deckId] === undefined) character.deckCharges[deckId] = deckSize; 
    if (!character.lastDeckUpdate) character.lastDeckUpdate = {};

    // 3. Calculate Regen
    const lastUpdate = character.lastDeckUpdate[deckId] ? new Date(character.lastDeckUpdate[deckId]) : new Date();
    const now = new Date();

    const minutesPassed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    
    // Logic check: if minutesPassed is negative or insanely high, reset
    if (minutesPassed < 0) {
        character.lastDeckUpdate[deckId] = now;
        return character;
    }

    const chargesEarned = Math.floor(minutesPassed / timerValue);

    if (chargesEarned > 0) {
        const currentCharges = character.deckCharges[deckId] ?? 0;
        const newChargeTotal = Math.min(deckSize, currentCharges + chargesEarned);
        
        character.deckCharges[deckId] = newChargeTotal;
        character.lastDeckUpdate[deckId] = new Date(lastUpdate.getTime() + chargesEarned * timerValue * 60 * 1000);
    }

    return character;
};

export const drawCards = async (
    character: CharacterDocument,
    deckId: string,
    gameData: WorldConfig
): Promise<CharacterDocument> => {
    
    const deckDef = gameData.decks[deckId];
    if (!deckDef) throw new Error(`Deck definition '${deckId}' not found.`);

    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    // 1. Consume Charge (if finite)
    const deckSizeStr = engine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10); // 0 = Unlimited

    if (deckSize > 0) {
        const currentCharges = character.deckCharges?.[deckId] ?? 0;
        if (currentCharges <= 0) throw new Error("Deck is empty (no charges).");
        
        // Decrement charge
        if (!character.deckCharges) character.deckCharges = {};
        character.deckCharges[deckId] = currentCharges - 1;
        
        // If we were at full cap, start the timer now
        if (currentCharges === deckSize) {
            if (!character.lastDeckUpdate) character.lastDeckUpdate = {};
            character.lastDeckUpdate[deckId] = new Date();
        }
    }

    // 2. Check Hand Size
    const handSizeStr = engine.evaluateText(`{${deckDef.hand_size || 3}}`);
    const handSize = parseInt(handSizeStr, 10) || 3;

    if (!character.opportunityHands) character.opportunityHands = {};
    const currentHand = character.opportunityHands[deckId] || [];

    if (currentHand.length >= handSize) {
        throw new Error("Hand is full.");
    }

    // 3. Filter Candidates
    const allContent = await getStorylets(character.storyId);
    
    const candidates = allContent.filter((op: any) => {
        // Must match Deck ID exactly
        if (!('deck' in op) || op.deck !== deckId) return false;
        
        // Must not be in hand already
        if (currentHand.includes(op.id)) return false; 
        
        // Must meet draw conditions
        if (op.draw_condition) {
            const meetsCondition = engine.evaluateCondition(op.draw_condition);
            if (!meetsCondition) {
                // console.log(`[Deck] Skipping ${op.id}: Condition '${op.draw_condition}' failed.`);
                return false;
            }
        }
        
        return true;
    }) as Opportunity[];

    console.log(`[Deck] Drawing from '${deckId}'. Found ${candidates.length} eligible cards.`);

    if (candidates.length === 0) {
        throw new Error("No eligible cards available in this deck.");
    }

    // 4. Weighted Random
    const weightedCandidates: Opportunity[] = [];
    const weights: Record<string, number> = {
        "Always": 1000, 
        "Frequent": 20,
        "Standard": 10,
        "Infrequent": 5,
        "Rare": 2
    };

    candidates.forEach(op => {
        const w = weights[op.frequency || "Standard"] || 10;
        for(let i=0; i<w; i++) weightedCandidates.push(op);
    });

    const drawnCard = weightedCandidates[Math.floor(Math.random() * weightedCandidates.length)];

    // 5. Update Hand
    character.opportunityHands[deckId] = [...currentHand, drawnCard.id];

    return character;
};