'use client';

import { useState, useEffect, use } from 'react';
import { CategoryDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';

export default function CategoriesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/admin/categories?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => setCategories(Object.values(data)))
            .finally(() => setIsLoading(false));
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

    const handleDeleteSuccess = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        setSelectedId(null);
    };

    if (isLoading) return <div>Loading...</div>;

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
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a category</div>}
            </div>
        </div>
    );
}

function CategoryEditor({ initialData, onSave, onDelete, storyId }: { initialData: CategoryDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);
    
    const handleChange = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: storyId,
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

    const handleDelete = async () => {
        if (!confirm(`Delete category "${form.id}"?`)) return;
        try {
            await fetch(`/api/admin/config?storyId=${storyId}&category=categories&itemId=${form.id}`, { method: 'DELETE' });
            onDelete(form.id);
        } catch (e) { console.error(e); }
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
                <label className="form-label">Description</label>
                <input value={form.description || ''} onChange={e => handleChange('description', e.target.value)} className="form-input" />
            </div>
              <div className="form-group">
                <label className="form-label">Color {`(note: #ffffff allows the color to default to the theme default for categories)`}</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                        onClick={() => handleChange('color', '')}
                        style={{ 
                            fontSize: '0.75rem', padding: '4px 8px', background: 'transparent', 
                            border: '1px solid #555', color: '#888', cursor: 'pointer', borderRadius: '4px' 
                        }}
                        title="Reset to Theme Default"
                    >
                        Default
                    </button>
                    
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
                    {/* NEW: Button to clear color */}

                </div>
            </div>
            <div className="admin-form-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={handleDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save</button>
            </div>
        </div>
    );
}