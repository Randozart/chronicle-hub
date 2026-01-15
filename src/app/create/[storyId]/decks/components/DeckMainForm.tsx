'use client';

import { useState } from 'react';
import { DeckDefinition, QualityDefinition } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea'; 
import BehaviorCard from '@/components/admin/BehaviorCard';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';

interface Props {
    initialData: DeckDefinition;
    onSave: (data: DeckDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: DeckDefinition) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
}

export default function DeckMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef }: Props) {
    
    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<DeckDefinition>(
        initialData, 
        '/api/admin/config', 
        { storyId, category: 'decks', itemId: initialData.id }, 
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    const isSaved = form.saved === "True" || form.saved === "true" || form.saved === true as any;
    
    const toggleSaved = () => {
        handleChange('saved', isSaved ? "False" : "True");
    };

    const isSyncedTimer = form.timer === 'sync_actions';

    return (
        <div className="h-full flex flex-col relative" style={{ color: 'var(--tool-text-main)', paddingBottom: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--tool-border)' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--tool-text-header)' }}>{form.id}</h2>
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
                        qualityDefs={qualityDefs} 
                        placeholder="Opportunities"
                    />
                    <p className="special-desc">Title shown above the hand.</p>
                </div>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label="Hand Size" 
                            value={String(form.hand_size)} 
                            onChange={v => handleChange('hand_size', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="3"
                            subLabel="Logic allowed ({$stat})"
                            qualityDefs={qualityDefs}
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <SmartArea 
                            label="Deck Cap (Max Cards)" 
                            value={String(form.deck_size || '')} 
                            onChange={v => handleChange('deck_size', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            placeholder="0 = Unlimited"
                            subLabel="Limit total cards in stack."
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Visual Style</label>
                        <select 
                            value={form.card_style || 'default'} 
                            onChange={e => handleChange('card_style', e.target.value)} 
                            className="form-select"
                            style={{ height: '40px' }}
                        >
                            <option value="default">Global Default</option>
                            <option value="cards">Standard Cards</option>
                            <option value="rows">List Rows</option>
                            <option value="scrolling">Horizontal Scroll</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Sort Order</label>
                        <input 
                            type="number" 
                            value={form.ordering || 0} 
                            onChange={e => handleChange('ordering', parseInt(e.target.value))} 
                            className="form-input" 
                            style={{ height: '40px' }}
                        />
                    </div>
                </div>
                <div className="admin-panel-box" style={{ marginTop: '1rem', borderColor: 'var(--tool-accent)' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent)', marginBottom: '0.5rem' }}>Mechanics</label>
                    
                    <div className="form-group">
                        <label className="form-label">Regeneration Timer</label>
                        <select 
                            value={isSyncedTimer ? 'sync_actions' : 'custom'}
                            onChange={(e) => {
                                if (e.target.value === 'sync_actions') handleChange('timer', 'sync_actions');
                                else handleChange('timer', '10');
                            }}
                            className="form-select"
                            style={{ marginBottom: '0.5rem', height: '40px' }}
                        >
                            <option value="sync_actions">Sync with Action Points</option>
                            <option value="custom">Custom Duration / Logic</option>
                        </select>
                        
                        {!isSyncedTimer && (
                            <SmartArea 
                                value={form.timer || ''} 
                                onChange={v => handleChange('timer', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                placeholder="Minutes (e.g. 10 or { $speed * 2 })"
                                qualityDefs={qualityDefs}
                            />
                        )}
                    </div>

                    <div className="form-group">
                        <SmartArea 
                            label="Draw Cost Condition" 
                            value={form.draw_cost || ''} 
                            onChange={v => handleChange('draw_cost', v)} 
                            storyId={storyId} 
                            minHeight="38px" 
                            mode="condition"
                            placeholder="Optional: e.g. $gold >= 1"
                            subLabel="Requirements to draw a card manually."
                            qualityDefs={qualityDefs}
                        />
                    </div>
                </div>
                <div className="special-field-group" style={{ borderColor: 'var(--tool-accent-mauve)', marginTop: '1rem' }}>
                    <label className="special-label" style={{ color: 'var(--tool-accent-mauve)' }}>Behavior</label>
                    <BehaviorCard 
                        checked={isSaved} 
                        onChange={toggleSaved} 
                        label="Persistent (Saved)" 
                        desc="Cards drawn from this deck stay in the hand when the player leaves the location." 
                    />
                </div>
            </div>
            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Deck"
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