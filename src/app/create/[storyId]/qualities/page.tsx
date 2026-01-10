// src/app/create/[storyId]/qualities/page.tsx
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { QualityDefinition, QualityType, WorldSettings } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import QualityMainForm from './components/QualityMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function QualitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    // Data State
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [settings, setSettings] = useState<WorldSettings | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Guard & Navigation State
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: QualityDefinition;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    // 1. Fetch Data
    useEffect(() => {
        const load = async () => {
            try {
                const [qRes, sRes] = await Promise.all([
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/settings?storyId=${storyId}`)
                ]);
                
                if (qRes.ok) {
                    const data = await qRes.json();
                    const sorted = Object.values(data).sort((a: any, b: any) => (a.ordering || 0) - (b.ordering || 0));
                    setQualities(sorted as QualityDefinition[]);
                }
                if (sRes.ok) setSettings(await sRes.json());
            } catch (e) {
                console.error(e);
                showToast("Failed to load data.", "error");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [storyId, showToast]);

    // --- NAVIGATION GUARD ---
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

    // --- CRUD ACTIONS ---
    const openCreateModal = () => setModalConfig({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: QualityDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Quality?",
            message: `Are you sure you want to delete "${id}"? This cannot be undone.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (qualities.find(q => q.id === cleanId)) {
            showToast("ID already exists.", "error");
            return;
        }

        if (modalConfig.mode === 'create') {
            await performCreate(cleanId);
        } else if (modalConfig.mode === 'duplicate' && modalConfig.sourceItem) {
            await performDuplicate(cleanId, modalConfig.sourceItem);
        }
    };

    const performCreate = async (newId: string) => {
        const newQ: QualityDefinition = { 
            id: newId, name: "New Quality", type: QualityType.Pyramidal, tags: [], folder: "New", version: 1
        };
        
        setQualities(prev => [...prev, newQ]); // Optimistic
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: newId, data: newQ })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Quality created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: QualityDefinition) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; // Strip DB fields
        
        const newQ: QualityDefinition = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setQualities(prev => [...prev, newQ]); // Optimistic
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'qualities', itemId: newId, data: newQ })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Duplicated successfully.", "success");
        } catch(e) {
            showToast("Failed to duplicate.", "error");
        }
    };

    const performDelete = async () => {
        const id = confirmModal.itemToDelete;
        if (!id) return;
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
            await fetch(`/api/admin/config?storyId=${storyId}&category=qualities&itemId=${id}`, { method: 'DELETE' });
            setQualities(prev => prev.filter(q => q.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Quality deleted.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };

    // List Update handler
    const handleListUpdate = (data: QualityDefinition) => {
        setQualities(prev => prev.map(q => q.id === data.id ? data : q));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    const activeQuality = qualities.find(q => q.id === selectedId);

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Qualities" 
                items={qualities.map(q => ({ ...q, name: q.editor_name || q.name || q.id }))}
                selectedId={selectedId} 
                onSelect={handleSelectAttempt} 
                onCreate={openCreateModal}
                groupOptions={[{ label: "Folder", key: "folder" }, { label: "Category", key: "category" }, { label: "Type", key: "type" }]}
                defaultGroupByKey="folder"
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && activeQuality && settings ? (
                    <QualityMainForm 
                        initialData={activeQuality} 
                        settings={settings} 
                        onSave={handleListUpdate} 
                        onDelete={handleDeleteRequest} 
                        onDuplicate={openDuplicateModal}
                        storyId={storyId} 
                        qualityDefs={qualities}
                        guardRef={guardRef}
                    />
                ) : <div style={{color:'#777', textAlign:'center', marginTop:'20%'}}>Select a quality</div>}
            </div>

            {/* Modals */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Quality" : "Duplicate Quality"}
                description="Unique ID required (e.g. strength, gold)."
                label="Quality ID"
                placeholder="e.g. strength"
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
                onCancel={() => { setShowUnsavedModal(false); setPendingId(null); }}
            />
        </div>
    );
}