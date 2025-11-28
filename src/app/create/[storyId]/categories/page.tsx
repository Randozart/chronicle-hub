'use client';

import { useState, useEffect, use } from 'react';
import { CategoryDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';

export default function CategoriesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/admin/categories?storyId=${storyId}`) // Dynamic!
            .then(r => r.json())
            .then(data => setCategories(Object.values(data).map((c: any) => c)));
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Category ID (e.g. 'menace'):");
        if (!newId) return;
        if (categories.find(c => c.id === newId)) return alert("Exists");
        
        const newCat: CategoryDefinition = {
            id: newId,
            name: newId.charAt(0).toUpperCase() + newId.slice(1),
            color: "#ffffff"
        };
        setCategories(prev => [...prev, newCat]);
        setSelectedId(newId);
    };

    const handleSaveSuccess = (updated: CategoryDefinition) => {
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
    };

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Categories"
                items={categories}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                renderItem={(c) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color || '#fff' }} />
                        <span>{c.name || c.id}</span>
                    </div>
                )}
            />
            
            <div className="admin-editor-col">
                {selectedId ? (
                    <CategoryEditor 
                        initialData={categories.find(c => c.id === selectedId)!} 
                        onSave={handleSaveSuccess} 
                        storyId={storyId}
                    />
                ) : <div style={{ color: '#777', marginTop: '20%', textAlign: 'center' }}>Select a category</div>}
            </div>
        </div>
    );
}

function CategoryEditor({ initialData, onSave, storyId }: { initialData: CategoryDefinition, onSave: (d: any) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);
    const handleChange = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                body: JSON.stringify({
                    storyId: {storyId},
                    category: 'categories',
                    itemId: form.id,
                    data: form
                })
            });
            onSave(form);
            alert("Saved!");
        } catch (e) { console.error(e); }
        setIsSaving(false);
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                Edit: {form.id}
            </h2>

            <div className="form-group">
                <label className="form-label">Display Name</label>
                <input value={form.name} onChange={e => handleChange('name', e.target.value)} className="form-input" />
            </div>

            <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="color" 
                        value={form.color || '#ffffff'} 
                        onChange={e => handleChange('color', e.target.value)}
                        style={{ background: 'none', border: 'none', width: '50px', height: '40px', cursor: 'pointer' }}
                    />
                    <input 
                        value={form.color || ''} 
                        onChange={e => handleChange('color', e.target.value)} 
                        className="form-input" 
                        placeholder="#ffffff"
                    />
                </div>
            </div>

            {/* Live Preview */}
            <div className="special-field-group" style={{ borderColor: form.color }}>
                <label className="special-label" style={{ color: form.color }}>Preview: Skill Check</label>
                <div style={{ height: '8px', background: '#333', borderRadius: '4px', marginTop: '0.5rem' }}>
                    <div style={{ height: '100%', width: '60%', background: form.color || '#fff', borderRadius: '4px' }} />
                </div>
            </div>

            <div className="admin-form-footer" style={{ justifyContent: 'flex-end' }}>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save</button>
            </div>
        </div>
    );
}