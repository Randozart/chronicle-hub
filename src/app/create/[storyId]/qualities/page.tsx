'use client';

import { useState, useEffect, use } from 'react';
import { QualityDefinition, QualityType, WorldSettings } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import GameImage from '@/components/GameImage';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers'; 
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import { useToast } from '@/providers/ToastProvider';

// ENGINE RESERVED WORDS
const ENGINE_RESERVED = ['luck', 'target', 'schedule', 'cancel', 'all', 'world', 'source', 'desc'];

export default function QualitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();

    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [settings, setSettings] = useState<WorldSettings | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [qRes, sRes] = await Promise.all([
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/settings?storyId=${storyId}`)
                ]);
                
                if (qRes.ok) {
                    const data = await qRes.json();
                    const sorted = Object.values(data).sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
                    setQualities(sorted as QualityDefinition[]);
                }
                if (sRes.ok) setSettings(await sRes.json());
            } catch (e) {
                console.error("Failed to load qualities", e);
                showToast("Failed to load data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId, showToast]);

    const handleCreate = () => {
        const newId = prompt("Unique ID (e.g. 'strength'):");
        if (!newId) return;
        
        const cleanId = newId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (qualities.find(q => q.id === cleanId)) {
            showToast("Quality ID already exists.", "error");
            return;
        }
        
        const newQ: QualityDefinition = { 
            id: cleanId, 
            name: "New Quality", 
            type: QualityType.Pyramidal, 
            tags: [],
            folder: "New" 
        };
        
        setQualities(prev => [...prev, newQ]);
        setSelectedId(cleanId);
        showToast("Quality created.", "success");
    };

    const handleDuplicate = (source: QualityDefinition) => {
        const newId = prompt("Enter new ID for the duplicate:", `${source.id}_copy`);
        if (!newId) return;
        
        const cleanId = newId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (qualities.find(q => q.id === cleanId)) {
            showToast("Quality ID already exists.", "error");
            return;
        }

        const newQ: QualityDefinition = {
            ...JSON.parse(JSON.stringify(source)),
            id: cleanId,
            name: `${source.name} (Copy)`
        };

        setQualities(prev => [...prev, newQ]);
        setSelectedId(cleanId);
        showToast("Quality duplicated.", "success");
    };

    const handleSaveSuccess = (updated: QualityDefinition) => {
        setQualities(prev => prev.map(q => q.id === updated.id ? updated : q));
        showToast("Quality saved successfully.", "success");
    };

    const handleDeleteSuccess = (id: string) => {
        setQualities(prev => prev.filter(q => q.id !== id));
        setSelectedId(null);
        showToast("Quality deleted.", "info");
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
                    { label: "Folder", key: "folder" },
                    { label: "Category", key: "category" }, 
                    { label: "Type", key: "type" }
                ]}
                defaultGroupByKey="folder"
            />
            <div className="admin-editor-col">
                {selectedId && settings ? (
                    <QualityEditor 
                        initialData={qualities.find(q => q.id === selectedId)!} 
                        settings={settings} 
                        onSave={handleSaveSuccess} 
                        onDelete={handleDeleteSuccess} 
                        onDuplicate={handleDuplicate}
                        storyId={storyId} 
                    />
                ) : <div style={{color:'#777', textAlign:'center', marginTop:'20%'}}>Select a quality</div>}
            </div>
        </div>
    );
}

function QualityEditor({ initialData, settings, onSave, onDelete, onDuplicate, storyId }: { 
    initialData: QualityDefinition, 
    settings: WorldSettings, 
    onSave: (d: any) => void, 
    onDelete: (id: string) => void, 
    onDuplicate: (q: QualityDefinition) => void,
    storyId: string 
}) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();
    
    const [newVariantKey, setNewVariantKey] = useState("");

    useEffect(() => setForm(initialData), [initialData]);

    const handleChange = (field: keyof QualityDefinition, val: any) => {
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
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: form.id, data: form })
            });

            if (!res.ok) throw new Error("Save failed");
            
            onSave(form);
        } catch (e) { 
            console.error(e);
            showToast("Failed to save quality.", "error");
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${form.id}?`)) return;
        try {
            const res = await fetch(`/api/admin/config?storyId=${storyId}&category=qualities&itemId=${form.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            onDelete(form.id);
        } catch (e) {
            console.error(e);
            showToast("Failed to delete quality.", "error");
        }
    };

    // Variant Handlers
    const addVariant = () => {
        if (!newVariantKey) return;
        const current = form.text_variants || {};
        handleChange('text_variants', { ...current, [newVariantKey]: "" });
        setNewVariantKey("");
    };

    const updateVariant = (key: string, val: string) => {
        const current = form.text_variants || {};
        handleChange('text_variants', { ...current, [key]: val });
    };

    const removeVariant = (key: string) => {
        const current = { ...form.text_variants };
        delete current[key];
        handleChange('text_variants', current);
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

            {/* ID & SORT ORDER */}
            <div className="form-row">
                <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">ID</label>
                    <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
                </div>
                <div className="form-group" style={{flex: 1}}>
                    <label className="form-label">Sort Order</label>
                    <input type="number" value={form.ordering || 0} onChange={e => handleChange('ordering', parseInt(e.target.value))} className="form-input" />
                </div>
            </div>

            {/* NAME & TYPE */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <SmartArea 
                        label="Name" 
                        value={form.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="Display Name (ScribeScript allowed)"
                        contextQualityId={form.id}
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Type</label>
                    <select value={form.type} onChange={e => handleChange('type', e.target.value as any)} className="form-select">
                        <option value="P">Pyramidal (Exponential)</option>
                        <option value="C">Counter (Linear)</option>
                        <option value="I">Item</option>
                        <option value="E">Equipable</option>
                        <option value="S">String (Text)</option>
                        <option value="T">Tracker (Progress)</option>
                    </select>
                </div>
            </div>

            {/* FOLDER & CATEGORY */}
            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Folder (UI)</label>
                    <input 
                        value={form.folder || ''} 
                        onChange={e => handleChange('folder', e.target.value)} 
                        className="form-input" 
                        placeholder="Items.Weapons" 
                        title="Use dots for nesting: Folder.Subfolder"
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea
                        label="Category (Logic)"
                        value={form.category || ''}
                        onChange={v => handleChange('category', v)}
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="For Scripts (e.g. 'Weapons')"
                        subLabel="Comma-seperated or Conditional"
                        contextQualityId={form.id}
                    />
                </div>
            </div>

            {/* IMAGE CODE (Now SmartArea) */}
            <div className="form-group">
                <label className="form-label">Image Code</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <SmartArea 
                            value={form.image || ''} 
                            onChange={v => handleChange('image', v)} 
                            storyId={storyId}
                            minHeight="38px"
                            contextQualityId={form.id}
                        />
                    </div>
                    {form.image && <div style={{width: 32, height: 32}}><GameImage code={form.image} imageLibrary={{}} type="icon" className="option-image"/></div>}
                </div>
            </div>
            
            {/* SINGULAR & PLURAL NAMES (Now SmartArea) */}
            <div className="form-row">
                 <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Singular Name"
                        value={form.singular_name || ''} 
                        onChange={v => handleChange('singular_name', v)} 
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="e.g. Coin" 
                        contextQualityId={form.id}
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Plural Name"
                        value={form.plural_name || ''} 
                        onChange={v => handleChange('plural_name', v)} 
                        storyId={storyId}
                        minHeight="38px"
                        placeholder="e.g. Coins" 
                        contextQualityId={form.id}
                    />
                </div>
            </div>

            <div className="form-group">
                <SmartArea 
                    label="Description" 
                    value={form.description || ''} 
                    onChange={v => handleChange('description', v)} 
                    storyId={storyId} 
                    minHeight="80px"
                    placeholder="Visible in tooltip. Use {$.level} for current level."
                    contextQualityId={form.id}
                />
            </div>
            
            {/* PROGRESSION CAPS */}
            {(form.type === 'P' || form.type === 'C' || form.type === 'T') && (
                <div className="special-field-group" style={{ borderColor: '#e5c07b' }}>
                    <label className="special-label" style={{ color: '#e5c07b' }}>Progression Limits</label>
                    <div className="form-row">
                        <div className="form-group" style={{flex:1}}>
                            <SmartArea 
                                label="Hard Cap (Max)" 
                                value={form.max || ''} 
                                onChange={v => handleChange('max', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                placeholder="Infinity" 
                                contextQualityId={form.id}
                            />
                            <p className="special-desc">Absolute maximum effective level.</p>
                        </div>
                        <div className="form-group" style={{flex:1}}>
                            <SmartArea 
                                label="Soft Cap (Grind)" 
                                value={form.grind_cap || ''} 
                                onChange={v => handleChange('grind_cap', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                placeholder="None" 
                                contextQualityId={form.id}
                            />
                            <p className="special-desc">Limit for repeatable actions.</p>
                        </div>
                        {form.type === 'P' && (
                            <div className="form-group" style={{flex:1}}>
                                <SmartArea 
                                    label="CP Requirement Cap" 
                                    value={form.cp_cap || ''} 
                                    onChange={v => handleChange('cp_cap', v)} 
                                    storyId={storyId} 
                                    minHeight="38px" 
                                    placeholder="None" 
                                    contextQualityId={form.id}
                                />
                                <p className="special-desc">Max CP needed per level.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FEEDBACK */}
            <div className="special-field-group" style={{ borderColor: '#61afef' }}>
                <label className="special-label" style={{ color: '#61afef' }}>Change Feedback</label>
                <div className="form-group">
                     <SmartArea 
                        label="On Increase" 
                        value={form.increase_description || ''} 
                        onChange={v => handleChange('increase_description', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="Your {$.name} has increased!" 
                        contextQualityId={form.id}
                    />
                </div>
                <div className="form-group">
                     <SmartArea 
                        label="On Decrease" 
                        value={form.decrease_description || ''} 
                        onChange={v => handleChange('decrease_description', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="Your {$.name} has dropped..." 
                        contextQualityId={form.id}
                    />
                </div>
            </div>

            {/* TEXT VARIANTS (Now using SmartArea) */}
            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Text Variants</label>
                <p className="special-desc">Custom properties accessed via <code>$quality.property</code>.</p>
                
                <div style={{ display: 'grid', gap: '10px', marginTop: '1rem' }}>
                    {Object.entries(form.text_variants || {}).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ width: '120px', paddingTop: '8px', fontWeight: 'bold', color: '#ccc', textAlign: 'right' }}>
                                .{key}
                            </div>
                            <div style={{ flex: 1 }}>
                                <SmartArea 
                                    value={val} 
                                    onChange={v => updateVariant(key, v)} 
                                    storyId={storyId} 
                                    minHeight="38px"
                                    contextQualityId={form.id} 
                                />
                            </div>
                            <button onClick={() => removeVariant(key)} style={{ background: 'none', border: 'none', color: '#e06c75', cursor: 'pointer', marginTop: '8px' }}>✕</button>
                        </div>
                    ))}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', borderTop: '1px dashed #444', paddingTop: '1rem' }}>
                    <input 
                        value={newVariantKey} 
                        onChange={e => setNewVariantKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="new_property_key" 
                        className="form-input" 
                    />
                    <button onClick={addVariant} className="save-btn" style={{ width: 'auto', padding: '0.4rem 1rem' }}>+ Add Variant</button>
                </div>
            </div>

            {/* TAGS */}
            <div className="special-field-group" style={{ borderColor: '#98c379' }}>
                <label className="special-label" style={{ color: '#98c379' }}>Behavior & Tags</label>
                
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

            {/* ITEM SETTINGS (Use Event is now SmartArea) */}
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
                                contextQualityId={form.id}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <SmartArea 
                            label="Use Event (Storylet ID)"
                            value={form.storylet || ''} 
                            onChange={v => handleChange('storylet', v)} 
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="Event ID to fire when 'Used'"
                            contextQualityId={form.id}
                        />
                    </div>
                </div>
            )}

            <div className="admin-form-footer">
                <button onClick={handleDelete} className="unequip-btn" style={{width: 'auto', padding: '0.5rem 1rem'}}>Delete</button>
                <button onClick={() => onDuplicate(form)} className="option-button" style={{width: 'auto', padding: '0.5rem 1rem', borderColor: '#e5c07b', color: '#e5c07b'}}>Duplicate</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}