'use client';

import { useState, useMemo } from 'react';

interface ListItem {
    id: string;
    name?: string;
    [key: string]: any;
}

interface GroupOption {
    label: string;
    key: string; // The property name on the item, e.g. "category", "deck", "location"
}

interface Props<T extends ListItem> {
    title: string;
    items: T[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    renderItem?: (item: T) => React.ReactNode;
    
    // NEW: Grouping Options
    groupOptions?: GroupOption[]; 
    defaultGroupByKey?: string;
}

export default function AdminListSidebar<T extends ListItem>({ 
    title, items, selectedId, onSelect, onCreate, renderItem,
    groupOptions = [], defaultGroupByKey
}: Props<T>) {
    
    const [search, setSearch] = useState("");
    const [groupByKey, setGroupByKey] = useState<string>(defaultGroupByKey || (groupOptions[0]?.key) || "");
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    // 1. Build Tree
    const tree = useMemo(() => {
        const root: Record<string, any> = { _files: [] };

        const filtered = items.filter(i => 
            i.id.toLowerCase().includes(search.toLowerCase()) || 
            (i.name && i.name.toLowerCase().includes(search.toLowerCase()))
        );

        for (const item of filtered) {
            // Determine path based on selected Group Key
            let rawPath = "";
            if (groupByKey && item[groupByKey]) {
                rawPath = String(item[groupByKey]);
            } else if (groupByKey) {
                rawPath = "Uncategorized";
            }

            // Split by dot if it's a category, otherwise just use the value as a folder
            const path = rawPath.split('.').filter(Boolean);
            
            let current = root;
            for (const folder of path) {
                if (!current[folder]) current[folder] = { _files: [] };
                current = current[folder];
            }
            current._files.push(item);
        }
        return root;
    }, [items, search, groupByKey]);

    // ... toggleFolder and renderTree logic remains the same ...
    // (Copy renderTree from previous version)
    const toggleFolder = (path: string) => {
        const next = new Set(collapsedFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setCollapsedFolders(next);
    };

    const renderTree = (node: any, path: string = "", depth: number = 0) => {
        const keys = Object.keys(node).filter(k => k !== '_files').sort();
        
        return (
            <>
                {keys.map(folder => {
                    const fullPath = path ? `${path}.${folder}` : folder;
                    const isCollapsed = collapsedFolders.has(fullPath);
                    
                    return (
                        <div key={fullPath}>
                            <div 
                                onClick={() => toggleFolder(fullPath)}
                                style={{ 
                                    padding: '0.5rem', paddingLeft: `${depth * 1 + 0.5}rem`, 
                                    cursor: 'pointer', color: '#e5c07b', fontWeight: 'bold', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    backgroundColor: '#282c34', borderBottom: '1px solid #333'
                                }}
                            >
                                <span>{isCollapsed ? '📁' : '📂'}</span> {folder}
                            </div>
                            {!isCollapsed && renderTree(node[folder], fullPath, depth + 1)}
                        </div>
                    );
                })}
                {node._files.map((item: T) => (
                    <div 
                        key={item.id} 
                        onClick={() => onSelect(item.id)}
                        className={`list-item ${selectedId === item.id ? 'active' : ''}`}
                        style={{ paddingLeft: `${depth * 1 + 1}rem` }}
                    >
                        {renderItem ? renderItem(item) : (
                            <>
                                <span className="item-title">{item.name || item.id}</span>
                                <span className="item-subtitle" style={{ opacity: 0.5 }}>{item.id}</span>
                            </>
                        )}
                    </div>
                ))}
            </>
        );
    };

    return (
        <div className="admin-list-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div className="list-header" style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{title} ({items.length})</span>
                    <button className="new-btn" onClick={onCreate}>+ New</button>
                </div>
                
                {/* Group By Dropdown */}
                {groupOptions.length > 0 && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                        <span style={{ color: '#777' }}>Group by:</span>
                        <select 
                            value={groupByKey} 
                            onChange={(e) => setGroupByKey(e.target.value)}
                            style={{ background: '#181a1f', border: '1px solid #333', color: '#ccc', borderRadius: '3px', padding: '2px' }}
                        >
                            <option value="">None (Flat)</option>
                            {groupOptions.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Search */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid #333', background: '#21252b' }}>
                <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="form-input"
                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                />
            </div>

            {/* List */}
            <div className="list-items" style={{ flex: 1, overflowY: 'auto' }}>
                {renderTree(tree)}
            </div>
        </div>
    );
}