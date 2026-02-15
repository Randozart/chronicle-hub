'use client';

import { useState, useMemo, useRef } from 'react';
import { GlobalAsset } from '@/engine/models';
import AssetEditModal from './AssetEditModal';

interface Props {
    assets: GlobalAsset[];
    onSelect?: (asset: GlobalAsset) => void;
    onRefresh: () => void;
    storyId: string; 
    mode?: 'picker' | 'manager';
    className?: string;
    style?: React.CSSProperties;
}

export default function AssetExplorer({ assets, onSelect, onRefresh, storyId, mode = 'manager', className, style }: Props) {
    const [currentPath, setCurrentPath] = useState<string>(''); // "" is root
    const [search, setSearch] = useState("");
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<GlobalAsset | undefined>(undefined);
    const [pendingUpload, setPendingUpload] = useState<File | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Build Virtual Folder Tree
    const { tree, currentFolderAssets } = useMemo(() => {
        const root: any = { _subfolders: {}, _files: [] };
        let filteredFiles: GlobalAsset[] = [];

        // Filter & Organize
        for (const asset of assets) {
            // Search Filter
            if (search && !asset.id.toLowerCase().includes(search.toLowerCase())) continue;

            // Determine Path
            // Fallback to 'misc' if no folder set
            const folderPath = asset.folder || 'misc';
            const parts = folderPath.split('/').filter(Boolean);

            // Add to Tree
            let pointer = root;
            for (const part of parts) {
                if (!pointer._subfolders[part]) pointer._subfolders[part] = { _subfolders: {}, _files: [] };
                pointer = pointer._subfolders[part];
            }
            pointer._files.push(asset);

            // Check if this file belongs in the Current View
            if (folderPath === (currentPath || 'misc')) {
                filteredFiles.push(asset);
            }
        }
        
        return { tree: root, currentFolderAssets: filteredFiles };
    }, [assets, search, currentPath]);

    // Navigation Helper
    const navigateTo = (path: string) => {
        setCurrentPath(path);
        setSearch(""); // Clear search when changing folders
    };

    const navigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setPendingUpload(e.target.files[0]);
        setEditingAsset(undefined);
        setEditModalOpen(true);
        e.target.value = ''; // Reset
    };

    const handleModalSave = async (id: string, folder: string, file?: File) => {
        // Upload new
        if (file) {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('storyId', storyId);
            formData.append('folder', folder);
            formData.append('category', 'uncategorized');
            formData.append('alt', id); // Use ID as alt/name for now
            
            setUploadProgress(0);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    setUploadProgress(Math.round((event.loaded / event.total) * 100));
                }
            };
            xhr.onload = () => {
                setUploadProgress(null);
                onRefresh();
            };
            xhr.open('POST', '/api/admin/assets/upload');
            xhr.send(formData);
        } 
        // Edit existing
        else if (editingAsset) {
            // Handle Folder Move
            if (folder !== editingAsset.folder) {
                await fetch('/api/admin/assets/manage', {
                    method: 'POST',
                    body: JSON.stringify({ action: 'move', assetIds: [editingAsset.id], targetFolder: folder })
                });
            }
            // Add rename logic here if needed
            
            onRefresh();
        }
    };

    const toggleSelection = (id: string, multi: boolean) => {
        const next = new Set(multi ? selectedIds : []);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
        if (onSelect && !multi) {
             // If in picker mode, immediate select
             const asset = assets.find(a => a.id === id);
             if (asset) onSelect(asset);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} assets? This cannot be undone.`)) return;
        await fetch('/api/admin/assets/manage', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', assetIds: Array.from(selectedIds) })
        });
        setSelectedIds(new Set());
        onRefresh();
    };

    const handleMoveAssets = async (targetFolder: string, idsToMove: string[]) => {
        // Fallback to selectedIds if specific IDs aren't passed
        const assetsToProcess = idsToMove || Array.from(selectedIds);
        
        if (assetsToProcess.length === 0) return;
        
        await fetch('/api/admin/assets/manage', {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'move', 
                assetIds: assetsToProcess, 
                targetFolder: targetFolder 
            })
        });
        
        // Clear selection
        setSelectedIds(new Set());
        onRefresh();
    };

    const handleRename = async (assetId: string) => {
        const newId = prompt("Rename asset ID:", assetId);
        if (!newId || newId === assetId) return;
        
        const res = await fetch('/api/admin/assets/manage', {
            method: 'POST',
            body: JSON.stringify({ action: 'rename', assetId, newId: newId.toLowerCase().replace(/[^a-z0-9_]/g, '_') })
        });
        
        if (res.ok) onRefresh();
        else alert("Rename failed. ID might exist.");
    };

    // Sub-Component: Folder Tree Render
    const renderFolderTree = (node: any, pathPrefix: string = "") => {
        const folders = Object.keys(node._subfolders).sort();
        return (
            <ul style={{ listStyle: 'none', paddingLeft: pathPrefix ? '1rem' : 0, margin: 0 }}>
                {folders.map(folder => {
                    const fullPath = pathPrefix ? `${pathPrefix}/${folder}` : folder;
                    const isActive = currentPath === fullPath;
                    return (
                        <li key={fullPath}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                            onDragLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.currentTarget.style.backgroundColor = 'transparent';
                                const data = e.dataTransfer.getData('asset-ids');
                                if (data) {
                                    handleMoveAssets(fullPath, JSON.parse(data));
                                }
                            }}
                        >
                            <button 
                                onClick={() => navigateTo(fullPath)}
                                style={{
                                    background: isActive ? 'var(--tool-accent)' : 'transparent',
                                    color: isActive ? '#000' : 'var(--tool-text-main)',
                                    border: 'none',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span>📁</span> {folder}
                            </button>
                            {(currentPath.startsWith(fullPath) || !pathPrefix) && 
                                renderFolderTree(node._subfolders[folder], fullPath)
                            }
                        </li>
                    );
                })}
            </ul>
        );
    };

    const getCurrentSubfolders = () => {
        const parts = currentPath ? currentPath.split('/') : [];
        let pointer = tree;
        for (const p of parts) {
            if (pointer._subfolders[p]) pointer = pointer._subfolders[p];
            else return [];
        }
        return Object.keys(pointer._subfolders).sort();
    };

    const visibleSubfolders = getCurrentSubfolders();

    return (
        <div className={className} style={{ display: 'flex', height: '100%', border: '1px solid var(--tool-border)', borderRadius: '4px', background: 'var(--tool-bg-dark)', overflow: 'hidden', ...style }}>
            
            {/* LEFT: Sidebar Tree */}
            <div style={{ width: '200px', borderRight: '1px solid var(--tool-border)', background: 'var(--tool-bg-sidebar)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--tool-border)', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                    FOLDERS
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    <button 
                        onClick={() => setCurrentPath('')}
                        style={{
                            background: !currentPath ? 'var(--tool-accent)' : 'transparent',
                            color: !currentPath ? '#000' : 'var(--tool-text-main)',
                            border: 'none', width: '100%', textAlign: 'left', padding: '4px 8px',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '5px'
                        }}
                    >
                        Root
                    </button>
                    {renderFolderTree(tree)}
                </div>
            </div>

            {/* RIGHT: Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                
                {/* Toolbar */}
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--tool-border)', background: 'var(--tool-bg-header)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button onClick={navigateUp} disabled={!currentPath} style={{ opacity: !currentPath ? 0.3 : 1, cursor: 'pointer', border: '1px solid var(--tool-border)', background: 'var(--tool-bg-input)', borderRadius: '4px', padding: '2px 8px' }}>
                        ⬆ Up
                    </button>
                    <div style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--tool-accent)' }}>
                        /{currentPath || ''}
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search assets..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
                    />
                    <div style={{ position: 'relative' }}>
                        <button 
                            className="save-btn" 
                            style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadProgress !== null}
                        >
                            {uploadProgress !== null ? `${uploadProgress}%` : '+ Upload'}
                        </button>
                        <input 
                            ref={fileInputRef} 
                            type="file" 
                            onChange={handleFileSelect} 
                            style={{ display: 'none' }} 
                            accept="image/*"
                        />
                    </div>
                </div>

                {/* Progress Bar */}
                {uploadProgress !== null && (
                    <div style={{ height: '4px', width: '100%', background: '#333' }}>
                        <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--success-color)', transition: 'width 0.2s' }} />
                    </div>
                )}
                
                {mode === 'manager' && selectedIds.size > 0 && (
                    <div style={{ padding: '0.5rem', background: 'var(--tool-accent)', color: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{selectedIds.size} selected</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setSelectedIds(new Set())} style={{ cursor: 'pointer', background: 'none', border: '1px solid #000', borderRadius: '4px', padding: '2px 8px' }}>Clear</button>
                            <button onClick={handleBulkDelete} style={{ cursor: 'pointer', background: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', color: 'var(--danger-color)', fontWeight: 'bold' }}>Delete</button>
                            <button 
                                onClick={() => {
                                    const newFolder = prompt("Enter new folder path (e.g. icons/spells):");
                                    if (newFolder) handleMoveAssets(newFolder, Array.from(selectedIds));
                                }}
                                style={{ cursor: 'pointer', background: 'var(--tool-bg-input)', border: '1px solid #999', borderRadius: '4px', padding: '2px 8px', color: '#fff' }}
                            >
                                Move to...
                            </button>
                            <span style={{ fontSize: '0.8rem', alignSelf: 'center' }}>Drag to folder to move</span>
                        </div>
                    </div>
                )}

                {/* Grid View */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                    
                    {/* Folders Grid */}
                    {visibleSubfolders.length > 0 && !search && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '2rem' }}>
                            {visibleSubfolders.map(sub => (
                                <div 
                                    key={sub}
                                    onClick={() => navigateTo(currentPath ? `${currentPath}/${sub}` : sub)}
                                    style={{ 
                                        aspectRatio: '1/0.8', border: '1px solid var(--tool-border)', borderRadius: '6px', 
                                        background: 'var(--tool-bg-input)', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center', gap: '5px'
                                    }}
                                    className="hover:border-blue-500"
                                >
                                    <span style={{ fontSize: '2rem' }}>📂</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>{sub}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Files Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                        {currentFolderAssets.length === 0 && visibleSubfolders.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--tool-text-dim)', padding: '2rem' }}>
                                Folder is empty.
                            </div>
                        )}
                        
                        {currentFolderAssets.map(asset => (
                            <div 
                                key={asset.id}
                                onClick={(e) => mode === 'manager' ? toggleSelection(asset.id, e.ctrlKey || e.metaKey) : onSelect?.(asset)}
                                draggable={mode === 'manager'}
                                onDragStart={(e) => {
                                    const idsToDrag = selectedIds.has(asset.id) ? Array.from(selectedIds) : [asset.id];
                                    e.dataTransfer.setData('asset-ids', JSON.stringify(idsToDrag));
                                    e.dataTransfer.effectAllowed = 'move';
                                }}
                                style={{ 
                                    aspectRatio: '1/1', 
                                    border: selectedIds.has(asset.id) ? '2px solid var(--tool-accent)' : '1px solid var(--tool-border)', 
                                    borderRadius: '4px', 
                                    background: '#000', 
                                    cursor: 'pointer', 
                                    overflow: 'hidden',
                                    position: 'relative',
                                    opacity: selectedIds.has(asset.id) ? 0.8 : 1
                                }}
                            >
                                <img src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={asset.id} />
                                
                                <div style={{ 
                                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                                    background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.7rem', 
                                    padding: '2px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <span style={{overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '80%'}}>{asset.id}</span>
                                    {mode === 'manager' && (
                                        <div style={{display:'flex', gap:'4px'}}>
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setEditModalOpen(true); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem', padding: 0 }}
                                            title="Edit Settings"
                                        >
                                            ⚙️
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRename(asset.id); }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '1rem', padding: 0 }}
                                            title="Rename"
                                        >
                                            ✎
                                        </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <AssetEditModal 
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleModalSave}
                initialAsset={editingAsset}
                uploadFile={pendingUpload}
                existingFolders={Object.keys(tree._subfolders || {})}
            />
        </div>
    );
}