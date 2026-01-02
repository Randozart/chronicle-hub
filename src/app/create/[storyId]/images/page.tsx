'use client';

import { useState, useEffect, use } from 'react';
import { ImageDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import ImageUploader from './components/ImageUploader';
import { useToast } from '@/providers/ToastProvider';

export default function ImagesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [images, setImages] = useState<ImageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    
    const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 20 * 1024 * 1024 });

    useEffect(() => {
        fetch(`/api/admin/images?storyId=${storyId}`) 
            .then(res => res.json())
            .then(data => {
                const arr = Array.isArray(data) ? data : Object.keys(data).map(key => ({ ...data[key], id: key }));
                setImages(arr);
            })
            .finally(() => setIsLoading(false));

        fetch('/api/admin/usage')
            .then(res => res.json())
            .then(data => {
                if(data.usage !== undefined) {
                    setStorageUsage({ used: data.usage, limit: data.limit || (20 * 1024 * 1024) });
                }
            })
            .catch(() => console.log("Failed to fetch storage usage"));
            
    }, [storyId]);
    
    const handleUploadSuccess = (data: { image: ImageDefinition, usage: number }) => {
        setImages(prev => [...prev, data.image]);
        setSelectedId(data.image.id);
        
        if (data.usage !== undefined) {
            setStorageUsage(prev => ({ ...prev, used: data.usage }));
        }
        showToast("Image uploaded!", "success");
    };

    const handleStorageUpdate = (newUsage: number) => {
        setStorageUsage(prev => ({ ...prev, used: newUsage }));
    };

    const handleCreate = () => {
        const newId = prompt("Enter unique Image Key:");
        if (!newId) return;
        if (images.find(q => q.id === newId)) { alert("Exists"); return; }

        const newImage: ImageDefinition = {
            id: newId,
            url: "/images/placeholder.png",
            alt: "New Image",
            category: 'uncategorized'
        };
        setImages(prev => [...prev, newImage]);
        setSelectedId(newId);
    };

    const handleSaveSuccess = (updatedItem: ImageDefinition) => {
        setImages(prev => prev.map(q => q.id === updatedItem.id ? updatedItem : q));
        showToast("Asset info saved.", "success");
    };

    const handleDeleteSuccess = (deletedId: string) => {
        setImages(prev => prev.filter(q => q.id !== deletedId));
        setSelectedId(null);
        showToast("Asset deleted.", "info");
    };

    if (isLoading) return <div className="loading-container">Loading Assets...</div>;

    const usedMB = (storageUsage.used / (1024 * 1024)).toFixed(2);
    const limitMB = (storageUsage.limit / (1024 * 1024)).toFixed(0);
    const percent = Math.min(100, (storageUsage.used / storageUsage.limit) * 100);
    const isCritical = percent > 90;

    return (
        <div className="admin-split-view">
            {/* LEFT SIDEBAR (Mobile Drawer) */}
            <AdminListSidebar 
                title="Assets"
                items={images}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[{ label: "Category", key: "category" }]}
                defaultGroupByKey="category"
                renderItem={(img) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '24px', height: '24px', flexShrink: 0, overflow: 'hidden', borderRadius: '3px' }}>
                            <GameImage 
                                code={img.id} 
                                imageLibrary={{ [img.id]: img }} 
                                alt="" 
                                type="icon"
                                className="option-image" 
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="item-title" style={{ fontSize: '0.85rem' }}>{img.id}</span>
                            {img.size && <span style={{ fontSize: '0.65rem', color: '#666' }}>{(img.size / 1024).toFixed(0)} KB</span>}
                        </div>
                    </div>
                )}
            />

            {/* MAIN CONTENT AREA */}
            <div className="admin-editor-col">
                {/* Storage Indicator */}
                <div style={{ padding: '0.5rem 1rem', background: '#111', borderBottom: '1px solid var(--tool-border)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Storage:</span>
                    <div style={{ flex: 1, height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: isCritical ? '#e74c3c' : '#61afef',
                            transition: 'width 0.3s ease' 
                        }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: isCritical ? '#e74c3c' : '#ccc' }}>
                        {usedMB} / {limitMB} MB
                    </span>
                </div>

                <ImageUploader 
                    storyId={storyId} 
                    onUploadComplete={handleUploadSuccess} 
                    onStorageUpdate={handleStorageUpdate}
                />
                
                <hr style={{ borderColor: '#333', margin: '1.5rem 0' }} />
                
                {selectedId ? (
                    <ImageEditor 
                        key={selectedId} // Force remount on selection change
                        initialData={images.find(q => q.id === selectedId)!} 
                        onSave={handleSaveSuccess} 
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '20%' }}>
                        Select an asset from the list to edit details.
                    </div>
                )}
            </div>
        </div>
    );
}

