'use client';

import { useState, useEffect } from 'react';
import { LocationDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage';

export default function LocationsAdmin() {
    const [locations, setLocations] = useState<LocationDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/locations?storyId=trader_johns_world')
            .then(res => res.json())
            .then(data => {
                const arr = Object.values(data).map((q: any) => q);
                setLocations(arr);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleCreate = () => {
        const newId = prompt("Enter Location ID (e.g. 'village_square'):");
        if (!newId) return;
        if (locations.find(l => l.id === newId)) { alert("Exists"); return; }

        const newLoc: LocationDefinition = {
            id: newId,
            name: "New Location",
            image: "",
            deck: "village_deck",
            map: "default", 
            coordinates: { x: 0, y: 0 } 
        };
        setLocations(prev => [...prev, newLoc]);
        setSelectedId(newId);
    };

    const handleSaveSuccess = (updated: LocationDefinition) => {
        setLocations(prev => prev.map(l => l.id === updated.id ? updated : l));
    };

    const handleDeleteSuccess = (id: string) => {
        setLocations(prev => prev.filter(l => l.id !== id));
        setSelectedId(null);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <div className="admin-list-col">
                <div className="list-header">
                    <span>Locations</span>
                    <button className="new-btn" onClick={handleCreate}>+ New</button>
                </div>
                <div className="list-items">
                    {locations.map(loc => (
                        <div 
                            key={loc.id} 
                            onClick={() => setSelectedId(loc.id)}
                            className={`list-item ${selectedId === loc.id ? 'active' : ''}`}
                        >
                            <span className="item-title">{loc.name}</span>
                            <span className="item-subtitle">{loc.id}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="admin-editor-col">
                {selectedId ? (
                    <LocationEditor 
                        initialData={locations.find(l => l.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                    />
                ) : (
                    <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>Select a location</div>
                )}
            </div>
        </div>
    );
}

function LocationEditor({ initialData, onSave, onDelete }: { initialData: LocationDefinition, onSave: (d: any) => void, onDelete: (id: string) => void }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
            setForm(prev => ({ ...prev, [field]: val }));
        };
        
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: 'trader_johns_world', category: 'locations', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); alert("Saved!"); } else { alert("Failed."); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.id}"?`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=trader_johns_world&category=locations&itemId=${form.id}`, { method: 'DELETE' });
            if (res.ok) onDelete(form.id);
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Edit: {form.name}</h2>
            
            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>

            <div className="form-group">
                <label className="form-label">Name</label>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
                <label className="form-label">Assigned Deck ID</label>
                <input value={form.deck} onChange={e => handleChange('deck', e.target.value)} className="form-input" placeholder="deck_id" />
            </div>

            <div className="form-group">
                <label className="form-label">Image Code</label>
                <input value={form.image} onChange={e => handleChange('image', e.target.value)} className="form-input" />
            </div>

            {/* NEW MAP FIELDS */}
            <div className="form-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #444' }}>
                <div className="form-group">
                    <label className="form-label">Region ID</label>
                    <input 
                        value={form.map || ''} 
                        onChange={e => handleChange('regionId', e.target.value)} 
                        className="form-input" 
                        placeholder="london"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Coordinates (X, Y)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                            type="number" 
                            value={form.coordinates?.x || 0} 
                            onChange={e => handleChange('coordinates', { ...form.coordinates, x: parseInt(e.target.value) })} 
                            className="form-input" 
                            placeholder="X"
                        />
                        <input 
                            type="number" 
                            value={form.coordinates?.y || 0} 
                            onChange={e => handleChange('coordinates', { ...form.coordinates, y: parseInt(e.target.value) })} 
                            className="form-input" 
                            placeholder="Y"
                        />
                    </div>
                </div>
            </div>

            {/* Preview Image */}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #444', margin: '0 auto' }}>
                    <GameImage 
                        code={form.image} 
                        imageLibrary={{}} // In a real app, pass the full library here
                        alt="Preview" 
                        type="location" 
                        className="location-image" 
                    />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.5rem' }}>Icon Preview</p>
            </div>

            <div style={{ marginTop: '2rem', display: 'flow-root' }}>
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ float: 'left' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}