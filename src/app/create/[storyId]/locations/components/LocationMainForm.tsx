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

interface Props {
    initialData: LocationDefinition;
    onSave: (data: LocationDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: LocationDefinition) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
}

export default function LocationMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef }: Props) {
    
    // 1. Hook Initialization
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
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    // --- Helpers ---
    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    const handleRawTagsChange = (str: string) => {
        const arr = str.split(',').map(s => s.trim()).filter(Boolean);
        handleChange('tags', arr);
    };

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    {form.regionId && (
                        <span style={{ 
                            fontSize:'0.75rem', background:'var(--tool-bg-dark)', padding:'2px 6px', borderRadius:'4px', 
                            color:'var(--tool-accent)', border:'1px solid var(--tool-border)' 
                        }}>
                            Region: {form.regionId}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                
                {/* 1. Core Info */}
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

                {/* 2. Visuals */}
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

                {/* 3. Configuration (Decks/Markets) */}
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

                {/* 4. Logic Gates */}
                <div className="admin-panel-box" style={{ marginTop: '1rem', borderColor: 'var(--tool-accent)' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent)', marginBottom: '0.5rem' }}>Access Control</label>
                    <div className="form-row">
                        <div style={{ flex: 1 }}>
                            <SmartArea 
                                label="Visible If" 
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
                                label="Unlock If (Lock)" 
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

                {/* 5. Behavior Tags */}
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

                {/* 6. Coordinates & Region */}
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
            </div>

            {/* COMMAND CENTER */}
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Location"
            />

            {/* Revert Modal */}
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