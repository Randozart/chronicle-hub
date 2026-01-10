'use client';

import { useState } from 'react';
import { Opportunity, QualityDefinition } from '@/engine/models';
import OptionList from '../../storylets/components/OptionList';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';

interface Props {
    initialData: Opportunity;
    onSave: (data: Opportunity) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: Opportunity) => void;
    qualityDefs: QualityDefinition[]; 
    guardRef: { current: FormGuard | null };
}

export default function OpportunityMainForm({ initialData, onSave, onDelete, onDuplicate, qualityDefs, guardRef }: Props) {
    
    // Safety check for storyId (though form assumes it exists)
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

    // 1. Hook Initialization
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges,
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<Opportunity>(
        initialData, 
        '/api/admin/opportunities', 
        { storyId },
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    // Helper to update sidebar list after successful save
    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            
            {/* HEADER (Cleaned up) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    <select 
                        value={form.status || 'draft'} 
                        onChange={e => handleChange('status', e.target.value)}
                        style={{ 
                            background: form.status === 'published' ? 'var(--success-color)' : 'var(--warning-color)', 
                            color: '#000', fontWeight: 'bold', border: 'none', padding: '0.3rem', borderRadius: '4px' 
                        }}
                    >
                        <option value="draft">DRAFT</option>
                        <option value="published">PUBLISHED</option>
                    </select>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>
            
            {/* FORM BODY */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                
                <div className="form-row">
                    <div style={{ flex: 2 }}>
                        <SmartArea label="Title" value={form.name} onChange={v => handleChange('name', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Sort Order</label>
                        <input type="number" value={form.ordering || 0} onChange={e => handleChange('ordering', parseInt(e.target.value))} className="form-input" />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group"><label className="form-label">Deck ID</label><input value={form.deck || ''} onChange={e => handleChange('deck', e.target.value)} className="form-input" /></div>
                    <div className="form-group"><label className="form-label">Folder</label><input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" /></div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea label="Image Code" value={form.image_code || ''} onChange={v => handleChange('image_code', v)} storyId={storyId} minHeight="38px" placeholder="image_id or { $logic }" qualityDefs={qualityDefs} />
                    </div>
                </div>

                <SmartArea label="Teaser Text" subLabel="Shown on the card face." value={form.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />

                {/* CARD LOGIC BOX */}
                <div className="admin-panel-box" style={{ marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent)', marginBottom: '0.5rem' }}>Card Logic</label>
                    <div className="form-row">
                        <div style={{ flex: 1 }}>
                            <SmartArea label="Draw Condition" value={form.draw_condition || ''} onChange={v => handleChange('draw_condition', v)} storyId={storyId} mode="condition" placeholder="$gold > 10" subLabel="Requirements to enter hand" qualityDefs={qualityDefs} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <SmartArea label="Unlock If (Playable)" value={form.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="condition" placeholder="$energy > 5" subLabel="Requirements to play from hand" qualityDefs={qualityDefs} />
                        </div>
                    </div>
                    <div className="form-row" style={{ marginTop: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Frequency</label>
                            <select value={form.frequency || 'Standard'} onChange={e => handleChange('frequency', e.target.value)} className="form-select">
                                <option value="Always">Always (Infinite Weight)</option>
                                <option value="Frequent">Frequent (20)</option>
                                <option value="Standard">Standard (10)</option>
                                <option value="Infrequent">Infrequent (5)</option>
                                <option value="Rare">Rare (2)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <SmartArea label="Card Body Text" value={form.text} onChange={v => handleChange('text', v)} storyId={storyId} minHeight="150px" qualityDefs={qualityDefs} />
                </div>

                {/* BEHAVIOR */}
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Card Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <BehaviorCard checked={form.can_discard !== false} onChange={() => handleChange('can_discard', !form.can_discard)} label="Discardable" desc="Player can remove this card." />
                        <BehaviorCard checked={!!form.keep_if_invalid} onChange={() => handleChange('keep_if_invalid', !form.keep_if_invalid)} label="Sticky" desc="Keep in hand even if invalid." />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--success-color)', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} qualityDefs={qualityDefs} />
                </div>
            </div>

            {/* COMMAND CENTER FOOTER */}
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Card"
            />

            {/* REVERT CONFIRMATION */}
            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Are you sure you want to revert to the last saved state? All unsaved changes will be permanently lost."
                confirmLabel="Discard Changes"
                variant="danger"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}