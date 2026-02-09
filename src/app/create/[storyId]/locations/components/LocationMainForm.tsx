'use client';

import { useState } from 'react';
import { LocationDefinition, QualityDefinition } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea'; 
import BehaviorCard from '@/components/admin/BehaviorCard';
import GameImage from '@/components/GameImage';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import LocationContentTab from './LocationContentTab'; 
interface Props {
    initialData: LocationDefinition;
    onSave: (data: LocationDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: LocationDefinition) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
    onCreateStoryletInLocation: (locId: string) => void; 
}

export default function LocationMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef, onCreateStoryletInLocation }: Props) {
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<LocationDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'locations', itemId: initialData.id }, 
        guardRef,
        undefined,
        onSave
    );

    const [activeTab, setActiveTab] = useState<'settings' | 'content'>('settings');
    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    const handleRawTagsChange = (str: string) => {
        const arr = str.split(',').map(s => s.trim()).filter(Boolean);
        handleChange('tags', arr);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    
                    <div style={{ display: 'flex', background: 'var(--tool-bg-input)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--tool-border)' }}>
                        <button 
                            onClick={() => setActiveTab('settings')}
                            style={{ 
                                padding: '4px 12px', cursor: 'pointer', border: 'none', 
                                background: activeTab === 'settings' ? 'var(--tool-accent)' : 'transparent',
                                color: activeTab === 'settings' ? '#000' : 'inherit', fontWeight: 'bold'
                            }}
                        >
                            Settings
                        </button>
                        <button 
                            onClick={() => setActiveTab('content')}
                            style={{ 
                                padding: '4px 12px', cursor: 'pointer', border: 'none', 
                                background: activeTab === 'content' ? 'var(--tool-accent)' : 'transparent',
                                color: activeTab === 'content' ? '#000' : 'inherit', fontWeight: 'bold'
                            }}
                        >
                            Linked Content
                        </button>
                    </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                
                {activeTab === 'content' ? (
                    <LocationContentTab 
                        storyId={storyId} 
                        locationId={form.id} 
                        onCreateHere={() => onCreateStoryletInLocation(form.id)}
                    />
                ) : (
                    <>
                        <div className="form-group">
                            <SmartArea 
                                label="Display Name" 
                                value={form.name} 
                                onChange={v => handleChange('name', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                qualityDefs={qualityDefs} 
                                placeholder="Visible to player"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Image Code</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <SmartArea 
                                        value={form.image || ''} 
                                        onChange={v => handleChange('image', v)} 
                                        storyId={storyId} 
                                        minHeight="38px" 
                                        qualityDefs={qualityDefs}
                                        placeholder="asset_id"
                                    />
                                </div>
                                {form.image && (
                                    <div style={{width: 38, height: 38, border: '1px solid var(--tool-border)', borderRadius: '4px', overflow: 'hidden'}}>
                                        <GameImage code={form.image} imageLibrary={{}} type="icon" className="option-image"/>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <SmartArea 
                                label="Description" 
                                value={form.description || ''} 
                                onChange={v => handleChange('description', v)} 
                                storyId={storyId} 
                                minHeight="80px" 
                                qualityDefs={qualityDefs}
                                placeholder="Narrative description shown upon arrival."
                            />
                        </div>
                        <div className="admin-panel-box" style={{ marginTop: '1rem' }}>
                            <label className="special-label" style={{ color: 'var(--tool-text-dim)', marginBottom: '0.5rem' }}>Configuration</label>
                            <div className="form-row">
                                <div style={{ flex: 1 }}>
                                    <SmartArea 
                                        label="Deck ID" 
                                        value={form.deck || ''} 
                                        onChange={v => handleChange('deck', v)} 
                                        storyId={storyId} 
                                        minHeight="38px" 
                                        qualityDefs={qualityDefs}
                                        placeholder="village_deck"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <SmartArea 
                                        label="Market ID" 
                                        value={form.marketId || ''} 
                                        onChange={v => handleChange('marketId', v)} 
                                        storyId={storyId} 
                                        minHeight="38px" 
                                        qualityDefs={qualityDefs}
                                        placeholder="grand_bazaar"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="admin-panel-box" style={{ marginTop: '1rem', borderColor: 'var(--tool-accent)' }}>
                            <label className="special-label" style={{ color: 'var(--tool-accent)', marginBottom: '0.5rem' }}>Access Control</label>
                            <div className="form-row">
                                <div style={{ flex: 1 }}>
                                    <SmartArea 
                                        label="Requirement for Visibility" 
                                        subLabel="Condition to unlock this location. Leave blank for always visible."
                                        value={form.visibleCondition || ''} 
                                        onChange={v => handleChange('visibleCondition', v)} 
                                        storyId={storyId} 
                                        mode="condition" 
                                        qualityDefs={qualityDefs}
                                        placeholder="$discovered_map >= 1"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <SmartArea 
                                        label="Requirement for Selectability" 
                                        subLabel="Condition to enable interaction. Leave blank for always selectable."
                                        value={form.unlockCondition || ''} 
                                        onChange={v => handleChange('unlockCondition', v)} 
                                        storyId={storyId} 
                                        mode="condition" 
                                        qualityDefs={qualityDefs}
                                        placeholder="$key_item >= 1"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                            <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <BehaviorCard checked={hasProperty(form.tags, 'lock_equipment')} onChange={() => handleTagToggle('lock_equipment')} label="Lock Equip" desc="Disable inventory." />
                                <BehaviorCard checked={hasProperty(form.tags, 'safe_zone')} onChange={() => handleTagToggle('safe_zone')} label="Safe Zone" desc="No menance autofire." />
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Raw Tags</label>
                                <input value={form.tags?.join(', ') || ''} onChange={e => handleRawTagsChange(e.target.value)} className="form-input" />
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem' }}>
                            <SmartArea 
                                label="Lock Message" 
                                value={form.equipmentLockMessage || ''} 
                                onChange={v => handleChange('equipmentLockMessage', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                qualityDefs={qualityDefs}
                                placeholder="You cannot change equipment here."
                            />
                        </div>
                        <div className="form-row" style={{ marginTop: '1rem', borderTop: '1px dashed var(--tool-border)', paddingTop: '1rem' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Map Region ID</label>
                                <input value={form.regionId || ''} onChange={e => handleChange('regionId', e.target.value)} className="form-input" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Map Coords</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        value={form.coordinates?.x || 0} 
                                        onChange={e => handleChange('coordinates', { ...form.coordinates, x: parseInt(e.target.value) })} 
                                        className="form-input" 
                                        placeholder="X" 
                                    />
                                    <input 
                                        type="number" 
                                        value={form.coordinates?.y || 0} 
                                        onChange={e => handleChange('coordinates', { ...form.coordinates, y: parseInt(e.target.value) })} 
                                        className="form-input" 
                                        placeholder="Y" 
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Location"
            />
            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert to last saved state? Unsaved changes will be lost."
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}