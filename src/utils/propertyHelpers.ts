// src/utils/propertyHelpers.ts
export const getTags = (input: string[] | undefined): string[] => {
    return input || [];
};
export const toggleProperty = (currentTags: string[] | undefined, tag: string, forceState?: boolean): string[] => {
    const tags = currentTags || [];
    const exists = tags.includes(tag);
    
    const shouldAdd = forceState !== undefined ? forceState : !exists;

    if (shouldAdd && !exists) {
        return [...tags, tag];
    } else if (!shouldAdd && exists) {
        return tags.filter(t => t !== tag);
    }
    
    return tags;
};
export const hasProperty = (currentTags: string[] | undefined, tag: string): boolean => {
    if (!currentTags) return false;
    return currentTags.includes(tag);
};

/**
 * Evaluates a market ID that may contain ScribeScript expressions.
 * If the marketId contains ScribeScript expressions (detected by '{' character),
 * it evaluates them using the provided GameEngine instance.
 * Returns undefined for empty string results or if no marketId is provided.
 */
export const evaluateMarketId = (
    marketId: string | undefined,
    engine: { evaluateText: (text: string, context?: { qid: string, state: any }) => string }
): string | undefined => {
    if (!marketId) return undefined;

    // Check if marketId contains ScribeScript expressions
    if (marketId.includes('{')) {
        const evaluated = engine.evaluateText(marketId).trim();
        return evaluated || undefined;
    }

    return marketId;
};