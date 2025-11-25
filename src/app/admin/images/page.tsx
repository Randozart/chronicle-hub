'use client';

import { useState, useEffect } from 'react';
import { ImageDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage';

export default function ImagesAdmin() {
    const [images, setImages] = useState<ImageDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/images?storyId=trader_johns_world')
            .then(res => res.json())
            .then(data => {
                const arr = Object.keys(data).map(key => ({ ...data[key], id: key }));
                setImages(arr);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleCreate = () => {
        const newId = prompt("Enter unique Image Key (e.g. 'sword_icon'):");
        if (!newId) return;
        if (newId.includes('.') || newId.includes(' ')) { alert("Invalid ID"); return; }
        if (images.find(q => q.id === newId)) { alert("Exists"); return; }

        const newImage: ImageDefinition = { id: newId, url: "/images/placeholder.png", alt: "New Image" };
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
            <div className="admin-list-col">
                <div className="list-header">
                    <span>Image Library</span>
                    <button className="new-btn" onClick={handleCreate}>+ New</button>
                </div>
                <div className="list-items">
                    {images.map(img => (
                        <div key={img.id} onClick={() => setSelectedId(img.id)} className={`list-item ${selectedId === img.id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '30px', height: '30px', flexShrink: 0 }}>
                                <GameImage code={img.id} imageLibrary={{ [img.id]: img }} alt="" type="icon" className="option-image" />
                            </div>
                            <span className="item-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.id}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="admin-editor-col">
                {selectedId ? (
                    <ImageEditor initialData={images.find(q => q.id === selectedId)!} onSave={handleSaveSuccess} onDelete={handleDeleteSuccess} />
                ) : (
                    <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>Select an asset to edit</div>
                )}
            </div>
        </div>
    );
}

function ImageEditor({ initialData, onSave, onDelete }: { initialData: ImageDefinition, onSave: (d: any) => void, onDelete: (id: string) => void }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: 'trader_johns_world', category: 'images', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); alert("Saved!"); } else { alert("Failed."); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.id}"?`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=trader_johns_world&category=images&itemId=${form.id}`, { method: 'DELETE' });
            if (res.ok) onDelete(form.id); else alert("Failed.");
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Edit Asset: <span style={{ color: '#61afef' }}>{form.id}</span></h2>
            
            <div className="form-group">
                <label className="form-label">Asset Key (ID)</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
                <label className="form-label">Image URL</label>
                <input value={form.url || ''} onChange={e => handleChange('url', e.target.value)} className="form-input" placeholder="https://..." />
            </div>

            <div className="form-group">
                <label className="form-label">Alt Text</label>
                <input value={form.alt || ''} onChange={e => handleChange('alt', e.target.value)} className="form-input" />
            </div>

            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#181a1f', borderRadius: '8px', border: '1px solid #333' }}>
                <label className="form-label" style={{ marginBottom: '1rem', textAlign: 'center', display: 'block' }}>Live Preview</label>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '150px', position: 'relative', border: '1px solid #444', margin: '0 auto' }}>
                            <GameImage code={form.id} imageLibrary={{ [form.id]: form }} alt="Preview" type="storylet" className="storylet-image" />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#777' }}>Storylet (3:4)</span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '200px', position: 'relative', border: '1px solid #444', margin: '0 auto' }}>
                            <GameImage code={form.id} imageLibrary={{ [form.id]: form }} alt="Preview" type="storylet" className="card-image" />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#777' }}>Card (3:2)</span>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2rem', display: 'flow-root' }}>
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ width: 'auto', padding: '0.75rem 1.5rem', float: 'left', borderRadius: '4px' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn"> {isSaving ? 'Saving...' : 'Save Changes'} </button>
            </div>
        </div>
    );
}