'use client';

import { useState, useEffect, use } from 'react';
import { QualityDefinition, QualityType } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import GameImage from '@/components/GameImage';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers'; 
import BehaviorCard from '../components/BehaviorCard';

export default function QualitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/admin/qualities?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => setQualities(Object.values(data)))
            .finally(() => setIsLoading(false));
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Unique ID (e.g. 'strength'):");
        if (!newId) return;
        if (qualities.find(q => q.id === newId)) return alert("ID Exists");
        
        const newQ: QualityDefinition = { id: newId, name: "New Quality", type: QualityType.Pyramidal };
        setQualities(prev => [...prev, newQ]);
        setSelectedId(newId);
    };

    const handleSaveSuccess = (updated: QualityDefinition) => {
        setQualities(prev => prev.map(q => q.id === updated.id ? updated : q));
    };

    const handleDeleteSuccess = (id: string) => {
        setQualities(prev => prev.filter(q => q.id !== id));
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
        const newProps = toggleProperty(form.tags, prop);
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

            {/* RESTORED: MAX VALUE FIELD */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Category (Tree)</label>
                    <input value={form.category || ''} onChange={e => handleChange('category', e.target.value)} className="form-input" placeholder="character, menace" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Max Value (Cap)</label>
                    <input 
                        value={form.max || ''} 
                        onChange={e => handleChange('max', e.target.value)} 
                        className="form-input" 
                        placeholder="10 or $level_cap" 
                    />
                    <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>Optional logic limit.</p>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} className="form-textarea" rows={2} />
            </div>

            <div className="form-group">
                <label className="form-label">Image Code</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input value={form.image || ''} onChange={e => handleChange('image', e.target.value)} className="form-input" />
                    {form.image && <div style={{width: 32, height: 32}}><GameImage code={form.image} imageLibrary={{}} type="icon" className="option-image"/></div>}
                </div>
            </div>

            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Behavior</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <BehaviorCard checked={hasProperty(form.tags, 'hidden')} onChange={() => handlePropToggle('hidden')} label="Hidden" desc="Do not show on profile." />
                    {(form.type === 'E' || form.type === 'I') && (
                        <>
                            <BehaviorCard checked={hasProperty(form.tags, 'auto_equip')} onChange={() => handlePropToggle('auto_equip')} label="Auto-Equip" desc="Equip immediately on gain." />
                            <BehaviorCard checked={hasProperty(form.tags, 'cursed')} onChange={() => handlePropToggle('cursed')} label="Cursed" desc="Cannot be unequipped." />
                        </>
                    )}
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Raw Properties</label>
                    <input value={form.tags || ''} onChange={e => handleChange('properties', e.target.value)} className="form-input" style={{ fontSize: '0.8rem' }} />
                </div>
            </div>

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