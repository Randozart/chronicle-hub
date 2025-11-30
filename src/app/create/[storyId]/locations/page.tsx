'use client';

import { useState, useEffect, use } from 'react';
import { LocationDefinition } from '@/engine/models';
import GameImage from '@/components/GameImage';
import { hasProperty, toggleProperty } from '@/utils/propertyHelpers';
import BehaviorCard from '../components/BehaviorCard';

export default function LocationsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [locations, setLocations] = useState<LocationDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/admin/locations?storyId=${storyId}`) // Dynamic!
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
            regionId: "default", 
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
                        storyId={storyId}
                    />
                ) : (
                    <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>Select a location</div>
                )}
            </div>
        </div>
    );
}


function LocationEditor({ initialData, onSave, onDelete, storyId }: { initialData: LocationDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handlePropToggle = (prop: string) => {
        const newProps = toggleProperty(form.properties, prop);
        handleChange('properties', newProps);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'locations', itemId: form.id, data: form })
            });
            onSave(form);
            alert("Saved!");
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${form.id}?`)) return;
        await fetch(`/api/admin/config?storyId=${storyId}&category=locations&itemId=${form.id}`, { method: 'DELETE' });
        onDelete(form.id);
    };

    return (
        <div className="space-y-4">
            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>

            <div className="form-group">
                <label className="form-label">Name</label>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Deck ID</label>
                    <input value={form.deck} onChange={e => handleChange('deck', e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                    <label className="form-label">Image Code</label>
                    <input value={form.image} onChange={e => handleChange('image', e.target.value)} className="form-input" />
                </div>
            </div>

            {/* --- NEW BEHAVIOR SECTION --- */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Behavior</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    
                    <BehaviorCard 
                        checked={hasProperty(form.properties, 'lock_equipment')} 
                        onChange={() => handlePropToggle('lock_equipment')} 
                        label="Lock Equipment" 
                        desc="Player cannot change gear here." 
                    />
                     <BehaviorCard 
                        checked={hasProperty(form.properties, 'safe_zone')} 
                        onChange={() => handlePropToggle('safe_zone')} 
                        label="Safe Zone" 
                        desc="No menace autofires? (Future)" 
                    />

                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Raw Properties</label>
                    <input value={form.properties || ''} onChange={e => handleChange('properties', e.target.value)} className="form-input" style={{ fontSize: '0.8rem' }} />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Unlock Condition (Logic)</label>
                <input 
                    value={form.unlockCondition || ''} 
                    onChange={e => handleChange('unlockCondition', e.target.value)} 
                    className="form-input" 
                    placeholder="$route_to_town >= 1"
                />
                <p className="special-desc">Requirement to travel here via Map.</p>
            </div>

            {/* Coordinates */}
            <div className="form-row" style={{ borderTop: '1px dashed #444', paddingTop: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                    <label className="form-label">Map Region ID</label>
                    <input value={form.regionId || ''} onChange={e => handleChange('regionId', e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                    <label className="form-label">Coords (X, Y)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="number" value={form.coordinates?.x || 0} onChange={e => handleChange('coordinates', { ...form.coordinates, x: parseInt(e.target.value) })} className="form-input" placeholder="X" />
                        <input type="number" value={form.coordinates?.y || 0} onChange={e => handleChange('coordinates', { ...form.coordinates, y: parseInt(e.target.value) })} className="form-input" placeholder="Y" />
                    </div>
                </div>
            </div>

            <div className="admin-form-footer">
                <button onClick={handleDelete} className="unequip-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}