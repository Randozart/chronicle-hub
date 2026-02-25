// src/app/create/[storyId]/audio/components/TrackMainForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { LigatureTrack, InstrumentDefinition } from '@/engine/audio/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import StrudelEditor from './StrudelEditor';

interface Props {
    initialData: LigatureTrack;
    onSave: (d: LigatureTrack) => void;
    onDelete: (id: string) => void;
    onDuplicate: (d: LigatureTrack) => void;
    storyId: string;
    availableInstruments: InstrumentDefinition[];
    guardRef: { current: FormGuard | null };
}

export default function TrackMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, availableInstruments, guardRef }: Props) {
    
    const isGlobal = (initialData as any).scope === 'global';
    const endpoint = isGlobal ? '/api/assets/audio' : '/api/admin/config';

    const saveParams = useMemo(() => isGlobal 
        ? { id: initialData.id, type: 'track' } 
        : { storyId, category: 'music', itemId: initialData.id }
    , [isGlobal, initialData.id, storyId]);

    const { 
        data: form, 
        handleChange, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<LigatureTrack>(
        initialData, 
        endpoint, 
        saveParams,
        guardRef,
        undefined,
        onSave
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            width: '100%',
            overflow: 'hidden',
            position: 'relative'
        }}>
            <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
                <StrudelEditor
                    data={form}
                    onChange={(newSource) => handleChange('source', newSource)}
                />
            </div>
            <div style={{ flexShrink: 0, height: '80px', position: 'relative', zIndex: 100 }}>
                <CommandCenter 
                    isDirty={isDirty} 
                    isSaving={isSaving} 
                    lastSaved={lastSaved} 
                    onSave={handleSave} 
                    onRevert={() => setShowRevertModal(true)} 
                    onDelete={() => onDelete(form.id)}
                    onDuplicate={() => onDuplicate(form)}
                    itemType="Track"
                />
            </div>

            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert track to last saved version?"
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}