'use client';

import { useState, useEffect } from 'react';
import { QualityDefinition } from '@/engine/models';

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
            type: "P" as any, // Cast to ensure TS is happy with initial value
            description: ""
        };

        setQualities(prev => [...prev, newQuality]);
        setSelectedId(newId);
    };

    // 3. Save Logic (Updates local list after successful API call)
    const handleSaveSuccess = (updatedItem: QualityDefinition) => {
        setQualities(prev => prev.map(q => q.id === updatedItem.id ? updatedItem : q));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            {/* Left Column: List */}
            <div className="admin-list-col">
                <div className="list-header">
                    <span>Qualities</span>
                    <button className="new-btn" onClick={handleCreate}>+ New</button>
                </div>
                <div className="list-items">
                    {qualities.map(q => (
                        <div 
                            key={q.id} 
                            onClick={() => setSelectedId(q.id)}
                            className={`list-item ${selectedId === q.id ? 'active' : ''}`}
                        >
                            <span className="item-title">{q.name || q.id}</span>
                            <span className="item-subtitle">{q.id} • {q.type}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column: Editor */}
            <div className="admin-editor-col">
                {selectedId ? (
                    <QualityEditor 
                        initialData={qualities.find(q => q.id === selectedId)!} 
                        onSave={handleSaveSuccess}
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

// --- SUB COMPONENT ---

function QualityEditor({ initialData, onSave }: { initialData: QualityDefinition, onSave: (d: any) => void }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    // IMPORTANT: Update form when a different item is selected from the list
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

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                Edit: {form.name}
            </h2>
            
            <div className="form-group">
                <label className="form-label">ID</label>
                <input 
                    value={form.id} 
                    disabled 
                    className="form-input" 
                    style={{ opacity: 0.5, cursor: 'not-allowed' }} 
                />
            </div>

            <div className="form-group">
                <label className="form-label">Name</label>
                <input 
                    value={form.name || ''} 
                    onChange={e => handleChange('name', e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Type</label>
                    <select 
                        value={form.type}
                        onChange={e => handleChange('type', e.target.value)}
                        className="form-select"
                    >
                        <option value="P">Pyramidal (Level)</option>
                        <option value="C">Counter (Currency)</option>
                        <option value="I">Item</option>
                        <option value="E">Equipable</option>
                        <option value="S">String (Text)</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                        value={form.category || ''} 
                        onChange={e => handleChange('category', e.target.value)}
                        className="form-input"
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                    value={form.description || ''} 
                    onChange={e => handleChange('description', e.target.value)}
                    className="form-textarea"
                    rows={4}
                />
            </div>

            {form.type === 'E' && (
                <div className="form-group" style={{ border: '1px solid #2a3e5c', padding: '1rem', borderRadius: '4px' }}>
                    <label className="form-label" style={{ color: '#61afef' }}>Equip Bonus</label>
                    <input 
                        value={form.bonus || ''} 
                        onChange={e => handleChange('bonus', e.target.value)}
                        placeholder="$mettle + 1"
                        className="form-input"
                    />
                    <small style={{ color: '#777', display: 'block', marginTop: '0.5rem' }}>
                        Format: $quality_id + 1, $other - 2
                    </small>
                </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flow-root' }}>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="save-btn"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}