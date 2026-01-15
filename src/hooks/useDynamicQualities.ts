import { useState, useEffect } from 'react';

export function useDynamicQualities(storyId: string) {
    const [dynamicIds, setDynamicIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!storyId) return;

        fetch(`/api/admin/qualities?storyId=${storyId}&mode=dynamic`)
            .then(res => res.json())
            .then((ids: string[]) => {
                setDynamicIds(new Set(ids));
            })
            .catch(err => console.error("Failed to load dynamic qualities:", err));
    }, [storyId]);

    return dynamicIds;
}