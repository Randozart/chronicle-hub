import { CharacterDocument, DeckDefinition, WorldConfig, Opportunity } from './models';
import { GameEngine } from './gameEngine';
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
    const deckSize = parseInt(deckSizeStr, 10); 
    
    if (isNaN(deckSize) || deckSize <= 0) return character;
    
    // 2. Resolve Timer & Reference Time
    let timerValue = 0;
    // FIX: Default to deck's specific update time
    let lastRefTime = character.lastDeckUpdate?.[deckId] ? new Date(character.lastDeckUpdate[deckId]) : new Date();

    if (deckDef.timer === 'sync_actions') {
        timerValue = Number(gameData.settings.regenIntervalInMinutes) || 10;
        // FIX: If synced, use the ACTION timestamp as the anchor
        if (character.lastActionTimestamp) {
            lastRefTime = new Date(character.lastActionTimestamp);
        }
    } else {
        const val = tempEngine.evaluateText(`{${deckDef.timer}}`);
        timerValue = parseInt(val, 10);
    }

    if (isNaN(timerValue) || timerValue <= 0) return character;

    // Init state if missing
    if (!character.deckCharges) character.deckCharges = {};
    if (character.deckCharges[deckId] === undefined) character.deckCharges[deckId] = deckSize; 
    if (!character.lastDeckUpdate) character.lastDeckUpdate = {};

    // 3. Calculate Regen
    const now = new Date();
    // FIX: Add 5000ms (5s) buffer to account for network latency/server clock variance
    const msPassed = (now.getTime() - lastRefTime.getTime()) + 5000; 
    const minutesPassed = msPassed / (1000 * 60);
    
    if (minutesPassed < 0) return character; // Should be rare with buffer

    const chargesEarned = Math.floor(minutesPassed / timerValue);

    if (chargesEarned > 0) {
        const currentCharges = character.deckCharges[deckId] ?? 0;
        const newChargeTotal = Math.min(deckSize, currentCharges + chargesEarned);
        
        character.deckCharges[deckId] = newChargeTotal;
        
        // FIX: Update the timestamp. 
        // If synced, we don't strictly need to update lastDeckUpdate, but we do it to keep state clean.
        // We advance it by exact intervals to prevent time drift.
        const newTime = new Date(lastRefTime.getTime() + chargesEarned * timerValue * 60 * 1000);
        character.lastDeckUpdate[deckId] = newTime;
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

    // 1. Consume Charge
    const deckSizeStr = engine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10); 

    if (deckSize > 0) {
        const currentCharges = character.deckCharges?.[deckId] ?? 0;
        if (currentCharges <= 0) throw new Error("Deck is empty (no charges).");
        
        if (!character.deckCharges) character.deckCharges = {};
        character.deckCharges[deckId] = currentCharges - 1;
        
        // FIX: Logic for starting the timer
        const isSynced = deckDef.timer === 'sync_actions';
        
        // Only reset the deck-specific timer if:
        // A. We were at full capacity AND
        // B. We are NOT synced to actions (if synced, we ride the action timer)
        if (currentCharges === deckSize && !isSynced) {
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
        if (!('deck' in op) || op.deck !== deckId) return false;
        if (currentHand.includes(op.id)) return false; 
        
        if (op.draw_condition) {
            const meetsCondition = engine.evaluateCondition(op.draw_condition);
            if (!meetsCondition) return false;
        }
        
        return true;
    }) as Opportunity[];

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