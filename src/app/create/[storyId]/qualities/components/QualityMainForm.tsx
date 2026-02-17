'use client';

import { useEffect, useState } from 'react';
import { QualityDefinition, QualityType, WorldSettings } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import GameImage from '@/components/GameImage';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import { toggleProperty, hasProperty } from '@/utils/propertyHelpers';
import MissingEntityAlert from '@/components/admin/MissingEntityAlert';

interface Props {
    initialData: QualityDefinition;
    settings: WorldSettings;
    onSave: (data: QualityDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: QualityDefinition) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
}
const Accessor = ({ code }: { code: string }) => (
    <span style={{ 
        fontFamily: 'monospace', 
        fontSize: '0.75em', 
        color: 'var(--tool-accent)', 
        background: 'var(--tool-bg-sidebar)', 
        padding: '1px 4px', 
        borderRadius: '3px', 
        border: '1px solid var(--tool-border)',
        marginLeft: '8px',
        fontWeight: 'normal'
    }}>
        {code}
    </span>
);

export default function QualityMainForm({ initialData, settings, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef }: Props) {
    
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved,
        setData 
    } = useCreatorForm<QualityDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'qualities', itemId: initialData.id }, 
        guardRef,
        undefined,
        onSave   
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [newVariantKey, setNewVariantKey] = useState("");
    const [knownCategories, setKnownCategories] = useState<string[]>([]);
    
    useEffect(() => {
        fetch(`/api/admin/categories?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const cats = Object.values(data).map((c: any) => c.id);
                setKnownCategories(cats);
            })
            .catch(err => console.error("Failed to load categories for validation", err));
    }, [storyId]);

    if (!form) return <div className="loading-container">Loading...</div>;

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

    const addVariant = () => {
        if (!newVariantKey) return;
        const current = form.text_variants || {};
        handleChange('text_variants', { ...current, [newVariantKey]: "" });
        setNewVariantKey("");
    };

    const updateVariant = (key: string, val: string) => {
        const current = form.text_variants || {};
        const nextVariants = { ...current, [key]: val };
        handleChange('text_variants', nextVariants);
    };

    const removeVariant = (key: string) => {
        const current = { ...form.text_variants };
        delete current[key];
        handleChange('text_variants', current);
    };

    const getMissingCategories = () => {
        if (!form.category) return [];
        return form.category.split(',')
            .map(s => s.trim())
            .filter(s => s && !s.includes('{') && !knownCategories.includes(s));
    };
    const missingCats = getMissingCategories();


    const getConflict = (id: string) => {
        const cleanId = id.toLowerCase();
        if (cleanId === settings.actionId?.replace('$', '')) return { type: 'info', msg: "Bound to 'Action Points'." };
        if (cleanId === settings.playerName?.replace('$', '')) return { type: 'info', msg: "Bound to 'Player Name'." };
        return null;
    };
    const conflict = getConflict(form.id);

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    {conflict && (
                        <span style={{ 
                            fontSize:'0.75rem', background:'var(--tool-bg-dark)', padding:'2px 6px', borderRadius:'4px', 
                            color:'var(--warning-color)', border:'1px solid var(--warning-color)' 
                        }}>
                            {conflict.msg}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>
                        Accessor: <span style={{ color: 'var(--tool-accent)' }}>${form.id}</span>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)', fontFamily: 'monospace' }}>v{form.version || 1}</span>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                        <SmartArea 
                            label={<span>Display Name <Accessor code="$.name" /></span>}
                            value={form.name || ''} 
                            onChange={v => handleChange('name', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            contextQualityId={form.id} 
                            qualityDefs={qualityDefs} 
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Type <Accessor code="$.type" /></label>
                        <select value={form.type} onChange={e => handleChange('type', e.target.value as any)} className="form-select">
                            <option value="P">Pyramidal</option>
                            <option value="C">Counter</option>
                            <option value="I">Item</option>
                            <option value="E">Equipable</option>
                            <option value="S">String</option>
                            <option value="T">Tracker</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Folder</label>
                        <input value={form.folder || ''} onChange={e => handleChange('folder', e.target.value)} className="form-input" placeholder="Items.Weapons" />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Internal Label</label>
                        <input value={form.editor_name || ''} onChange={e => handleChange('editor_name', e.target.value)} className="form-input" placeholder="Editor Only Name" style={{ borderColor: 'var(--tool-accent)' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Sort Order <Accessor code="$.ordering" /></label>
                        <input type="number" value={form.ordering || 0} onChange={e => handleChange('ordering', parseInt(e.target.value))} className="form-input" />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label={<span>Category <Accessor code="$.category" /></span>}
                            value={form.category || ''} 
                            onChange={v => handleChange('category', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            qualityDefs={qualityDefs} 
                        />
                        {missingCats.map(cat => (
                            <MissingEntityAlert key={cat} id={cat} type="category" storyId={storyId} />
                        ))}
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Image Code <Accessor code="$.image" /></label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <SmartArea value={form.image || ''} onChange={v => handleChange('image', v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} />
                            </div>
                            {form.image && <div style={{width: 38, height: 38}}><GameImage code={form.image} imageLibrary={{}} type="icon" className="option-image"/></div>}
                        </div>
                    </div>
                </div>
                <div className="form-row">
                     <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label={<span>Singular Name <Accessor code="$.singular" /></span>}
                            value={form.singular_name || ''} 
                            onChange={v => handleChange('singular_name', v)} 
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="e.g. Coin" 
                            contextQualityId={form.id}
                            qualityDefs={qualityDefs}
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label={<span>Plural Name <Accessor code="$.plural" /></span>}
                            value={form.plural_name || ''} 
                            onChange={v => handleChange('plural_name', v)} 
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="e.g. Coins" 
                            contextQualityId={form.id}
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>
                <SmartArea 
                    label={<span>Description <Accessor code="$.description" /></span>}
                    value={form.description || ''} 
                    onChange={v => handleChange('description', v)} 
                    storyId={storyId} 
                    minHeight="80px" 
                    qualityDefs={qualityDefs} 
                />
                {(form.type === 'P' || form.type === 'C' || form.type === 'T') && (
                    <div className="special-field-group" style={{ borderColor: 'var(--warning-color)', marginTop: '1rem' }}>
                        <label className="special-label" style={{ color: 'var(--warning-color)' }}>Progression Limits</label>
                        <div className="form-row">
                            <div className="form-group" style={{flex:1}}>
                                <SmartArea label="Hard Cap (Cannot exceed)" value={form.max || ''} onChange={v => handleChange('max', v)} storyId={storyId} minHeight="38px" placeholder="Infinity" qualityDefs={qualityDefs} />
                            </div>
                            <div className="form-group" style={{flex:1}}>
                                <SmartArea label="Soft Cap (Can exceed with bonuses)" value={form.grind_cap || ''} onChange={v => handleChange('grind_cap', v)} storyId={storyId} minHeight="38px" placeholder="None" qualityDefs={qualityDefs} />
                            </div>
                            {form.type === 'P' && (
                                <div className="form-group" style={{flex:1}}>
                                    <SmartArea label="CP Cap" value={form.cp_cap || ''} onChange={v => handleChange('cp_cap', v)} storyId={storyId} minHeight="38px" placeholder="None" qualityDefs={qualityDefs} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="special-field-group" style={{ borderColor: '#61afef', marginTop: '1rem' }}>
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
                            qualityDefs={qualityDefs}
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
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Text Variants</label>
                    <p className="special-desc">Custom properties accessed via accessor syntax.</p>
                    
                    <div style={{ display: 'grid', gap: '10px', marginTop: '1rem' }}>
                        {Object.entries(form.text_variants || {}).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ 
                                    minWidth: '120px', 
                                    maxWidth: '150px',
                                    paddingTop: '10px', 
                                    textAlign: 'right', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'flex-end',
                                    wordBreak: 'break-word'
                                }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-main)', fontWeight: 'bold', lineHeight: '1.2' }}>{key}</span>
                                    <div style={{ marginTop: '2px' }}><Accessor code={`$.${key}`} /></div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <SmartArea value={val as string} onChange={v => updateVariant(key, v)} storyId={storyId} minHeight="38px" qualityDefs={qualityDefs} />
                                </div>
                                <button onClick={() => removeVariant(key)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px' }}>✕</button>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--tool-border)' }}>
                        <input value={newVariantKey} onChange={e => setNewVariantKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="new_property_key" className="form-input" />
                        <button onClick={addVariant} className="save-btn" style={{ width: 'auto', padding: '0.4rem 1rem' }}>+ Add</button>
                    </div>
                </div>
                <div className="special-field-group" style={{ borderColor: 'var(--success-color)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--success-color)' }}>Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <BehaviorCard checked={hasProperty(form.tags, 'hidden')} onChange={() => handleTagToggle('hidden')} label="Hidden" desc="Do not show on profile." />
                        <BehaviorCard checked={hasProperty(form.tags, 'hide_level')} onChange={() => handleTagToggle('hide_level')} label="Hide Level" desc="Hide the numeric value." />
                        <BehaviorCard checked={hasProperty(form.tags, 'fx_only')} onChange={() => handleTagToggle('fx_only')} label="FX Only" desc="Only show when modified by an effect." />                        
                            {(form.type === 'E') && (
                            <>
                                <BehaviorCard checked={hasProperty(form.tags, 'auto_equip')} onChange={() => handleTagToggle('auto_equip')} label="Auto-Equip" desc="Equip on gain." />
                                <BehaviorCard checked={hasProperty(form.tags, 'force_equip')} onChange={() => handleTagToggle('force_equip')} label="Force-Equip" desc="Equip on gain, unequip whatever is in the equipment slot." />
                                <BehaviorCard checked={hasProperty(form.tags, 'bound')} onChange={() => handleTagToggle('bound')} label="Bind-on-Equip" desc="Cannot unequip." />
                            </>
                        )}
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <SmartArea
                            label="Raw Tags (Comma Separated)"
                            value={form.tags?.join(', ') || ''} 
                            onChange={handleRawTagsChange}
                            storyId={storyId}
                            minHeight="38px"
                            qualityDefs={qualityDefs}
                            placeholder="tag1, tag2"
                        />
                        <p className="special-desc" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--tool-text-dim)' }}>
                            Supports ScribeScript logic. Tags affect behavior in various parts of the game.
                        </p>
                </div>
                </div>
                {(form.type === 'E' || form.type === 'I') && (
                    <div className="form-group" style={{ borderTop: '1px solid var(--tool-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <label className="special-label" style={{color: 'var(--tool-accent)'}}>Item Logic</label>
                        {form.type === 'E' && (
                            <div className="form-group">
                                <SmartArea label="Stat Bonus" value={form.bonus || ''} onChange={v => handleChange('bonus', v)} storyId={storyId} minHeight="38px" placeholder="$strength + 1" qualityDefs={qualityDefs} />
                            </div>
                        )}
                        <div className="form-group">
                            <SmartArea
                                label="Use Event (Storylet ID)"
                                subLabel="Storylet that fires when this item is used."
                                value={form.storylet || ''}
                                onChange={v => handleChange('storylet', v)}
                                storyId={storyId}
                                minHeight="38px"
                                qualityDefs={qualityDefs}
                                placeholder="use_potion or { $.cursed : cursed_event | normal_event }"
                                entityType="storylet"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="form-group">
                <SmartArea 
                    label="Lock Message (if Bound)" 
                    value={form.lock_message || ''} 
                    onChange={v => handleChange('lock_message', v)} 
                    storyId={storyId} 
                    minHeight="38px" 
                    placeholder="You cannot unequip this item."
                    contextQualityId={form.id}
                    qualityDefs={qualityDefs}
                />
            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Quality"
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