'use client';

import { useState, useEffect } from 'react';
import { GlobalAsset } from '@/engine/models';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, folder: string, file?: File) => Promise<void>;
    initialAsset?: GlobalAsset; // If editing existing
    uploadFile?: File; // If uploading new
    existingFolders: string[];
}

export default function AssetEditModal({ isOpen, onClose, onSave, initialAsset, uploadFile, existingFolders }: Props) {
    const [id, setId] = useState("");
    const [folder, setFolder] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialAsset) {
                setId(initialAsset.id);
                setFolder(initialAsset.folder || "misc");
            } else if (uploadFile) {
                // Auto-generate safe ID from filename
                const cleanName = uploadFile.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                setId(cleanName);
                setFolder("misc"); // Default
            }
        }
    }, [isOpen, initialAsset, uploadFile]);

    const handleSubmit = async () => {
        if (!id || !folder) return;
        setIsSaving(true);
        await onSave(id, folder, uploadFile);
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', width: '400px', border: '1px solid var(--tool-border)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--tool-text-header)' }}>
                    {initialAsset ? 'Edit Asset Metadata' : 'Upload Asset'}
                </h3>
                
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Asset ID (Unique)</label>
                    <input 
                        value={id} 
                        onChange={e => setId(e.target.value)} 
                        className="form-input" 
                        disabled={!!initialAsset} // Prevent renaming ID here if complex
                        style={{ width: '100%' }}
                    />
                    <p className="special-desc">Used to reference this image in scripts.</p>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Folder Path</label>
                    <input 
                        value={folder} 
                        onChange={e => setFolder(e.target.value)} 
                        className="form-input" 
                        list="folder-options"
                        style={{ width: '100%' }}
                    />
                    <datalist id="folder-options">
                        {existingFolders.map(f => <option key={f} value={f} />)}
                    </datalist>
                    <p className="special-desc">Type a new path (e.g. <code>characters/goblins</code>) to create a new folder.</p>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button onClick={onClose} className="unequip-btn">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="save-btn">
                        {isSaving ? 'Saving...' : (initialAsset ? 'Update' : 'Upload')}
                    </button>
                </div>
            </div>
        </div>
    );
}