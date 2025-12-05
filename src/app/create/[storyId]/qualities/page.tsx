'use client';

import { useState, useEffect, use } from 'react';
import { QualityDefinition, QualityType, WorldSettings } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import GameImage from '@/components/GameImage';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers'; 
import SmartArea from '@/components/admin/SmartArea'; // <--- USE SMART AREA
import BehaviorCard from '../../../../components/admin/BehaviorCard';

// ENGINE RESERVED WORDS
const ENGINE_RESERVED = ['luck', 'target', 'schedule', 'cancel', 'all', 'world', 'source'];

export default function QualitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [settings, setSettings] = useState<WorldSettings | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [qRes, sRes] = await Promise.all([
                fetch(`/api/admin/qualities?storyId=${storyId}`),
                fetch(`/api/admin/settings?storyId=${storyId}`)
            ]);
            
            if (qRes.ok) setQualities(Object.values(await qRes.json()));
            if (sRes.ok) setSettings(await sRes.json());
            
            setIsLoading(false);
        };
        load();
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Unique ID (e.g. 'strength'):");
        if (!newId) return;
        if (qualities.find(q => q.id === newId)) return alert("ID Exists");
        
        const newQ: QualityDefinition = { id: newId, name: "New Quality", type: QualityType.Pyramidal, tags: [] };
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
                {selectedId && settings ? (
                    <QualityEditor 
                        initialData={qualities.find(q => q.id === selectedId)!} 
                        settings={settings} 
                        onSave={handleSaveSuccess} onDelete={handleDeleteSuccess} storyId={storyId} 
                    />
                ) : <div style={{color:'#777', textAlign:'center', marginTop:'20%'}}>Select a quality</div>}
            </div>
        </div>
    );
}

function QualityEditor({ initialData, settings, onSave, onDelete, storyId }: { initialData: QualityDefinition, settings: WorldSettings, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: string, val: any) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    const handleRawTagsChange = (str: string) => {
        const arr = str.split(',').map(s => s.trim()).filter(Boolean);
        handleChange('tags', arr);
    };

    // CTRL+S Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: form.id, data: form })
            });
            onSave(form);
            // alert("Saved!"); // Removed alert for Ctrl+S flow
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${form.id}?`)) return;
        await fetch(`/api/admin/config?storyId=${storyId}&category=qualities&itemId=${form.id}`, { method: 'DELETE' });
        onDelete(form.id);
    };

    const getConflict = (id: string) => {
        const cleanId = id.toLowerCase();
        if (ENGINE_RESERVED.includes(cleanId)) return { type: 'critical', msg: `"${id}" is a reserved Engine Keyword.` };
        if (cleanId === settings.actionId?.replace('$', '')) return { type: 'info', msg: "Bound to 'Action Points'." };
        if (cleanId === settings.playerName?.replace('$', '')) return { type: 'info', msg: "Bound to 'Player Name'." };
        
        const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', ''));
        if (currencyIds.includes(cleanId)) return { type: 'currency', msg: "Defined as a Currency (Wallet)." };

        return null;
    };

    const conflict = getConflict(form.id);

    return (
        <div className="space-y-4">
            
            {conflict && (
                <div style={{
                    padding: '1rem', borderRadius: '4px', marginBottom: '1rem',
                    border: `1px solid ${conflict.type === 'critical' ? '#e74c3c' : '#f1c40f'}`,
                    background: conflict.type === 'critical' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(241, 196, 15, 0.1)'
                }}>
                    <strong style={{ color: conflict.type === 'critical' ? '#e74c3c' : '#f1c40f', display: 'block', marginBottom: '0.25rem' }}>
                        {conflict.type === 'critical' ? '⚠️ Reserved Keyword' : 'System Binding'}
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: '#ccc' }}>{conflict.msg}</span>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>

            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    {/* UPGRADED TO SMART AREA */}
                    <SmartArea 
                        label="Name" 
                        value={form.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="Display Name"
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Type</label>
                    <select value={form.type} onChange={e => handleChange('type', e.target.value)} className="form-select">
                        <option value="P">Pyramidal (Exponential)</option>
                        <option value="C">Counter (Linear)</option>
                        <option value="I">Item</option>
                        <option value="E">Equipable</option>
                        <option value="S">String (Text)</option>
                        <option value="T">Tracker (Progress)</option>
                    </select>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Category</label>
                    <input value={form.category || ''} onChange={e => handleChange('category', e.target.value)} className="form-input" placeholder="character, menace" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Max Value (Cap)" 
                        value={form.max || ''} 
                        onChange={v => handleChange('max', v)} 
                        storyId={storyId} 
                        minHeight="38px"
                        placeholder="10 or $level_cap"
                    />
                </div>
            </div>

            <div className="form-group">
                {/* UPGRADED TO SMART AREA */}
                <SmartArea 
                    label="Description" 
                    value={form.description || ''} 
                    onChange={v => handleChange('description', v)} 
                    storyId={storyId} 
                    minHeight="80px"
                    placeholder="Visible in tooltip..."
                />
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
                    <BehaviorCard checked={hasProperty(form.tags, 'hidden')} onChange={() => handleTagToggle('hidden')} label="Hidden" desc="Do not show on profile." />
                    
                    {(form.type === 'E' || form.type === 'I') && (
                        <>
                            <BehaviorCard checked={hasProperty(form.tags, 'auto_equip')} onChange={() => handleTagToggle('auto_equip')} label="Auto-Equip" desc="Equip immediately on gain." />
                            <BehaviorCard checked={hasProperty(form.tags, 'cursed')} onChange={() => handleTagToggle('cursed')} label="Cursed" desc="Cannot be unequipped." />
                        </>
                    )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Raw Tags</label>
                    <input value={form.tags?.join(', ') || ''} onChange={e => handleRawTagsChange(e.target.value)} className="form-input" style={{ fontSize: '0.8rem' }} />
                </div>
            </div>

            {(form.type === 'E' || form.type === 'I') && (
                <div className="form-group" style={{ borderTop: '1px solid #444', paddingTop: '1rem' }}>
                    <label className="special-label" style={{color: '#61afef'}}>Item Settings</label>
                    
                    {form.type === 'E' && (
                        <div className="form-group">
                            <SmartArea 
                                label="Stat Bonus" 
                                value={form.bonus || ''} 
                                onChange={v => handleChange('bonus', v)} 
                                storyId={storyId} 
                                minHeight="38px"
                                placeholder="$strength + 1"
                            />
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