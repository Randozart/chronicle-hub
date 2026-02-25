'use client';

import { useState, useEffect, use, useRef } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import { AUDIO_PRESETS } from '@/engine/audio/presets'; 
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InstrumentMainForm from './components/InstrumentMainForm';
import TrackMainForm from './components/TrackMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

type AudioItem = (InstrumentDefinition | LigatureTrack) & { 
    category: 'instrument' | 'track';
    scope: 'local' | 'global';
    folder?: string;
};

export default function AudioAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    const [items, setItems] = useState<AudioItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        type: 'instrument' | 'track';
        sourceItem?: AudioItem;
    }>({ isOpen: false, mode: 'create', type: 'instrument' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    const fetchData = () => {
        setIsLoading(true);
        fetch(`/api/admin/audio?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const combined: AudioItem[] = [];

                if (data.instruments) {
                    Object.values(data.instruments).forEach((i: any) => 
                        combined.push({ ...i, category: 'instrument', scope: 'local', folder: 'Project Instruments' })
                    );
                }
                
                if (data.music) {
                    Object.values(data.music).forEach((t: any) => 
                        combined.push({ ...t, category: 'track', scope: 'local', folder: 'Project Tracks' })
                    );
                }

                if (data.global) {
                     data.global.forEach((g: any) => {
                        if (g.type !== 'instrument' && g.type !== 'track') return;

                        const cat = g.type as 'instrument' | 'track';
                        const subFolder = g.type === 'instrument' ? 'Instruments' : 'Tracks';
                        
                        combined.push({ 
                            ...g.data, 
                            id: g.id, 
                            category: cat, 
                            scope: 'global', 
                            folder: `Global Assets/${subFolder}` 
                        });
                     });
                }
                setItems(combined);
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => { fetchData(); }, [storyId]);
    const handleSelectAttempt = (newId: string) => {
        if (newId === selectedId) return;
        if (guardRef.current && guardRef.current.isDirty) {
            setPendingId(newId);
            setShowUnsavedModal(true);
        } else {
            setSelectedId(newId);
        }
    };
    const handleConfirmSwitch = async () => {
        if (guardRef.current) {
            const success = await guardRef.current.save();
            if (success) {
                setShowUnsavedModal(false);
                if (pendingId) setSelectedId(pendingId);
                setPendingId(null);
            }
        }
    };
    const handleDiscardSwitch = () => {
        setShowUnsavedModal(false);
        if (pendingId) setSelectedId(pendingId);
        setPendingId(null);
    };
    const handleCancelSwitch = () => {
        setShowUnsavedModal(false);
        setPendingId(null);
    };
    const openCreateModal = (type: 'instrument' | 'track') => setModalConfig({ isOpen: true, mode: 'create', type });
    const openDuplicateModal = (source: AudioItem) => setModalConfig({ isOpen: true, mode: 'duplicate', type: source.category, sourceItem: source });
    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Audio Asset?",
            message: `Are you sure? This cannot be undone.`,
            itemToDelete: id
        });
    };
    const handleModalSubmit = async (val: string) => {
        const cleanId = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        if (items.find(i => i.id === cleanId)) {
            showToast("ID Exists in Project", "error");
            return;
        }
        if (AUDIO_PRESETS[cleanId]) {
            showToast("ID is a reserved System Preset name.", "error");
            return;
        }

        if (modalConfig.mode === 'create') {
            await performCreate(cleanId, modalConfig.type);
        } 
        else if (modalConfig.mode === 'duplicate' && modalConfig.sourceItem) {
            await performDuplicate(cleanId, modalConfig.sourceItem);
        }
    };
    const performCreate = async (id: string, type: 'instrument' | 'track') => {
        const newItem: any = type === 'instrument' 
            ? { 
                id, name: "New Synth", category: 'instrument', type: 'synth', scope: 'local', folder: 'Project Instruments', version: 1,
                config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0.1, sustain: 0.5, release: 0.5 }, volume: -10 } 
              }
            : { 
                id, name: "New Track", category: 'track', scope: 'local', folder: 'Project Tracks', version: 1,
                source: 'note("c3 e3 g3 c4").s("piano").slow(2)'
              };
        
        setItems(prev => [...prev, newItem]);
        const cat = type === 'instrument' ? 'instruments' : 'music';
        
        try {
            await fetch('/api/admin/config', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: cat, itemId: id, data: newItem }) 
            });
            
            guardRef.current = null;
            setSelectedId(id);
            showToast("Created", "success");
        } catch(e) {
            showToast("Failed to create", "error");
        }
    };
    const performDuplicate = async (newId: string, source: AudioItem) => {
         const { _id, ...rest } = source as any;
         
         const newItem = { 
             ...rest, 
             id: newId, 
             name: `${source.name} (Copy)`, 
             version: 1,
             scope: 'local',
             folder: source.category === 'instrument' ? 'Project Instruments' : 'Project Tracks'
         };
         
         setItems(prev => [...prev, newItem]);
         const endpoint = '/api/admin/config';
         const cat = source.category === 'instrument' ? 'instruments' : 'music';

         try {
             await fetch(endpoint, { 
                 method: 'POST', 
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ storyId, category: cat, itemId: newId, data: newItem }) 
             });
             
             guardRef.current = null;
             setSelectedId(newId);
             showToast("Duplicated", "success");
         } catch(e) {
             showToast("Failed to duplicate", "error");
         }
    };
    const performDelete = async () => {
        const id = confirmModal.itemToDelete;
        if (!id) return;
        setConfirmModal({ ...confirmModal, isOpen: false });
        
        const item = items.find(i => i.id === id);
        if (!item) return;

        const endpoint = item.scope === 'global' 
            ? `/api/assets/audio?id=${id}` 
            : `/api/admin/config?storyId=${storyId}&category=${item.category === 'instrument' ? 'instruments' : 'music'}&itemId=${id}`;
        
        try {
            await fetch(endpoint, { method: 'DELETE' });
            setItems(prev => prev.filter(i => i.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted", "info");
        } catch(e) {
            showToast("Delete failed", "error");
        }
    };
    const handleListUpdate = (data: AudioItem) => {
        setItems(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    const selectedItem = items.find(i => i.id === selectedId);
    
    const projectInstruments = items.filter(i => i.category === 'instrument') as InstrumentDefinition[];
    const systemInstruments = Object.values(AUDIO_PRESETS).map(p => ({
        ...p,
        scope: 'system' 
    })) as InstrumentDefinition[];
    
    const allAvailableInstruments = [...projectInstruments, ...systemInstruments];

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Audio"
                items={items}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={() => openCreateModal('instrument')} 
                groupOptions={[{ label: "Folder", key: "folder" }, { label: "Type", key: "category" }]}
                defaultGroupByKey="folder"
            />
            
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--tool-border)', display: 'flex', gap: '10px' }}>
                    <button className="new-btn" onClick={() => openCreateModal('instrument')}>+ New Instrument</button>
                    <button className="new-btn" onClick={() => openCreateModal('track')}>+ New Track</button>
                </div>

                {selectedItem ? (
                    selectedItem.category === 'instrument' ? (
                        <InstrumentMainForm 
                            initialData={selectedItem as InstrumentDefinition}
                            onSave={handleListUpdate as (d: InstrumentDefinition) => void}
                            onDelete={handleDeleteRequest}
                            onDuplicate={openDuplicateModal as (d: InstrumentDefinition) => void}
                            storyId={storyId}
                            guardRef={guardRef}
                        />
                    ) : (
                        <TrackMainForm 
                            initialData={selectedItem as LigatureTrack}
                            onSave={handleListUpdate as (d: LigatureTrack) => void}
                            onDelete={handleDeleteRequest}
                            onDuplicate={openDuplicateModal as (d: LigatureTrack) => void}
                            storyId={storyId}
                            availableInstruments={allAvailableInstruments}
                            guardRef={guardRef}
                        />
                    )
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select an asset</div>
                )}
            </div>
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? `Create ${modalConfig.type}` : "Duplicate"}
                label="ID"
                placeholder="unique_id"
                defaultValue={modalConfig.mode === 'duplicate' ? `${modalConfig.sourceItem?.id}_copy` : ""}
                confirmLabel={modalConfig.mode === 'create' ? "Create" : "Duplicate"}
            />

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
                confirmLabel="Delete"
                onConfirm={performDelete}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            <UnsavedChangesModal 
                isOpen={showUnsavedModal}
                onSaveAndContinue={handleConfirmSwitch}
                onDiscard={handleDiscardSwitch}
                onCancel={handleCancelSwitch}
            />
        </div>
    );
}