function ImageEditor({ initialData, onSave, onDelete, storyId }: { initialData: ImageDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast(); 
    
    // Interaction State
    const [coords, setCoords] = useState<{x:number, y:number} | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => { 
        setForm(initialData); 
        setCoords(null); 
    }, [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };
    
    // GLOBAL SAVE TRIGGER
    useEffect(() => {
        const handleGlobalSave = () => handleSave();
        window.addEventListener('global-save-trigger', handleGlobalSave);
        return () => window.removeEventListener('global-save-trigger', handleGlobalSave);
    }, [form]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
    };
    const moveX = (mousePos.x - 0.5) * 20; 
    const moveY = (mousePos.y - 0.5) * 20;

    const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
        const xPx = Math.round(e.clientX - rect.left);
        const yPx = Math.round(e.clientY - rect.top);
        
        setForm(prev => ({ ...prev, focus: { x: xPct, y: yPct } }));
        setCoords({ x: xPx, y: yPx }); 
        
        if (form.category === 'map') {
            navigator.clipboard.writeText(`{ x: ${xPx}, y: ${yPx} }`);
            showToast("Coords copied to clipboard!", "info");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, category: 'images', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); } 
            else { showToast("Failed to save.", "error"); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.id}"? This cannot be undone.`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=${storyId}&category=images&itemId=${form.id}`, { method: 'DELETE' });
            if (res.ok) onDelete(form.id);
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>Edit Asset: {form.id}</h2>
                {form.size && (
                    <span style={{ fontSize: '0.8rem', background: '#222', padding: '2px 8px', borderRadius: '4px', color: '#98c379' }}>
                        {(form.size / 1024).toFixed(1)} KB
                    </span>
                )}
            </div>
            
            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Image URL</label>
                    <input 
                        value={form.url || ''} 
                        onChange={e => handleChange('url', e.target.value)}
                        className="form-input"
                        placeholder="https://..."
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Category</label>
                    <select 
                        value={form.category || 'uncategorized'} 
                        onChange={e => handleChange('category', e.target.value)}
                        className="form-select"
                    >
                        <option value="uncategorized">Uncategorized</option>
                        <option value="storylet">Storylet (3:4)</option>
                        <option value="icon">Icon (Square)</option>
                        <option value="banner">Banner (Wide)</option>
                        <option value="cover">Cover (16:9)</option>
                        <option value="background">Elysium Background (Parallax)</option>
                        <option value="portrait">Portrait</option>
                        <option value="map">Map (Full)</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Alt Text</label>
                <input 
                    value={form.alt || ''} 
                    onChange={e => handleChange('alt', e.target.value)} 
                    className="form-input" 
                    placeholder="Description for accessibility"
                />
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--tool-bg-input)', borderRadius: '8px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <label className="form-label" style={{ color: '#61afef' }}>
                        Visual Context Preview: {form.category?.toUpperCase() || 'RAW'}
                    </label>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                        Click image to set Focal Point
                    </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div 
                        style={{ position: 'relative', border: '2px solid #444', cursor: 'crosshair', display: 'inline-block', maxWidth: '100%' }}
                        onClick={(e: any) => handleImageClick(e)}
                    >
                        {form.category === 'background' ? (
                             <div onMouseMove={handleMouseMove} style={{ width: '500px', height: '300px', position: 'relative', overflow: 'hidden' }}>
                                <img 
                                    src={form.url} 
                                    alt="Preview"
                                    style={{ 
                                        width: '110%', height: '110%', objectFit: 'cover',
                                        transform: `translate(calc(-5% + ${-moveX}px), calc(-5% + ${-moveY}px))`
                                    }} 
                                />
                                <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
                                    Move mouse to test parallax
                                </div>
                             </div>
                        ) : (
                             <img 
                                src={form.url} 
                                alt="Preview"
                                style={{ 
                                    maxWidth: '100%', maxHeight: '500px', display: 'block',
                                    objectFit: 'contain' 
                                }} 
                            />
                        )}
                        {form.focus && (
                            <div style={{ 
                                position: 'absolute', 
                                left: `${form.focus.x}%`, 
                                top: `${form.focus.y}%`, 
                                width: '12px', height: '12px', 
                                background: 'rgba(255, 0, 0, 0.8)', 
                                border: '2px solid white',
                                borderRadius: '50%', 
                                transform: 'translate(-50%, -50%)', 
                                pointerEvents: 'none',
                                boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                            }} />
                        )}
                    </div>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: 'var(--tool-text-main)' }}>
                    Focal Point: {form.focus ? `X: ${form.focus.x}%, Y: ${form.focus.y}%` : 'Center (50%, 50%)'}
                    {form.category === 'map' && coords && <div style={{ color: '#98c379', marginTop: '4px' }}>Pixel Coords Copied: {coords.x}, {coords.y}</div>}
                </div>
            </div>

            <div className="admin-form-footer">
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}