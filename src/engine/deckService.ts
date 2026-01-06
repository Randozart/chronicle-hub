import { CharacterDocument, DeckDefinition, WorldConfig, Opportunity } from './models';
import { GameEngine } from './gameEngine';

/**
 * Regenerates deck charges based on time passed.
 */
export const regenerateDeckCharges = (
    character: CharacterDocument, 
    deckDef: DeckDefinition, 
    gameData: WorldConfig
): CharacterDocument => {
    
    if (!deckDef.timer) return character;

    const deckId = deckDef.id;
    // Create temp engine for logic evaluation
    const tempEngine = new GameEngine(character.qualities, gameData, character.equipment);
    
    // 1. Resolve Deck Size (Cap)
    const deckSizeStr = tempEngine.evaluateText(`{${deckDef.deck_size || '0'}}`);
    const deckSize = parseInt(deckSizeStr, 10);

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

    // Initialize state if missing
    if (!character.deckCharges) character.deckCharges = {};
    if (character.deckCharges[deckId] === undefined) character.deckCharges[deckId] = deckSize; 
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
        character.lastDeckUpdate[deckId] = new Date(lastUpdate.getTime() + chargesEarned * timerValue * 60 * 1000);
    }

    return character;
};

/**
 * Draws a card from the specified deck into the character's hand.
 */
export const drawCards = async (
    character: CharacterDocument,
    deckId: string,
    gameData: WorldConfig
): Promise<CharacterDocument> => {
    
    const deckDef = gameData.decks[deckId];
    if (!deckDef) throw new Error("Deck definition not found.");

    // 1. Init Engine
    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    // 2. Check Hand Size
    const handSizeStr = engine.evaluateText(`{${deckDef.hand_size || 3}}`);
    const handSize = parseInt(handSizeStr, 10) || 3;

    if (!character.opportunityHands) character.opportunityHands = {};
    const currentHand = character.opportunityHands[deckId] || [];

    if (currentHand.length >= handSize) {
        throw new Error("Hand is full.");
    }

    // 3. Filter Candidates
    // Note: In a real database, this would be a query. Here we filter in memory (cached content).
    // Candidates must: Belong to deck, Match criteria, Not be in hand (usually)
    // IMPORTANT: We filter opportunities from the "storylets" logic, which are stored as Opportunities in `gameData.storylets`?
    // Actually, `gameData` (WorldConfig) usually doesn't contain the raw list of opportunities in the type definition provided earlier.
    // However, usually `getContent` returns them in a different way or we access them via `location`.
    // *Assumption*: You have a way to access all opportunities. For now, we'll assume they are not in WorldConfig directly 
    // but fetched. Since this function is sync/async and we have `gameData`...
    // *Correction based on typical patterns*: `getContent` usually aggregates data. 
    // If opportunities aren't in `gameData`, we might need to fetch them. 
    // BUT, usually `drawCards` is called from a Route that has access. 
    // Let's assume `gameData` implies access to content. 
    // If `WorldConfig` doesn't have `opportunities`, we'll need to fetch them.
    // To solve the "Cannot find name" error cleanly, I will assume we fetch them via a helper or pass them in.
    // For this fix, I will mock the fetch from `getLocation` or assume passed. 
    // *Actually, looking at your ContentCache, `getStorylets` returns everything.*
    // I will import `getStorylets` here to be safe.
    
    const { getStorylets } = require('@/engine/contentCache'); 
    const allContent = await getStorylets(character.storyId);
    
    const candidates = allContent.filter((op: any) => {
        if (!('deck' in op) || op.deck !== deckId) return false;
        if (currentHand.includes(op.id)) return false; // Unique cards in hand
        
        // Check Logic
        if (op.draw_condition && !engine.evaluateCondition(op.draw_condition)) return false;
        
        return true;
    }) as Opportunity[];

    if (candidates.length === 0) {
        throw new Error("No cards available.");
    }

    // 4. Weighted Random
    const weightedCandidates: Opportunity[] = [];
    const weights: Record<string, number> = {
        "Always": 1000, // Should probably force draw, but for now high weight
        "Frequent": 20,
        "Standard": 10,
        "Infrequent": 5,
        "Rare": 2
    };

    candidates.forEach(op => {
        const w = weights[op.frequency] || 10;
        for(let i=0; i<w; i++) weightedCandidates.push(op);
    });

    const drawnCard = weightedCandidates[Math.floor(Math.random() * weightedCandidates.length)];

    // 5. Update Hand
    character.opportunityHands[deckId] = [...currentHand, drawnCard.id];

    return character;
};