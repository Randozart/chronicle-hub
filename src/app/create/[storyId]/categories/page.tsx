'use client';

import { useState, useEffect, use } from 'react';
import { CategoryDefinition, WorldSettings } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import { useToast } from '@/providers/ToastProvider';
import BehaviorCard from '@/components/admin/BehaviorCard';

export default function CategoriesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [settings, setSettings] = useState<WorldSettings | null>(null); // Store Settings
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch Categories AND Settings
        Promise.all([
            fetch(`/api/admin/categories?storyId=${storyId}`),
            fetch(`/api/admin/settings?storyId=${storyId}`)
        ])
        .then(async ([catRes, setRes]) => {
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(Object.values(data));
            }
            if (setRes.ok) {
                const sData = await setRes.json();
                setSettings(sData);
            }
        })
        .finally(() => setIsLoading(false));
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Category ID (e.g. 'menace'):");
        if (!newId) return;
        
        const cleanId = newId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (categories.find(c => c.id === cleanId)) { alert("Exists"); return; }
        
        const newCat: CategoryDefinition = {
            id: cleanId,
            name: newId.charAt(0).toUpperCase() + newId.slice(1),
            color: "#ffffff"
        };
        setCategories(prev => [...prev, newCat]);
        setSelectedId(cleanId);
        showToast("Category created.", "success");
    };

    const handleSaveSuccess = (updated: CategoryDefinition) => {
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        showToast("Category saved.", "success");
    };

    const handleDeleteSuccess = (id: string) => {
        setCategories(prev => prev.filter(c => c.id !== id));
        setSelectedId(null);
        showToast("Category deleted.", "info");
    };

    // Update local settings state when changed in the editor
    const handleSettingsUpdate = (newSettings: WorldSettings) => {
        setSettings(newSettings);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

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
                {selectedId && settings ? (
                    <CategoryEditor 
                        key={selectedId}
                        initialData={categories.find(c => c.id === selectedId)!} 
                        settings={settings}
                        onSave={handleSaveSuccess} 
                        onDelete={handleDeleteSuccess}
                        onUpdateSettings={handleSettingsUpdate}
                        storyId={storyId}
                    />
                ) : <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a category</div>}
            </div>
        </div>
    );
}

function CategoryEditor({ initialData, settings, onSave, onDelete, onUpdateSettings, storyId }: { 
    initialData: CategoryDefinition, 
    settings: WorldSettings,
    onSave: (d: any) => void, 
    onDelete: (id: string) => void, 
    onUpdateSettings: (s: WorldSettings) => void,
    storyId: string 
}) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    // Find the current configuration for this category in equipCategories
    // Matches "Ring" or "Ring*2" or "Ring_*"
    const currentEquipConfig = (settings.equipCategories || []).find(c => 
        c === form.id || c.startsWith(`${form.id}*`) || c.startsWith(`${form.id}_`)
    );
    const [equipConfigString, setEquipConfigString] = useState(currentEquipConfig || form.id);

    useEffect(() => {
        setForm(initialData);
        const cfg = (settings.equipCategories || []).find(c => 
            c === initialData.id || c.startsWith(`${initialData.id}*`) || c.startsWith(`${initialData.id}_`)
        );
        setEquipConfigString(cfg || initialData.id);
    }, [initialData, settings]);
    
    const handleChange = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

    // --- SAVE CATEGORY ---
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, category: 'categories', itemId: form.id, data: form })
            });
            onSave(form);
        } catch (e) { console.error(e); }
        setIsSaving(false);
    };

    // --- EQUIP SLOT LOGIC ---
    const handleToggleEquip = async (isActive: boolean) => {
        const list = settings.equipCategories || [];
        let newList: string[];

        if (isActive) {
            // Add (use the current config string or default ID)
            newList = [...list, equipConfigString];
        } else {
            // Remove (filter out the one that matches this category)
            newList = list.filter(c => c !== currentEquipConfig);
        }

        await saveSettings(newList);
    };

    const handleUpdateConfigString = async (newVal: string) => {
        setEquipConfigString(newVal);
    };

    // Called when the input blurs or Enter is pressed on the config input
    const saveEquipConfig = async () => {
        if (!currentEquipConfig) return; // Not active, nothing to update
        if (currentEquipConfig === equipConfigString) return; // No change

        const list = settings.equipCategories || [];
        // Replace the old config with the new one
        const newList = list.map(c => c === currentEquipConfig ? equipConfigString : c);
        await saveSettings(newList);
    };

    const saveSettings = async (newList: string[]) => {
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'root', itemId: 'equipCategories', data: newList })
            });
            onUpdateSettings({ ...settings, equipCategories: newList });
            showToast("Equipment settings updated.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to update settings.", "error");
        }
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
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem', color: '#e5c07b' }}>
                Category: {form.id}
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
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button 
                        onClick={() => handleChange('color', '')}
                        style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'transparent', border: '1px solid #555', color: '#888', cursor: 'pointer', borderRadius: '4px' }}
                    >
                        Default
                    </button>
                    <input type="color" value={form.color || '#ffffff'} onChange={e => handleChange('color', e.target.value)} style={{ background: 'none', border: 'none', width: '50px', height: '40px', cursor: 'pointer' }} />
                    <input value={form.color || ''} onChange={e => handleChange('color', e.target.value)} className="form-input" placeholder="#ffffff" />
                </div>
            </div>

            {/* NEW: Equipment Slot Integration */}
            <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '2rem' }}>
                <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>System Integration</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <BehaviorCard 
                        checked={!!currentEquipConfig} 
                        onChange={() => handleToggleEquip(!currentEquipConfig)} 
                        label="Is Equipment Slot" 
                        desc={`Allows items with category "${form.id}" to be equipped.`} 
                    />

                    {currentEquipConfig && (
                        <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--tool-border)' }}>
                            <label className="form-label">Slot Configuration</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input 
                                    value={equipConfigString} 
                                    onChange={e => handleUpdateConfigString(e.target.value)} 
                                    onBlur={saveEquipConfig}
                                    className="form-input" 
                                />
                                <button className="save-btn" onClick={saveEquipConfig} style={{padding: '0 1rem'}}>Update</button>
                            </div>
                            <p className="special-desc" style={{ marginTop: '0.5rem' }}>
                                Format: <code>{form.id}</code> (Single), <code>{form.id}*2</code> (Double), <code>{form.id}*</code> (Infinite).
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="admin-form-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={handleDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save</button>
            </div>
        </div>
    );
}