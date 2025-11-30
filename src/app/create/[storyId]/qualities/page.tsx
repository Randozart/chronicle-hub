'use client';

import { useState, useEffect, use } from 'react';
import { QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import GameImage from '@/components/GameImage';
import { hasProperty, toggleProperty } from '@/utils/propertyHelpers';
import BehaviorCard from '../components/BehaviorCard';

const toggleTag = (currentTags: string | undefined, tag: string): string => {
    const tags = (currentTags || '').split(',').map(s => s.trim()).filter(Boolean);
    if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(', ');
    } else {
        return [...tags, tag].join(', ');
    }
};

export default function QualitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 1. Fetch Data
    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const arr = Object.values(data).map((q: any) => q);
                setQualities(arr);
            })
            .finally(() => setIsLoading(false));
    }, []);

    // 2. Create Logic
    const handleCreate = () => {
        const newId = prompt("Enter unique ID (e.g. 'strength'):");
        if (!newId) return;

        if (newId.includes('.') || newId.includes(' ')) { 
            alert("ID cannot contain dots or spaces."); return; 
        }
        if (qualities.find(q => q.id === newId)) { 
            alert("ID already exists."); return; 
        }

        const newQuality: QualityDefinition = {
            id: newId,
            name: "New Quality",
            type: "P" as any,
            description: ""
        };

        setQualities(prev => [...prev, newQuality]);
        setSelectedId(newId);
    };

    // 3. Save Logic
    const handleSaveSuccess = (updatedItem: QualityDefinition) => {
        setQualities(prev => prev.map(q => q.id === updatedItem.id ? updatedItem : q));
    };

    // 4. Delete Logic
    const handleDeleteSuccess = (deletedId: string) => {
        setQualities(prev => prev.filter(q => q.id !== deletedId));
        setSelectedId(null);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

     return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Qualities" items={qualities} selectedId={selectedId} onSelect={setSelectedId} onCreate={handleCreate}
                groupOptions={[{ label: "Category", key: "category" }, { label: "Type", key: "type" }]}
                defaultGroupByKey="category"
            />
            <div className="admin-editor-col">
                {selectedId ? (
                    <QualityEditor 
                        initialData={qualities.find(q => q.id === selectedId)!} 
                        onSave={handleSaveSuccess} onDelete={handleDeleteSuccess} storyId={storyId} 
                    />
                ) : <div style={{color:'#777', textAlign:'center', marginTop:'20%'}}>Select a quality</div>}
            </div>
        </div>
    );
}

function QualityEditor({ initialData, onSave, onDelete, storyId }: { initialData: QualityDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
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
                body: JSON.stringify({ storyId, category: 'qualities', itemId: form.id, data: form })
            });
            onSave(form);
            alert("Saved!");
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${form.id}?`)) return;
        await fetch(`/api/admin/config?storyId=${storyId}&category=qualities&itemId=${form.id}`, { method: 'DELETE' });
        onDelete(form.id);
    };

    return (
        <div className="space-y-4">
            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>

            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label">Name</label>
                    <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} className="form-input" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Type</label>
                    <select value={form.type} onChange={e => handleChange('type', e.target.value)} className="form-select">
                        <option value="P">Pyramidal (Stat)</option>
                        <option value="C">Counter (Currency)</option>
                        <option value="I">Item</option>
                        <option value="E">Equipable</option>
                        <option value="S">String (Text)</option>
                        <option value="T">Tracker (Progress)</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} className="form-textarea" rows={2} />
            </div>

            <div className="form-group">
                <label className="form-label">Category (Tree)</label>
                <input value={form.category || ''} onChange={e => handleChange('category', e.target.value)} className="form-input" placeholder="character, menace" />
            </div>

            <div className="form-group">
                <label className="form-label">Image Code</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={form.image || ''} onChange={e => handleChange('image', e.target.value)} className="form-input" />
                    {form.image && <div style={{width: 32, height: 32}}><GameImage code={form.image} imageLibrary={{}} type="icon" className="option-image"/></div>}
                </div>
            </div>

            {/* --- NEW BEHAVIOR SECTION --- */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Behavior</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <BehaviorCard 
                        checked={hasProperty(form.properties, 'hidden')} 
                        onChange={() => handlePropToggle('hidden')} 
                        label="Hidden" 
                        desc="Do not show on profile." 
                    />
                    
                    {/* Only show Item logic for Items/Equipables */}
                    {(form.type === 'E' || form.type === 'I') && (
                        <>
                            <BehaviorCard 
                                checked={hasProperty(form.properties, 'auto_equip')} 
                                onChange={() => handlePropToggle('auto_equip')} 
                                label="Auto-Equip" 
                                desc="Equip immediately on gain." 
                            />
                            <BehaviorCard 
                                checked={hasProperty(form.properties, 'cursed')} 
                                onChange={() => handlePropToggle('cursed')} 
                                label="Cursed" 
                                desc="Cannot be unequipped." 
                            />
                        </>
                    )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Raw Properties</label>
                    <input value={form.properties || ''} onChange={e => handleChange('properties', e.target.value)} className="form-input" style={{ fontSize: '0.8rem' }} />
                </div>
            </div>

            {/* EQUIP/ITEM SPECIFIC FIELDS */}
            {(form.type === 'E' || form.type === 'I') && (
                <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '1rem' }}>
                    <label className="special-label" style={{color: '#61afef'}}>Item Settings</label>
                    
                    {form.type === 'E' && (
                        <div className="form-group">
                            <label className="form-label">Stat Bonus</label>
                            <input value={form.bonus || ''} onChange={e => handleChange('bonus', e.target.value)} className="form-input" placeholder="$strength + 1" />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Use Event (Storylet ID)</label>
                        <input value={form.storylet || ''} onChange={e => handleChange('storylet', e.target.value)} className="form-input" placeholder="Event ID to fire when 'Used'" />
                    </div>
                </div>
            )}

            <div className="admin-form-footer">
                <button onClick={handleDelete} className="unequip-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}