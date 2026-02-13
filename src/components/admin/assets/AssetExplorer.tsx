'use client';

import { useState, useMemo, useRef } from 'react';
import { GlobalAsset } from '@/engine/models';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Build Virtual Folder Tree ---
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
            // (If we are at root, we might want to show everything or just root files? 
            // Standard explorer behavior: show files in this exact folder)
            if (folderPath === (currentPath || 'misc')) {
                filteredFiles.push(asset);
            }
        }
        
        return { tree: root, currentFolderAssets: filteredFiles };
    }, [assets, search, currentPath]);

    // --- 2. Navigation Helper ---
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

    // --- Upload Logic ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        
        // Use XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('storyId', storyId);
        // Upload to current path (defaulting to 'misc' if root)
        formData.append('folder', currentPath || 'misc'); 
        formData.append('category', 'uncategorized');

        setUploadProgress(0);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                setUploadProgress(null);
                onRefresh(); // Reload assets
            } else {
                alert("Upload failed");
                setUploadProgress(null);
            }
        };

        xhr.onerror = () => {
            alert("Network error");
            setUploadProgress(null);
        };

        xhr.open('POST', '/api/admin/assets/upload');
        xhr.send(formData);
        
        // Reset input
        e.target.value = '';
    };

    // --- Sub-Component: Folder Tree Render ---
    const renderFolderTree = (node: any, pathPrefix: string = "") => {
        const folders = Object.keys(node._subfolders).sort();
        return (
            <ul style={{ listStyle: 'none', paddingLeft: pathPrefix ? '1rem' : 0, margin: 0 }}>
                {folders.map(folder => {
                    const fullPath = pathPrefix ? `${pathPrefix}/${folder}` : folder;
                    const isActive = currentPath === fullPath;
                    return (
                        <li key={fullPath}>
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
                                    gap: '6px'
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

    // Get subfolders of current path for the Main View
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
                        🏠 Root
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
                            onChange={handleUpload} 
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
                                onClick={() => onSelect && onSelect(asset)}
                                style={{ 
                                    aspectRatio: '1/1', border: '1px solid var(--tool-border)', borderRadius: '4px', 
                                    background: '#000', cursor: onSelect ? 'pointer' : 'default', overflow: 'hidden',
                                    position: 'relative'
                                }}
                                className={onSelect ? "hover:border-blue-500" : ""}
                            >
                                <img src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt={asset.id} />
                                <div style={{ 
                                    position: 'absolute', bottom: 0, left: 0, right: 0, 
                                    background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.7rem', 
                                    padding: '2px 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' 
                                }}>
                                    {asset.id}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}