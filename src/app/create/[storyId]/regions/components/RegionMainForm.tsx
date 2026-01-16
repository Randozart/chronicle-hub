'use client';

import { useMemo, useState } from 'react';
import { MapRegion, QualityDefinition } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea'; 
import GameImage from '@/components/GameImage';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';

interface Props {
    initialData: MapRegion;
    onSave: (data: MapRegion) => void;
    onDelete: (id: string) => void;
    onDuplicate: (data: MapRegion) => void;
    storyId: string;
    qualityDefs: QualityDefinition[];
    guardRef: { current: FormGuard | null };
}

export default function RegionMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, qualityDefs, guardRef }: Props) {
    const saveParams = useMemo(() => ({
        storyId, 
        category: 'regions', 
        itemId: initialData.id 
    }), [storyId, initialData.id]);

    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<MapRegion>(
        initialData, 
        '/api/admin/config', 
        saveParams, 
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

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
                        value={form.name} 
                        onChange={v => handleChange('name', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        qualityDefs={qualityDefs} 
                        placeholder="Visible Name"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Map Image</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <SmartArea 
                                value={form.image || ''} 
                                onChange={v => handleChange('image', v)} 
                                storyId={storyId} 
                                minHeight="38px" 
                                qualityDefs={qualityDefs} 
                                placeholder="asset_id or { $logic }"
                            />
                            <p className="special-desc">
                                If empty, the Travel interface will use a List View instead of a Visual Map.
                            </p>
                        </div>
                    </div>
                    {form.image && !form.image.includes('{') && (
                        <div style={{ marginTop: '1rem', border: '1px solid var(--tool-border)', borderRadius: '4px', height: '200px', position: 'relative', overflow: 'hidden', background: '#000' }}>
                            <GameImage 
                                code={form.image} 
                                imageLibrary={{}} 
                                type="map"
                                alt="Map Preview"
                                className="w-full h-full object-cover"
                            />
                            <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>Preview</div>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Default Market ID" 
                        value={form.marketId || ''} 
                        onChange={v => handleChange('marketId', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        qualityDefs={qualityDefs} 
                        placeholder="region_market"
                    />
                    <p className="special-desc">Used if a specific Location doesn't have its own market defined.</p>
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
                itemType="Region"
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