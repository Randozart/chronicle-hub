'use client';

import { useState, useEffect, use } from 'react';
import { MapRegion } from '@/engine/models';
import GameImage from '@/components/GameImage';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import { useToast } from '@/providers/ToastProvider';

export default function RegionsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [regions, setRegions] = useState<MapRegion[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch(`/api/admin/regions?storyId=${storyId}`)
            .then(r => r.json())
            .then(data => {
                // Handle both object (standard) and array formats safely
                const list = Array.isArray(data) ? data : Object.values(data);
                setRegions(list as MapRegion[]);
            })
            .catch(e => console.error(e))
            .finally(() => setIsLoading(false));
    }, [storyId]); // <--- CRITICAL FIX: Depend on storyId

    const handleCreate = () => {
        const newId = prompt("Region ID (e.g. 'london'):");
        if (!newId) return;
        
        // Clean ID
        const cleanId = newId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (regions.find(r => r.id === cleanId)) return alert("Exists");
        
        setRegions(prev => [...prev, { id: cleanId, name: "New Region" }]);
        setSelectedId(cleanId);
    };

    const handleSaveSuccess = (updated: MapRegion) => {
        setRegions(prev => prev.map(r => r.id === updated.id ? updated : r));
        showToast("Region saved.", "success");
    };

    const handleDeleteSuccess = (id: string) => {
        setRegions(prev => prev.filter(r => r.id !== id));
        setSelectedId(null);
        showToast("Region deleted.", "info");
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Map Regions" 
                items={regions} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                onCreate={handleCreate} 
                renderItem={(r) => (
                    <div style={{display:'flex', flexDirection:'column'}}>
                        <span className="item-title">{r.name}</span>
                        <span className="item-subtitle">{r.id}</span>
                    </div>
                )}
            />
            <div className="admin-editor-col">
                {selectedId ? (
                    <RegionEditor 
                        key={selectedId}
                        initialData={regions.find(r => r.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '20%' }}>Select a region</div>}
            </div>
        </div>
    );
}

function RegionEditor({ initialData, onSave, onDelete, storyId }: { initialData: MapRegion, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => setForm(initialData), [initialData]);
    const handleChange = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

    // GLOBAL SAVE TRIGGER
    useEffect(() => {
        const handleGlobalSave = () => handleSave();
        window.addEventListener('global-save-trigger', handleGlobalSave);
        return () => window.removeEventListener('global-save-trigger', handleGlobalSave);
    }, [form]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, category: 'regions', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm("Delete?")) return;
        try {
            await fetch(`/api/admin/config?storyId=${storyId}&category=regions&itemId=${form.id}`, { method: 'DELETE' });
            onDelete(form.id);
        } catch (e) { console.error(e); }
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
                <label className="form-label">Default Market ID</label>
                <input 
                    value={form.marketId || ''} 
                    onChange={e => handleChange('marketId', e.target.value)} 
                    className="form-input" 
                    placeholder="region_market"
                />
                <p className="special-desc">Used if a specific Location doesn't have its own market.</p>
            </div>

            <div className="form-group">
                <label className="form-label">Map Image Code</label>
                <input value={form.image || ''} onChange={e => handleChange('image', e.target.value)} className="form-input" placeholder="london_map" />
                <p className="special-desc">If left empty, Travel will use a simple List View instead of a Visual Map.</p>
            </div>

            {form.image && (
                <div style={{ marginTop: '1rem', border: '1px solid #444', height: '200px', position: 'relative' }}>
                    <GameImage 
                        code={form.image} 
                        imageLibrary={{}} 
                        type="map"
                        alt="Map Preview"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            <div className="admin-form-footer">
                <button onClick={handleDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}