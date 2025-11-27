import { useMemo, useState } from 'react';

export function useGroupedList<T>(items: T[], groupByKey: string, search: string) {
    return useMemo(() => {
        const root: Record<string, T[]> = {};

        // Filter
        const filtered = items.filter((item: any) => {
            const name = item.name || item.id || "";
            return name.toLowerCase().includes(search.toLowerCase());
        });

        // Group
        for (const item of filtered) {
            let groupName = "Uncategorized";
            const val = (item as any)[groupByKey];
            
            if (val) {
                // If it's a category string "npc.trader", use that.
                // Or we could split by dot if we want deep trees, 
                // but for player UI, flat groups usually work better.
                groupName = String(val);
            }

            if (!root[groupName]) root[groupName] = [];
            root[groupName].push(item);
        }

        return root;
    }, [items, groupByKey, search]);
}