// src/utils/propertyHelpers.ts

// Helper to safely get an array (handles undefined)
export const getTags = (input: string[] | undefined): string[] => {
    return input || [];
};

// Toggle a tag in the array
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

// Check if tag exists
export const hasProperty = (currentTags: string[] | undefined, tag: string): boolean => {
    if (!currentTags) return false;
    return currentTags.includes(tag);
};