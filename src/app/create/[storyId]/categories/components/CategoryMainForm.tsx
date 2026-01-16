'use client';

import { useState } from 'react';
import { CategoryDefinition, WorldSettings } from '@/engine/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import BehaviorCard from '@/components/admin/BehaviorCard';
import SmartArea from '@/components/admin/SmartArea';
import { useToast } from '@/providers/ToastProvider';

interface Props {
    initialData: CategoryDefinition;
    settings: WorldSettings;
    onSave: (data: CategoryDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: CategoryDefinition) => void;
    onUpdateSettings: (s: WorldSettings) => void;
    storyId: string;
    guardRef: { current: FormGuard | null };
}

export default function CategoryMainForm({ 
    initialData, settings, onSave, onDelete, onDuplicate, onUpdateSettings, storyId, guardRef 
}: Props) {
    
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<CategoryDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'categories', itemId: initialData.id }, 
        guardRef,
        undefined,
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const { showToast } = useToast();
    const currentEquipConfig = (settings.equipCategories || []).find(c => 
        c === form?.id || c.startsWith(`${form?.id}*`) || c.startsWith(`${form?.id}_`)
    );
    const [equipConfigString, setEquipConfigString] = useState(currentEquipConfig || form?.id || "");
    const isInSidebar = (settings.characterSheetCategories || []).includes(form?.id || '');

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    const updateGlobalList = async (listName: 'equipCategories' | 'characterSheetCategories', newList: string[]) => {
        const updatedSettings = { ...settings, [listName]: newList };
        
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storyId, 
                    category: 'settings', 
                    itemId: 'settings', 
                    data: updatedSettings 
                })
            });
            onUpdateSettings(updatedSettings);
            showToast("World settings updated.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to update settings.", "error");
        }
    };

    const toggleSidebar = (isActive: boolean) => {
        const list = settings.characterSheetCategories || [];
        const newList = isActive ? [...list, form.id] : list.filter(c => c !== form.id);
        updateGlobalList('characterSheetCategories', newList);
    };

    const toggleEquip = (isActive: boolean) => {
        const list = settings.equipCategories || [];
        const valToAdd = equipConfigString || form.id;
        const newList = isActive ? [...list, valToAdd] : list.filter(c => c !== currentEquipConfig);
        if(isActive) setEquipConfigString(valToAdd);
        updateGlobalList('equipCategories', newList);
    };

    const handleEquipStringBlur = () => {
        if (!currentEquipConfig || currentEquipConfig === equipConfigString) return; 
        const list = settings.equipCategories || [];
        const newList = list.map(c => c === currentEquipConfig ? equipConfigString : c);
        updateGlobalList('equipCategories', newList);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: form.color || '#fff', border: '1px solid var(--tool-border)' }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                
                <div className="form-group">
                    <SmartArea 
                        label="Display Name" 
                        value={form.name || ''} 
                        onChange={v => handleChange('name', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                    />
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Description" 
                        value={form.description || ''} 
                        onChange={v => handleChange('description', v)} 
                        storyId={storyId} 
                        minHeight="80px" 
                        placeholder="Tooltip text..."
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Color Code</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input 
                            type="color" 
                            value={form.color || '#ffffff'} 
                            onChange={e => handleChange('color', e.target.value)} 
                            style={{ background: 'none', border: 'none', width: '40px', height: '40px', cursor: 'pointer' }} 
                        />
                        <input 
                            value={form.color || ''} 
                            onChange={e => handleChange('color', e.target.value)} 
                            className="form-input" 
                            placeholder="#ffffff" 
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent)', marginTop: '2rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent)' }}>System Usage</label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <BehaviorCard 
                            checked={isInSidebar} 
                            onChange={() => toggleSidebar(!isInSidebar)} 
                            label="Show in Sidebar" 
                            desc={`Qualities in "${form.id}" will appear in the main player sidebar.`} 
                        />
                        <div style={{ borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem' }}>
                            <BehaviorCard 
                                checked={!!currentEquipConfig} 
                                onChange={() => toggleEquip(!currentEquipConfig)} 
                                label="Is Equipment Slot" 
                                desc={`Creates a wearable slot for "${form.id}" items.`} 
                            />
                            
                            {currentEquipConfig && (
                                <div style={{ marginTop: '1rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '2px solid var(--tool-accent)' }}>
                                    <label className="form-label">Slot Configuration</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input 
                                            value={equipConfigString} 
                                            onChange={e => setEquipConfigString(e.target.value)} 
                                            onBlur={handleEquipStringBlur}
                                            className="form-input" 
                                            placeholder={form.id}
                                        />
                                        <button className="save-btn" onClick={handleEquipStringBlur} style={{ padding: '0 1rem', width: 'auto' }}>Update</button>
                                    </div>
                                    <p className="special-desc" style={{ marginTop: '0.5rem' }}>
                                        <code>{form.id}</code> (1 Slot), <code>{form.id}*2</code> (2 Slots), <code>{form.id}*</code> (Infinite).
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Category"
            />

            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert to last saved state?"
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}