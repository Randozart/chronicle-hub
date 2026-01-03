'use client';

import { useState, useEffect, use } from 'react';
import { LocationDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar'; // Ensure this path is correct
import GameImage from '@/components/GameImage';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import SparkleIcon from '@/components/icons/SparkleIcon';
import BehaviorCard from '../../../../components/admin/BehaviorCard';
import ScribeAssistant from '../../../../components/admin/ScribeAssistant';
import { useToast } from '@/providers/ToastProvider';

export default function LocationsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [locations, setLocations] = useState<LocationDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/admin/locations?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const arr = Object.values(data).map((q: any) => q);
                setLocations(arr);
            })
            .finally(() => setIsLoading(false));
    }, [storyId]);

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
        showToast("Location saved.", "success");
    };

    const handleDeleteSuccess = (id: string) => {
        setLocations(prev => prev.filter(l => l.id !== id));
        setSelectedId(null);
        showToast("Location deleted.", "info");
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            {/* 1. SIDEBAR (Mobile Compatible) */}
            <AdminListSidebar 
                title="Locations"
                items={locations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[{ label: "Region", key: "regionId" }]}
                defaultGroupByKey="regionId"
                renderItem={(loc) => (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="item-title">{loc.name}</span>
                        <span className="item-subtitle">{loc.id}</span>
                    </div>
                )}
            />

            {/* 2. MAIN EDITOR */}
            <div className="admin-editor-col">
                {selectedId ? (
                    <LocationEditor 
                        key={selectedId} // Force remount
                        initialData={locations.find(l => l.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '20%' }}>
                        Select a location to edit.
                    </div>
                )}
            </div>
        </div>
    );
}

function LocationEditor({ initialData, onSave, onDelete, storyId }: { initialData: LocationDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    
    // Assistant State
    const [activeField, setActiveField] = useState<'visible' | 'unlock' | null>(null);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };
    
    const handleAssistantInsert = (text: string) => {
        if (activeField === 'visible') handleChange('visibleCondition', (form.visibleCondition || "") + text);
        if (activeField === 'unlock') handleChange('unlockCondition', (form.unlockCondition || "") + text);
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
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${form.id}?`)) return;
        await fetch(`/api/admin/config?storyId=${storyId}&category=locations&itemId=${form.id}`, { method: 'DELETE' });
        onDelete(form.id);
    };

    return (
        <div className="space-y-4" style={{ position: 'relative' }}>
            
            {/* ASSISTANT POPUP */}
            {activeField && (
                <div style={{ position: 'absolute', top: '200px', right: 0, zIndex: 50 }}>
                    <ScribeAssistant 
                        storyId={storyId} 
                        mode="condition" 
                        onInsert={handleAssistantInsert} 
                        onClose={() => setActiveField(null)} 
                    />
                </div>
            )}

            {/* ID & Name */}
            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group">
                <label className="form-label">Name</label>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
            </div>

            {/* Config */}
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Deck ID</label>
                    <input value={form.deck} onChange={e => handleChange('deck', e.target.value)} className="form-input" />
                </div>

                <div className="form-group">
                    <label className="form-label">Market ID</label>
                    <input 
                        value={form.marketId || ''} 
                        onChange={e => handleChange('marketId', e.target.value)} 
                        className="form-input" 
                        placeholder="grand_bazaar"
                    />
                </div>
                
                <div className="form-group">
                    <label className="form-label">Image Code</label>
                    <input value={form.image} onChange={e => handleChange('image', e.target.value)} className="form-input" />
                </div>
            </div>

            {/* CONDITIONS (Updated to use CSS Class instead of hardcoded background) */}
            <div className="admin-panel-box">
                <label className="special-label" style={{ color: 'var(--tool-accent)' }}>Access Control</label>
                
                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Visible Condition</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            value={form.visibleCondition || ''} 
                            onChange={e => handleChange('visibleCondition', e.target.value)} 
                            className="form-input" 
                            placeholder="$discovered_map >= 1"
                            style={{ paddingRight: '40px' }}
                        />
                        <button 
                            onClick={() => setActiveField('visible')} 
                            style={{ 
                                position: 'absolute', right: 5, top: 5, background: 'none', 
                                border: 'none', cursor: 'pointer', color: 'var(--tool-accent)' 
                            }}
                        >
                            <SparkleIcon />
                        </button>
                    </div>
                    <p className="special-desc">If empty, it is always visible. If condition fails, it's hidden from the map.</p>
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Unlock Condition (Lock)</label>
                    <div style={{ position: 'relative' }}>
                        <input 
                            value={form.unlockCondition || ''} 
                            onChange={e => handleChange('unlockCondition', e.target.value)} 
                            className="form-input" 
                            placeholder="$route_to_town >= 1"
                            style={{ paddingRight: '40px' }}
                        />
                         <button 
                            onClick={() => setActiveField('unlock')} 
                            style={{ 
                                position: 'absolute', right: 5, top: 5, background: 'none', 
                                border: 'none', cursor: 'pointer', color: 'var(--tool-accent)' 
                            }}
                        >
                            <SparkleIcon />
                        </button>
                    </div>
                    <p className="special-desc">If empty, it is unlocked. If condition fails, icon is greyed out.</p>
                </div>
            </div>

            {/* BEHAVIOR TAGS */}
            <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)' }}>
                <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <BehaviorCard 
                        checked={hasProperty(form.tags, 'lock_equipment')} 
                        onChange={() => handleTagToggle('lock_equipment')} 
                        label="Lock Equipment" 
                        desc="Disable inventory here." 
                    />
                     <BehaviorCard 
                        checked={hasProperty(form.tags, 'safe_zone')} 
                        onChange={() => handleTagToggle('safe_zone')} 
                        label="Safe Zone" 
                        desc="Disable Menace Autofire." 
                    />
                </div>
            </div>

            {/* Coordinates */}
            <div className="form-row" style={{ borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem', marginTop: '1rem' }}>
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

            {/* DELETE BUTTON */}
            <div className="admin-form-footer">
                <button onClick={handleDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete Location</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}