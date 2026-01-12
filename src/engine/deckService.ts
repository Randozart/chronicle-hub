import { CharacterDocument, DeckDefinition, WorldConfig, Opportunity } from './models';
import { GameEngine } from './gameEngine';
const { getStorylets } = require('@/engine/contentCache');

export const regenerateAllDecks = (
    character: CharacterDocument,
    gameData: WorldConfig
): CharacterDocument => {
    if (!gameData.decks) return character;
    
    for (const deckId in gameData.decks) {
        character = regenerateDeckCharges(character, gameData.decks[deckId], gameData);
    }
    return character;
};

export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldConfig
): CharacterDocument => {
    
    if (!deckDef.timer) return character;

    const deckId = deckDef.id;
    const tempEngine = new GameEngine(character.qualities, gameData, character.equipment);
    
    const deckSizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10); 
    
    if (isNaN(deckSize) || deckSize <= 0) return character;
    
    let timerValue = 0;
 
    let lastRefTime = character.lastDeckUpdate?.[deckId] ? new Date(character.lastDeckUpdate[deckId]) : new Date();

    if (deckDef.timer === 'sync_actions') {
        timerValue = Number(gameData.settings.regenIntervalInMinutes) || 10;
        
       
        if (!character.lastDeckUpdate?.[deckId] && character.lastActionTimestamp) {
            lastRefTime = new Date(character.lastActionTimestamp);
        }
    } else {
        const val = tempEngine.evaluateText(`{${deckDef.timer}}`);
        timerValue = parseInt(val, 10);
    }

    if (isNaN(timerValue) || timerValue <= 0) return character;

    if (!character.deckCharges) character.deckCharges = {};
    if (character.deckCharges[deckId] === undefined) character.deckCharges[deckId] = deckSize; 
    if (!character.lastDeckUpdate) character.lastDeckUpdate = {};

    const now = new Date();
    const msPassed = (now.getTime() - lastRefTime.getTime()) + 5000;
    const minutesPassed = msPassed / (1000 * 60);
    
    if (minutesPassed < 0) return character;

    const chargesEarned = Math.floor(minutesPassed / timerValue);

    if (chargesEarned > 0) {
        const currentCharges = character.deckCharges[deckId] ?? 0;
        
        if (currentCharges >= deckSize) return character;

        const newChargeTotal = Math.min(deckSize, currentCharges + chargesEarned);
        character.deckCharges[deckId] = newChargeTotal;
        
        if (newChargeTotal < deckSize) {
            const newTime = new Date(lastRefTime.getTime() + chargesEarned * timerValue * 60 * 1000);
            character.lastDeckUpdate[deckId] = newTime;
        } else {
             const newTime = new Date(lastRefTime.getTime() + chargesEarned * timerValue * 60 * 1000);
             character.lastDeckUpdate[deckId] = newTime;
        }
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

    const deckSizeStr = engine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10); 

    if (deckSize > 0) {
        const currentCharges = character.deckCharges?.[deckId] ?? 0;
        if (currentCharges <= 0) throw new Error("Deck is empty (no charges).");
        
        if (!character.deckCharges) character.deckCharges = {};
        character.deckCharges[deckId] = currentCharges - 1;
        
        if (currentCharges === deckSize) {
            if (!character.lastDeckUpdate) character.lastDeckUpdate = {};
            
            if (deckDef.timer === 'sync_actions' && character.lastActionTimestamp) {
                 character.lastDeckUpdate[deckId] = new Date(character.lastActionTimestamp);
            } else {
                 character.lastDeckUpdate[deckId] = new Date();
            }
        }
    }

    const handSizeStr = engine.evaluateText(`{${deckDef.hand_size || 3}}`);
    const handSize = parseInt(handSizeStr, 10) || 3;

    if (!character.opportunityHands) character.opportunityHands = {};
    const currentHand = character.opportunityHands[deckId] || [];

    if (currentHand.length >= handSize) {
        throw new Error("Hand is full.");
    }

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

    character.opportunityHands[deckId] = [...currentHand, drawnCard.id];

    return character;
};