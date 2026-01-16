import { CharacterDocument, WorldConfig, Opportunity, Storylet } from './models';
import { GameEngine } from './gameEngine';

export interface DeckState {
    isVisible: boolean;
    hasCandidates: boolean;
}

export const getDeckStates = (
    character: CharacterDocument,
    gameData: WorldConfig,
    allContent: (Storylet | Opportunity)[]
): Record<string, DeckState> => {
    const states: Record<string, DeckState> = {};
    const engine = new GameEngine(character.qualities, gameData, character.equipment);

    const deckOps: Record<string, Opportunity[]> = {};
    allContent.forEach(c => {
        if ('deck' in c && c.deck) {
            if (!deckOps[c.deck]) deckOps[c.deck] = [];
            deckOps[c.deck].push(c as Opportunity);
        }
    });

    for (const deckId in gameData.decks) {
        const hand = character.opportunityHands?.[deckId] || [];
        const deckDef = gameData.decks[deckId];
        
        const deckSizeStr = engine.evaluateText(`{${deckDef.deck_size || '0'}}`);
        const deckSize = parseInt(deckSizeStr, 10) || 0;
        const currentCharges = character.deckCharges?.[deckId] ?? 0;
        
        const canAffordDraw = (deckSize <= 0 || currentCharges > 0);

        const ops = deckOps[deckId] || [];
        const hasCandidates = canAffordDraw && ops.some(op => {
             if (hand.includes(op.id)) return false; 
             if (op.draw_condition) {
                 return engine.evaluateCondition(op.draw_condition);
             }
             return true;
        });

        const isVisible = hasCandidates || hand.length > 0;

        states[deckId] = { isVisible, hasCandidates };
    }
    return states;
}