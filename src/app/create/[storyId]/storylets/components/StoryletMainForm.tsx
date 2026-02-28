'use client';

import { useState, useEffect } from 'react';
import { Storylet, QualityDefinition } from '@/engine/models';
import OptionList from './OptionList';
import SmartArea from '@/components/admin/SmartArea';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import GameImage from '@/components/GameImage';
import MissingEntityAlert from '@/components/admin/MissingEntityAlert';
import SoundsModal from '@/components/admin/SoundsModal';

interface Props {
    initialData: Storylet;
    onSave: (data: Storylet) => void; 
    onDelete: (id: string) => void;
    onDuplicate: (data: Storylet) => void;
    qualityDefs: QualityDefinition[];
    storyId: string;
    guardRef: { current: FormGuard | null }; 
}

export default function StoryletMainForm({ initialData, onSave, onDelete, onDuplicate, qualityDefs, storyId, guardRef }: Props) {

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
        { storyId },
        guardRef,
        undefined,
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [knownLocations, setKnownLocations] = useState<string[]>([]);

    useEffect(() => {
        fetch(`/api/admin/locations?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const locObj = data || {};
                const locs = Object.values(locObj).map((loc: any) => loc.id);
                setKnownLocations(locs);
            })
            .catch(err => console.error("Failed to load locations", err));
    }, [storyId]);

    if (!form) return <div className="loading-container">Loading editor state...</div>;

    const handleTagToggle = (tag: string) => {
        const newTags = toggleProperty(form.tags, tag);
        handleChange('tags', newTags);
    };

    const isLocationMissing = form.location && !form.location.includes('{') && !knownLocations.includes(form.location);

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) {
            onSave(form); 
        }
    };

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    <select 
                        value={form.status || 'playtest'}
                        onChange={e => handleChange('status', e.target.value)} 
                        style={{ 
                            background: 
                                form.status === 'published' ? 'var(--success-color)' : 
                                form.status === 'playtest' ? 'var(--tool-accent)' :
                                form.status === 'review' ? 'var(--warning-color)' :
                                form.status === 'maintenance' ? 'var(--danger-color)' :
                                'var(--tool-bg-input)',
                            color: form.status === 'draft' ? 'var(--tool-text-main)' : '#000', 
                            fontWeight: 'bold', border: '1px solid var(--tool-border)', padding: '0.3rem', borderRadius: '4px' 
                        }}
                    >
                        <option value="draft">DRAFT (Hidden)</option>
                        <option value="playtest">PLAYTEST (Testing)</option>
                        <option value="review">REVIEW (Live, but Unfinished)</option>
                        <option value="published">PUBLISHED (Live)</option>
                        <option value="maintenance">MAINTENANCE (Live, but Locked)</option>
                        <option value="archived">ARCHIVED (Hidden)</option>
                    </select>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', fontFamily: 'monospace' }}>v{form.version || 1}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div style={{ marginBottom: '10px' }}>
                    <SmartArea 
                        label="Title" 
                        value={form.name} 
                        onChange={v => handleChange('name', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        qualityDefs={qualityDefs} 
                    />
                </div>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Folder</label>
                        <input 
                            value={form.folder || ''} 
                            onChange={e => handleChange('folder', e.target.value)} 
                            className="form-input" 
                            placeholder="e.g. Chapter 1" 
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Internal Label</label>
                        <input 
                            // @ts-ignore
                            value={form.editor_name || ''} 
                            // @ts-ignore
                            onChange={e => handleChange('editor_name', e.target.value)} 
                            className="form-input" 
                            placeholder="Editor Only Name" 
                            style={{ borderColor: 'var(--tool-accent)' }} 
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Sort Order</label>
                        <input 
                            type="number" 
                            value={form.ordering || 0} 
                            onChange={e => handleChange('ordering', parseInt(e.target.value))} 
                            className="form-input" 
                        />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group" style={{ flex:1 }}>
                        <SmartArea
                            label="Location ID"
                            subLabel="Where this storylet appears. Leave blank for global access."
                            value={form.location || ''}
                            onChange={v => handleChange('location', v)}
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="village_square or { $.discovered : secret_area | village_square }"
                            qualityDefs={qualityDefs}
                            entityType="location"
                        />
                        {isLocationMissing && form.location && (
                            <MissingEntityAlert id={form.location} type="location" storyId={storyId} />
                        )}
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <SmartArea label="Image Code" value={form.image_code || ''} onChange={v => handleChange('image_code', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} />
                            </div>
                            {form.image_code && !form.image_code.includes('{') && (
                                <div style={{width: 38, height: 38, border: '1px solid var(--tool-border)', borderRadius: '4px', overflow: 'hidden'}}>
                                    <GameImage code={form.image_code} imageLibrary={{}} type="icon" className="option-image"/>
                                </div>
                            )}
                        </div>
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
                        <div style={{ flex: 1 }}>
                            <SmartArea 
                                label="Requirement for Visibility" 
                                subLabel="Condition to unlock this Storylet. Leave blank for always visible." 
                                value={form.visible_if || ''} 
                                onChange={v => handleChange('visible_if', v)} 
                                storyId={storyId} 
                                mode="condition" 
                                placeholder="$gold > 0" 
                                qualityDefs={qualityDefs} 
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <SmartArea 
                                label="Requirement for Selectability" 
                                subLabel="Condition to enable interaction. Leave blank for always selectable." 
                                value={form.unlock_if || ''} 
                                onChange={v => handleChange('unlock_if', v)} 
                                storyId={storyId} 
                                mode="condition" 
                                placeholder="$gold >= 10" 
                                qualityDefs={qualityDefs} 
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <SmartArea label="Main Text" value={form.text} onChange={v => handleChange('text', v)} storyId={storyId} minHeight="200px" qualityDefs={qualityDefs} />
                </div>
                <SmartArea 
                    label="Instruction Text (Meta)"
                    subLabel="Italic text below the body."
                    value={form.metatext || ''} 
                    onChange={v => handleChange('metatext', v)} 
                    storyId={storyId} 
                    minHeight="38px"
                    qualityDefs={qualityDefs}
                />
                <div className="special-field-group" style={{ borderColor: form.autofire_if ? 'var(--danger-color)' : 'var(--tool-border)', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="special-label" style={{ color: form.autofire_if ? 'var(--danger-color)' : 'var(--tool-text-dim)', margin: 0 }}>Must-Event (Autofire)</label>
                        <label className="toggle-label">
                            <input 
                                type="checkbox" 
                                checked={!!form.autofire_if} 
                                onChange={e => handleChange('autofire_if', e.target.checked ? 'true' : '')} 
                            />
                            Enable
                        </label>
                    </div>
                    {form.autofire_if !== undefined && (
                        <SmartArea 
                            label="Condition" 
                            value={form.autofire_if} 
                            onChange={v => handleChange('autofire_if', v)} 
                            storyId={storyId} 
                            mode="condition" 
                            qualityDefs={qualityDefs}
                            placeholder="$quality > 10"
                        />
                    )}
                </div>
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <BehaviorCard checked={hasProperty(form.tags, 'no_return')} onChange={() => handleTagToggle('no_return')} label="Disable Return" desc="Removes the 'Go Back' button." />
                        <BehaviorCard checked={hasProperty(form.tags, 'instant_redirect')} onChange={() => handleTagToggle('instant_redirect')} label="Instant Redirect" desc="Skip to first option." />
                    </div>
                    <div className="form-group">
                        <SmartArea
                            label="Return Destination"
                            subLabel="Where the 'Go Back' button leads. Leave blank for previous location."
                            value={form.return || ''}
                            onChange={v => handleChange('return', v)}
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="location_hub or { $.quest_active : quest_zone | location_hub }"
                            qualityDefs={qualityDefs}
                            entityType="location"
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <SmartArea
                            label="Raw Tags"
                            subLabel="Comma-separated. Supports ScribeScript for conditional tags."
                            value={(form.tags || []).join(', ')}
                            onChange={v => handleChange('tags', v.split(',').map(t => t.trim()).filter(Boolean))}
                            storyId={storyId}
                            minHeight="38px"
                            qualityDefs={qualityDefs}
                            placeholder="no_return, { $.stress > 10 : instant_redirect }"
                        />
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--tool-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audio</span>
                    <SoundsModal label="Sounds" hasContent={!!form.musicTrackId}>
                        <div className="form-group">
                            <label className="form-label">Music Override</label>
                            <SmartArea
                                storyId={storyId}
                                value={form.musicTrackId || ''}
                                onChange={v => handleChange('musicTrackId', v || undefined)}
                                entityType="music"
                                placeholder="None — or type a ScribeScript expression"
                                minHeight="38px"
                            />
                            <p className="special-desc">Replaces or ducks location music while this storylet is open.</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Music Mode</label>
                            <select
                                value={form.musicMode || ''}
                                onChange={e => handleChange('musicMode', e.target.value || undefined)}
                                className="form-input"
                                style={{ fontSize: '0.82rem' }}
                            >
                                <option value="">Replace (stop location music)</option>
                                <option value="duck">Duck (lower location music volume)</option>
                            </select>
                        </div>
                    </SoundsModal>
                </div>

                <div style={{ marginTop: '2rem', borderTop: '1px solid var(--tool-border)', paddingTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--success-color)', marginBottom: '1rem' }}>Options</h3>
                    <OptionList options={form.options || []} onChange={(newOpts) => handleChange('options', newOpts)} storyId={storyId} qualityDefs={qualityDefs} />
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
                itemType="Storylet"
            />
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