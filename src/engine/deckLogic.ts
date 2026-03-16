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
    if (character.dynamicQualities) {
        engine.dynamicQualities = { ...character.dynamicQualities };
        Object.assign(engine.worldContent.qualities, character.dynamicQualities);
    }

    const deckOps: Record<string, Opportunity[]> = {};
    allContent.forEach(c => {
        if ('deck' in c && c.deck) {
            if (!deckOps[c.deck]) deckOps[c.deck] = [];
            deckOps[c.deck].push(c as Opportunity);
        }
    });

    for (const deckId in gameData.decks) {
        let hand = character.opportunityHands?.[deckId] || [];
        const deckDef = gameData.decks[deckId];

        // Filter out invalid transient cards from hand for accurate counting
        const validHand = hand.filter(cardId => {
            const opportunity = deckOps[deckId]?.find(op => op.id === cardId);
            if (!opportunity) {
                // Card definition not found, remove it
                return false;
            }

            // Check if card has keep_if_invalid flag
            if (opportunity.keep_if_invalid) {
                // Keep the card even if invalid
                return true;
            }

            // Check draw_condition for transient cards
            if (opportunity.draw_condition) {
                const isValid = engine.evaluateCondition(opportunity.draw_condition);
                if (!isValid) {
                    // Transient card with failed draw_condition, remove it
                    return false;
                }
            }

            // Card is valid or has no draw_condition
            return true;
        });

        const deckSizeStr = engine.evaluateText(`{${deckDef.deck_size || '0'}}`);
        const deckSize = parseInt(deckSizeStr, 10) || 0;
        const currentCharges = character.deckCharges?.[deckId] ?? 0;

        const canAffordDraw = (deckSize <= 0 || currentCharges > 0);

        const ops = deckOps[deckId] || [];
        const hasCandidates = canAffordDraw && ops.some(op => {
             if (validHand.includes(op.id)) return false;
             if (op.draw_condition) {
                 return engine.evaluateCondition(op.draw_condition);
             }
             return true;
        });

        const isVisible = hasCandidates || validHand.length > 0;

        states[deckId] = { isVisible, hasCandidates };
    }
    return states;
}