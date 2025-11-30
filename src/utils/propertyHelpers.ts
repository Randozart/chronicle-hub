export const toggleProperty = (currentStr: string | undefined, property: string, forceState?: boolean): string => {
    const tags = (currentStr || '').split(',').map(s => s.trim()).filter(Boolean);
    const exists = tags.includes(property);
    
    // If forceState is provided, use it. Otherwise toggle.
    const shouldAdd = forceState !== undefined ? forceState : !exists;

    if (shouldAdd && !exists) {
        return [...tags, property].join(', ');
    } else if (!shouldAdd && exists) {
        return tags.filter(t => t !== property).join(', ');
    }
    
    return tags.join(', '); // No change
};

export const hasProperty = (currentStr: string | undefined, property: string): boolean => {
    if (!currentStr) return false;
    const tags = currentStr.split(',').map(s => s.trim());
    return tags.includes(property);
};