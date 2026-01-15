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