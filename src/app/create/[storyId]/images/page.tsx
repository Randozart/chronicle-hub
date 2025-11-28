'use client';

import { useState, useEffect, use } from 'react';
import { ImageDefinition, ImageCategory } from '@/engine/models';
import GameImage from '@/components/GameImage';
import AdminListSidebar from '../storylets/components/AdminListSidebar';

export default function ImagesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [images, setImages] = useState<ImageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/admin/images?storyId=${storyId}`) // Dynamic!
            .then(res => res.json())
            .then(data => {
                const arr = Object.keys(data).map(key => ({ ...data[key], id: key }));
                setImages(arr);
            })
            .finally(() => setIsLoading(false));
    }, []);

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
    };

    const handleDeleteSuccess = (deletedId: string) => {
        setImages(prev => prev.filter(q => q.id !== deletedId));
        setSelectedId(null);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            {/* Sidebar with Grouping by Category */}
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
                                className="option-image" // Just to fill container
                            />
                        </div>
                        <span className="item-title" style={{ fontSize: '0.85rem' }}>{img.id}</span>
                    </div>
                )}
            />

            <div className="admin-editor-col">
                {selectedId ? (
                    <ImageEditor 
                        initialData={images.find(q => q.id === selectedId)!} 
                        onSave={handleSaveSuccess} 
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : (
                    <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>Select an asset</div>
                )}
            </div>
        </div>
    );
}

function ImageEditor({ initialData, onSave, onDelete, storyId }: { initialData: ImageDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    
    // Coordinate Tracker State (For Maps)
    const [coords, setCoords] = useState<{x:number, y:number} | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => { 
        setForm(initialData); 
        setCoords(null); 
    }, [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width; // 0 to 1
        const y = (e.clientY - rect.top) / rect.height; // 0 to 1
        setMousePos({ x, y });
    };

    const moveX = (mousePos.x - 0.5) * 20; 
    const moveY = (mousePos.y - 0.5) * 20;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, category: 'images', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); alert("Saved!"); } else { alert("Failed."); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.id}"?`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=${storyId}&category=images&itemId=${form.id}`, { method: 'DELETE' });
            if (res.ok) onDelete(form.id);
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleMapClick = (e: React.MouseEvent<HTMLImageElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        setCoords({ x, y });
        navigator.clipboard.writeText(`{ x: ${x}, y: ${y} }`);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                Edit Asset: {form.id}
            </h2>
            
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
                        <option value="background">Elysium Background (Parallax)</option>
                        <option value="portrait">Portrait</option>
                        <option value="map">Map (Full)</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Alt Text</label>
                <input value={form.alt || ''} onChange={e => handleChange('alt', e.target.value)} className="form-input" />
            </div>

            {/* --- CONTEXTUAL PREVIEW --- */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#181a1f', borderRadius: '8px', border: '1px solid #333' }}>
                <label className="form-label" style={{ marginBottom: '1rem', textAlign: 'center', display: 'block', color: '#61afef' }}>
                    Context Preview: {form.category?.toUpperCase() || 'RAW'}
                </label>
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    
                    {/* MAP VIEW (Special) */}
                    {form.category === 'map' ? (
                        <div style={{ position: 'relative', border: '2px solid #444', cursor: 'crosshair' }}>
                            <img 
                                src={form.url} 
                                alt="Map Preview"
                                style={{ maxWidth: '100%', display: 'block' }}
                                onClick={handleMapClick}
                            />
                            {coords && (
                                <div style={{ 
                                    position: 'absolute', left: coords.x, top: coords.y, 
                                    width: '10px', height: '10px', background: 'red', borderRadius: '50%', 
                                    transform: 'translate(-50%, -50%)', pointerEvents: 'none' 
                                }} />
                            )}
                            {coords && (
                                <div style={{ marginTop: '10px', textAlign: 'center', color: '#98c379' }}>
                                    Selected: X: {coords.x}, Y: {coords.y} <br/>
                                    <span style={{ fontSize: '0.8rem', color: '#777' }}>(Copy these to Location Editor)</span>
                                </div>
                            )}
                        </div>
                    ) : 
                    /* BACKGROUND VIEW (Parallax) */
                    form.category === 'background' ? (
                        <div 
                            onMouseMove={handleMouseMove}
                            style={{ 
                                width: '100%', height: '300px', 
                                position: 'relative', overflow: 'hidden', 
                                border: '1px solid #444', cursor: 'default' 
                            }}
                        >
                            {/* Scaled up slightly to allow movement without showing edges */}
                            <img 
                                src={form.url} 
                                alt="Parallax Preview"
                                style={{ 
                                    width: '110%', height: '110%', 
                                    objectFit: 'cover',
                                    transform: `translate(calc(-5% + ${-moveX}px), calc(-5% + ${-moveY}px))`
                                }}
                            />
                            <div style={{ position: 'absolute', bottom: 10, right: 10, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                                Move mouse to test parallax
                            </div>
                        </div>
                    ) :
                    /* BANNER VIEW */
                    form.category === 'banner' ? (
                        <div style={{ width: '100%', height: '200px', position: 'relative', border: '1px solid #444', overflow: 'hidden', background: '#000' }}>
                            {/* We use a standard img tag for the preview to ensure we see exactly what URL is doing */}
                            <img 
                                src={form.url} 
                                alt="Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                            />
                        </div>
                    ) :
                    /* ICON VIEW */
                    form.category === 'icon' ? (
                        <div style={{ width: '64px', height: '64px', border: '1px solid #444' }}>
                            <GameImage code={form.id} imageLibrary={{ [form.id]: form }} alt="Preview" type="icon" className="option-image" />
                        </div>
                    ) :

                    /* DEFAULT STORYLET VIEW */
                    (
                        <div style={{ width: '200px', border: '1px solid #444' }}>
                            <GameImage code={form.id} imageLibrary={{ [form.id]: form }} alt="Preview" type="storylet" className="storylet-image" />
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-form-footer">
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}