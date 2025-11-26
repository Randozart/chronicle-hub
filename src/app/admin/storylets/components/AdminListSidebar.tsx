'use client';

import { useState, useMemo } from 'react';

interface ListItem {
    id: string;
    name?: string;
    category?: string; // "npc.trader"
    [key: string]: any; // Allow other props
}

interface Props<T extends ListItem> {
    title: string;
    items: T[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    renderItem?: (item: T) => React.ReactNode; // Custom row renderer
}

export default function AdminListSidebar<T extends ListItem>({ 
    title, items, selectedId, onSelect, onCreate, renderItem 
}: Props<T>) {
    
    const [search, setSearch] = useState("");
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

    // 1. Filter & Organize Data
    const tree = useMemo(() => {
        const root: Record<string, any> = { _files: [] };

        // Filter first
        const filtered = items.filter(i => 
            i.id.toLowerCase().includes(search.toLowerCase()) || 
            (i.name && i.name.toLowerCase().includes(search.toLowerCase()))
        );

        // Build Tree
        for (const item of filtered) {
            const path = (item.category || "").split('.').filter(Boolean);
            let current = root;

            // Navigate down the tree
            for (const folder of path) {
                if (!current[folder]) current[folder] = { _files: [] };
                current = current[folder];
            }
            
            current._files.push(item);
        }
        
        // Sort keys logic could go here
        return root;
    }, [items, search]);

    const toggleFolder = (path: string) => {
        const next = new Set(collapsedFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setCollapsedFolders(next);
    };

    // Recursive Renderer
    const renderTree = (node: any, path: string = "", depth: number = 0) => {
        const keys = Object.keys(node).filter(k => k !== '_files').sort();
        
        return (
            <>
                {/* Render Folders */}
                {keys.map(folder => {
                    const fullPath = path ? `${path}.${folder}` : folder;
                    const isCollapsed = collapsedFolders.has(fullPath);
                    
                    return (
                        <div key={fullPath}>
                            <div 
                                onClick={() => toggleFolder(fullPath)}
                                style={{ 
                                    padding: '0.5rem', 
                                    paddingLeft: `${depth * 1 + 0.5}rem`, 
                                    cursor: 'pointer', 
                                    color: '#e5c07b', 
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
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

                {/* Render Files */}
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
            {/* Header + Create */}
            <div className="list-header">
                <span>{title} ({items.length})</span>
                <button className="new-btn" onClick={onCreate}>+ New</button>
            </div>

            {/* Search Bar */}
            <div style={{ padding: '0.5rem', borderBottom: '1px solid #333', background: '#21252b' }}>
                <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="form-input"
                    style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                />
            </div>

            {/* Scrollable Tree List */}
            <div className="list-items" style={{ flex: 1, overflowY: 'auto' }}>
                {renderTree(tree)}
            </div>
        </div>
    );
}