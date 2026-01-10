'use client';

import { useState } from 'react';
import { Storylet, QualityDefinition } from '@/engine/models';
import OptionList from './OptionList';
import SmartArea from '@/components/admin/SmartArea'; 
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import { useCreatorForm } from '@/hooks/useCreatorForm';
import ConfirmationModal from '@/components/admin/ConfirmationModal';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void; // <--- Restored this prop
    onDelete: (id: string) => void;
    onDuplicate: (data: Storylet) => void;
    qualityDefs: QualityDefinition[];
    storyId: string;
}

export default function StoryletMainForm({ initialData, onSave, onDelete, onDuplicate, qualityDefs, storyId }: Props) {
    
    // 1. Hook State
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<Storylet>(
        initialData, 
        '/api/admin/storylets', 
        { storyId }
    );

    // 2. Local UI State for Modal
    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading editor state...</div>;

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    // 3. Wrapper to update parent list after successful save
    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) {
            onSave(form); // Update parent sidebar list
        }
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            
            {/* Header */}
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

            {/* Content Form Area */}
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
                    <div className="form-group" style={{ flex:1 }}>
                        <label className="form-label">Location ID</label>
                        <input value={form.location || ''} onChange={e => handleChange('location', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group"><label className="form-label">Folder</label><input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" /></div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea label="Image Code" value={form.image_code || ''} onChange={v => handleChange('image_code', v)} storyId={storyId} minHeight="38px" />
                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>Shape:</label>
                            <select value={form.image_style || 'default'} onChange={e => handleChange('image_style', e.target.value)} className="form-select" style={{ fontSize: '0.75rem', padding: '2px', width: 'auto' }}>
                                <option value="default">Global Default</option>
                                <option value="square">Square</option>
                                <option value="landscape">Landscape</option>
                                <option value="portrait">Portrait</option>
                                <option value="circle">Circle</option>
                                <option value="wide">Wide</option>
                            </select>
                        </div>
                    </div>
                </div>

                <SmartArea label="Teaser Text" value={form.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />

                <div className="admin-panel-box" style={{ marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent)', marginBottom: '0.5rem' }}>Requirements</label>
                    <div className="form-row">
                        <div style={{ flex: 1 }}><SmartArea label="Visible If" value={form.visible_if || ''} onChange={v => handleChange('visible_if', v)} storyId={storyId} mode="condition" placeholder="$gold > 0" qualityDefs={qualityDefs} /></div>
                        <div style={{ flex: 1 }}><SmartArea label="Unlock If" value={form.unlock_if || ''} onChange={v => handleChange('unlock_if', v)} storyId={storyId} mode="condition" placeholder="$gold >= 10" qualityDefs={qualityDefs} /></div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <SmartArea label="Main Text" value={form.text} onChange={v => handleChange('text', v)} storyId={storyId} minHeight="200px" qualityDefs={qualityDefs} />
                </div>

                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <BehaviorCard checked={hasProperty(form.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="Disable Return" desc="Removes the 'Go Back' button." />
                        <BehaviorCard checked={hasProperty(form.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skip to first option." />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--success-color)', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} qualityDefs={qualityDefs} />
                </div>
            </div>

            {/* COMMAND CENTER */}
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} // Use wrapper
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Storylet"
            />

            {/* REVERT CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Are you sure you want to revert to the last saved state? All unsaved changes will be permanently lost."
                confirmLabel="Discard Changes"
                cancelLabel="Keep Editing"
                variant="danger"
                onConfirm={() => {
                    revertChanges();
                    setShowRevertModal(false);
                }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}