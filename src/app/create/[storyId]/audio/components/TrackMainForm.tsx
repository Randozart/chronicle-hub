// src/app/create/[storyId]/audio/components/TrackMainForm.tsx
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

    // FIX: Use Flexbox Column to manage height distribution
    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%', 
            width: '100%', 
            overflow: 'hidden',
            position: 'relative' // Context for modals
        }}>
            {/* 1. TrackEditor: Fills all available space (flex: 1) and handles its own scroll */}
            <div style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
                <TrackEditor 
                    data={form} 
                    onSave={() => {}} 
                    onDelete={() => {}} 
                    availableInstruments={availableInstruments}
                    onUpdateInstrument={() => {}} 
                    onChange={(newSource) => handleChange('source', newSource)}
                />
            </div>

            {/* 2. CommandCenter: Fixed height footer */}
            <div style={{ flexShrink: 0, height: '80px', position: 'relative', zIndex: 100 }}>
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