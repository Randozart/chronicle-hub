'use client';

import { useState, useMemo } from 'react';

interface ListItem {
    id: string;
    name?: string;
    [key: string]: any;
}

interface GroupOption {
    label: string;
    key: string; 
}

interface Props<T extends ListItem> {
    title: string;
    items: T[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    renderItem?: (item: T) => React.ReactNode;
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
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const getSafePath = (item: any, key: string): string => {
        if (item.folder) return String(item.folder);
        const val = item[key];
        if (!val) return "Uncategorized";
        const strVal = String(val).trim();
        if (strVal.startsWith('{')) {
            const parts = strVal.split('|');
            const defaultBranch = parts[parts.length - 1];
            return defaultBranch.replace(/}/g, '').trim() || "Dynamic";
        }
        return strVal;
    };
    const tree = useMemo(() => {
        const root: Record<string, any> = { _files: [] };
        const filtered = items.filter(i => 
            i.id.toLowerCase().includes(search.toLowerCase()) || 
            (i.name && i.name.toLowerCase().includes(search.toLowerCase()))
        );

        for (const item of filtered) {
            let rawPath = "Uncategorized";
            if (groupByKey) rawPath = getSafePath(item, groupByKey);
            const normalizedPath = rawPath.replace(/\\/g, '/'); 
            const path = normalizedPath.split('.').filter(Boolean); 
                       
            let current = root;
            for (const folder of path) {
                const cleanFolder = folder.trim(); 
                if (!current[cleanFolder]) current[cleanFolder] = { _files: [] };
                current = current[cleanFolder];
            }
            current._files.push(item);
        }
        return root;
    }, [items, search, groupByKey]);

    const toggleFolder = (path: string) => {
        const next = new Set(collapsedFolders);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        setCollapsedFolders(next);
    };
    const handleSelect = (id: string) => {
        onSelect(id);
        setIsMobileOpen(false);
    };
    const activeItem = items.find(i => i.id === selectedId);
    const activeLabel = activeItem ? (activeItem.name || activeItem.id) : "Select Item...";

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
                                    padding: '0.5rem', paddingLeft: `${depth * 0.8 + 0.5}rem`, 
                                    cursor: 'pointer', color: '#e5c07b', fontWeight: 'bold', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    backgroundColor: 'var(--tool-bg-dark)', borderBottom: '1px solid var(--tool-border)',
                                    userSelect: 'none'
                                }}
                            >
                                <span style={{ fontSize: '0.7rem' }}>{isCollapsed ? '📁' : '📂'}</span> {folder}
                            </div>
                            {!isCollapsed && renderTree(node[folder], fullPath, depth + 1)}
                        </div>
                    );
                })}
                {node._files.map((item: T) => (
                    <div 
                        key={item.id} 
                        onClick={() => handleSelect(item.id)}
                        className={`list-item ${selectedId === item.id ? 'active' : ''}`}
                        style={{ paddingLeft: `${depth * 0.8 + 1}rem` }}
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
        <>
            <button className="mobile-list-toggle-btn" onClick={() => setIsMobileOpen(true)}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Editing:</span>
                    <span>{activeLabel}</span>
                </div>
                <span>📂 Change</span>
            </button>
            <div className={`admin-list-col ${isMobileOpen ? 'mobile-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="mobile-list-header-row">
                    <button 
                        onClick={() => setIsMobileOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--tool-text-main)', fontSize: '1.2rem', cursor: 'pointer' }}
                    >
                        ← Back
                    </button>
                    <span style={{ fontWeight: 'bold', color: 'var(--tool-text-header)' }}>Select {title}</span>
                    <button className="new-btn" onClick={() => { onCreate(); setIsMobileOpen(false); }}>+ New</button>
                </div>
                <div className="list-header" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{title} ({items.length})</span>
                        <button className="new-btn" onClick={onCreate}>+ New</button>
                    </div>
                    {groupOptions.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--tool-text-dim)' }}>Group by:</span>
                            <select 
                                value={groupByKey} 
                                onChange={(e) => setGroupByKey(e.target.value)}
                                style={{ background: 'var(--tool-bg-input)', border: '1px solid #333', color: 'var(--tool-text-main)', borderRadius: '3px', padding: '2px' }}
                            >
                                <option value="">None (Flat)</option>
                                {groupOptions.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)' }}>
                    <input 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="form-input"
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                    />
                </div>
                <div className="list-items" style={{ flex: 1, overflowY: 'auto' }}>
                    {renderTree(tree)}
                </div>
            </div>
        </>
    );
}