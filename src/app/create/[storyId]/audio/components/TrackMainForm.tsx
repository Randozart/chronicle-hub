'use client';

import { useState } from 'react';
import { LigatureTrack, InstrumentDefinition } from '@/engine/audio/models';
import { useCreatorForm, FormGuard } from '@/hooks/useCreatorForm';
import CommandCenter from '@/components/admin/CommandCenter';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import TrackEditor from './TrackEditor'; 

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
    const extraParams = isGlobal 
        ? { id: initialData.id, type: 'track' } 
        : { storyId, category: 'music', itemId: initialData.id };

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
        extraParams, 
        guardRef
    );

    const [showRevertModal, setShowRevertModal] = useState(false);

    if (!form) return <div className="loading-container">Loading...</div>;

    const onSaveClick = async () => {
        const success = await handleSave();
        if (success && form) onSave(form);
    };

    return (
        <div className="h-full flex flex-col relative" style={{ paddingBottom: '80px' }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <TrackEditor 
                    data={form} 
                    onSave={() => {}} // Disabled
                    onDelete={() => {}} // Disabled
                    availableInstruments={availableInstruments}
                    onUpdateInstrument={() => {}} 
                    // This prop hooks the editor source back to the form state
                    // The TrackEditor must be updated to call this when its internal source changes
                    onChange={(newSource) => handleChange('source', newSource)}
                />
            </div>

            <CommandCenter 
                isDirty={isDirty} 
                isSaving={isSaving} 
                lastSaved={lastSaved} 
                onSave={onSaveClick} 
                onRevert={() => setShowRevertModal(true)} 
                onDelete={() => onDelete(form.id)}
                onDuplicate={() => onDuplicate(form)}
                itemType="Track"
            />

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