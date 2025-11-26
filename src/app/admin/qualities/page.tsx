'use client';

import { useState, useEffect } from 'react';
import { QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';

const toggleTag = (currentTags: string | undefined, tag: string): string => {
    const tags = (currentTags || '').split(',').map(s => s.trim()).filter(Boolean);
    if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(', ');
    } else {
        return [...tags, tag].join(', ');
    }
};

export default function QualitiesAdmin() {
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // 1. Fetch Data
    useEffect(() => {
        fetch('/api/admin/qualities?storyId=trader_johns_world')
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
                title="Qualities"
                items={qualities}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[
                    { label: "Category (Tree)", key: "category" },
                    { label: "Type", key: "type" }
                ]}
                defaultGroupByKey="category"
                renderItem={(q) => (
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{q.name || q.id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#777' }}>{q.id} <span style={{ color: '#61afef' }}>[{q.type}]</span></div>
                    </div>
                )}
            />

            <div className="admin-editor-col">
                {selectedId ? (
                    <QualityEditor 
                        initialData={qualities.find(q => q.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                    />
                ) : (
                    <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>
                        Select a quality to edit
                    </div>
                )}
            </div>
        </div>
    );
}

function QualityEditor({ initialData, onSave, onDelete }: { initialData: QualityDefinition, onSave: (d: any) => void, onDelete: (id: string) => void }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: string) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: 'trader_johns_world',
                    category: 'qualities',
                    itemId: form.id,
                    data: form
                })
            });

            if (res.ok) {
                onSave(form); 
                alert("Saved!");
            } else {
                alert("Failed to save.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${form.id}"?`)) return;
        
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=trader_johns_world&category=qualities&itemId=${form.id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                onDelete(form.id);
            } else {
                alert("Failed to delete.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                Edit: {form.name}
            </h2>
            
            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
                <label className="form-label">Name</label>
                <input value={form.name || ''} onChange={e => handleChange('name', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
                <label className="form-label">
                    Description 
                    <span className="property-hint">($id.description)</span>
                </label>
                <textarea 
                    value={form.description || ''} 
                    onChange={e => handleChange('description', e.target.value)}
                    className="form-textarea"
                    rows={4}
                />
            </div>

            <div className="toggle-row">
                <label className="toggle-label">
                    <input 
                        type="checkbox" 
                        checked={(form.properties || '').includes('hidden')}
                        onChange={() => handleChange('properties', toggleTag(form.properties, 'hidden'))}
                    />
                    Hidden (Sidebar)
                </label>
                {/* You can add more standard tags here */}
            </div>

            <div className="form-group">
                <label className="form-label">Raw Properties</label>
                <input 
                    value={form.properties || ''} 
                    onChange={e => handleChange('properties', e.target.value)} 
                    className="form-input"
                    placeholder="custom_tag_1, custom_tag_2"
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Type</label>
                    <select value={form.type} onChange={e => handleChange('type', e.target.value)} className="form-select">
                        <option value="P">Pyramidal (Level)</option>
                        <option value="C">Counter (Currency)</option>
                        <option value="I">Item</option>
                        <option value="E">Equipable</option>
                        <option value="S">String (Text)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Category</label>
                    <input value={form.category || ''} onChange={e => handleChange('category', e.target.value)} className="form-input" />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={form.description || ''} onChange={e => handleChange('description', e.target.value)} className="form-textarea" rows={4} />
            </div>

            {form.type === 'E' && (
                <div className="form-group" style={{ border: '1px solid #2a3e5c', padding: '1rem', borderRadius: '4px' }}>
                    <label className="form-label" style={{ color: '#61afef' }}>Equip Bonus</label>
                    <input value={form.bonus || ''} onChange={e => handleChange('bonus', e.target.value)} placeholder="$mettle + 1" className="form-input" />
                </div>
            )}

            <div className="admin-form-footer">
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                    Delete Quality
                </button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}