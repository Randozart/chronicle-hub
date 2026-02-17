'use client';

import { useEffect, useState } from 'react';
import { Opportunity, QualityDefinition } from '@/engine/models';
import OptionList from '../../storylets/components/OptionList';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import MissingEntityAlert from '@/components/admin/MissingEntityAlert';
import GameImage from '@/components/GameImage';

interface Props {
    initialData: Opportunity;
    onSave: (data: Opportunity) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: Opportunity) => void;
    qualityDefs: QualityDefinition[]; 
    guardRef: { current: FormGuard | null };
}

export default function OpportunityMainForm({ initialData, onSave, onDelete, onDuplicate, qualityDefs, guardRef }: Props) {
    
    const storyId = typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : "";

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
        guardRef,
        undefined,
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);
    const [knownDecks, setKnownDecks] = useState<string[]>([]);
    
    useEffect(() => {
        fetch(`/api/admin/decks?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : Object.values(data);
                setKnownDecks(list.map((d: any) => d.id));
            })
            .catch(err => console.error("Failed to load decks", err));
    }, [storyId]);

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    
    const isDeckMissing = form.deck && !form.deck.includes('{') && !knownDecks.includes(form.deck);

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
                    <select 
                        value={form.status || 'draft'} 
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
                        
                        {/* Disabling maintenance for Storylets, as locking is functionally useless for cards */} 
                        {/* <option value="maintenance">MAINTENANCE (Live, but Locked)</option> */}

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
                            placeholder="special_cards.cards_for_special_deck.nice_cards"
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
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea
                            label="Deck ID"
                            subLabel="Which deck this card belongs to."
                            value={form.deck || ''}
                            onChange={v => handleChange('deck', v)}
                            storyId={storyId}
                            minHeight="38px"
                            placeholder="basic_deck or { $.vip : premium_deck | basic_deck }"
                            qualityDefs={qualityDefs}
                            entityType="deck"
                        />
                        {isDeckMissing && (
                            <MissingEntityAlert id={form.deck} type="deck" storyId={storyId} />
                        )}
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <SmartArea label="Image Code" value={form.image_code || ''} onChange={v => handleChange('image_code', v)} storyId={storyId} minHeight="38px" placeholder="image_id or { $.level > 5 : special_img | normal_img }" qualityDefs={qualityDefs} />
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

                <SmartArea label="Teaser Text" subLabel="Shown on the card face." value={form.short || ''} onChange={v => handleChange('short', v)} storyId={storyId} minHeight="60px" qualityDefs={qualityDefs} />
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
                    <SmartArea 
                        label="Card Body Text" 
                        value={form.text} 
                        onChange={v => handleChange('text', v)} 
                        storyId={storyId} 
                        minHeight="150px" 
                        qualityDefs={qualityDefs} 
                    />
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                    <SmartArea 
                        label="Instruction Text (Metatext)"
                        subLabel="Instruction text below the body (e.g., 'Playing this will discard your hand')."
                        value={form.metatext || ''} 
                        onChange={v => handleChange('metatext', v)} 
                        storyId={storyId} 
                        minHeight="38px"
                        qualityDefs={qualityDefs}
                    />
                </div>
                <div className="special-field-group" style={{ borderColor: form.autofire_if ? 'var(--danger-color)' : 'var(--tool-border)', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label className="special-label" style={{ color: form.autofire_if ? 'var(--danger-color)' : 'var(--tool-text-dim)', margin: 0 }}>Autofire on Draw</label>
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
                            subLabel="Card auto-plays immediately when drawn into hand if condition is true."
                            value={form.autofire_if}
                            onChange={v => handleChange('autofire_if', v)}
                            storyId={storyId}
                            mode="condition"
                            qualityDefs={qualityDefs}
                            placeholder="$emergency > 0"
                        />
                    )}
                </div>

                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Card Behavior</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <BehaviorCard checked={form.can_discard !== false} onChange={() => handleChange('can_discard', !form.can_discard)} label="Discardable" desc="Player can remove this card." />
                        <BehaviorCard checked={!!form.keep_if_invalid} onChange={() => handleChange('keep_if_invalid', !form.keep_if_invalid)} label="Sticky" desc="Keep in hand even if invalid." />
                    </div>
                    <div className="form-group">
                        <SmartArea
                            label="Dynamic Behaviors (Advanced)"
                            subLabel="Add conditional behavior tags. Comma-separated for multiple tags."
                            value={(form as any).dynamic_behavior || ''}
                            onChange={v => handleChange('dynamic_behavior' as any, v)}
                            storyId={storyId}
                            minHeight="38px"
                            mode="text"
                            placeholder="{ $.urgent : instant_play }, clear_hand"
                            qualityDefs={qualityDefs}
                        />
                    </div>
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
                itemType="Card"
            />
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