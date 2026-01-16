'use client';

import { InstrumentDefinition } from '@/engine/audio/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import InstrumentEditor from './InstrumentEditor';
import { useState, useMemo } from 'react';

interface Props {
    initialData: InstrumentDefinition;
    onSave: (d: InstrumentDefinition) => void;
    onDelete: (id: string) => void;
    onDuplicate: (d: InstrumentDefinition) => void;
    storyId: string;
    guardRef: { current: FormGuard | null };
}

export default function InstrumentMainForm({ initialData, onSave, onDelete, onDuplicate, storyId, guardRef }: Props) {
    
    const isGlobal = (initialData as any).scope === 'global'; 
    const endpoint = isGlobal ? '/api/assets/audio' : '/api/admin/config';

    const saveParams = useMemo(() => isGlobal 
        ? { id: initialData.id, type: 'instrument' } 
        : { storyId, category: 'instruments', itemId: initialData.id }
    , [isGlobal, initialData.id, storyId]);

    const { 
        data: form, 
        setData, 
        handleSave, 
        revertChanges, 
        isDirty, 
        isSaving, 
        lastSaved 
    } = useCreatorForm<InstrumentDefinition>(
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
        <div className="h-full flex flex-col relative" style={{ paddingBottom: '80px' }}>
            <InstrumentEditor 
                data={form}
                onChange={(newData) => setData(newData)}
                onInsertIntoTrack={undefined} 
            />

            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={handleSave} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Instrument"
            />

            <ConfirmationModal
                isOpen={showRevertModal}
                title="Discard Changes?"
                message="Revert to last saved state?"
                variant="danger"
                confirmLabel="Discard"
                onConfirm={() => { revertChanges(); setShowRevertModal(false); }}
                onCancel={() => setShowRevertModal(false)}
            />
        </div>
    );
}