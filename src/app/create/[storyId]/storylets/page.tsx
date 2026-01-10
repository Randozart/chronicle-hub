// src/app/create/[storyId]/storylets/page.tsx
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Storylet, QualityDefinition } from '@/engine/models';
import StoryletMainForm from './components/StoryletMainForm';
import AdminListSidebar from './components/AdminListSidebar';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal'; // New Modal Component
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function StoryletsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    
    // Data State
    const [storylets, setStorylets] = useState<Partial<Storylet>[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeStorylet, setActiveStorylet] = useState<Storylet | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Guard Ref for Unsaved Changes Logic
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: Storylet;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    // 1. Fetch List + Qualities
    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/storylets?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`)
        ])
        .then(async ([resStorylets, resQualities]) => {
            const sData = await resStorylets.json();
            setStorylets(sData);
            
            if (resQualities.ok) {
                const qData = await resQualities.json();
                setQualities(Object.values(qData));
            }

            const paramId = searchParams.get('id');
            if (paramId) {
                const exists = sData.find((s: any) => s.id === paramId);
                if (exists) setSelectedId(paramId);
            }
        })
        .finally(() => setIsLoadingList(false));
    }, [storyId, searchParams]);

    // 2. Fetch Detail
    useEffect(() => {
        if (!selectedId) {
            setActiveStorylet(null);
            return;
        }
        // If we are loading detail, ensure we aren't blocked by previous guard state
        setIsLoadingDetail(true);
        fetch(`/api/admin/storylets?storyId=${storyId}&id=${selectedId}`)
            .then(res => res.json())
            .then(data => setActiveStorylet(data))
            .catch(e => console.error(e))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedId]);

    // --- NAVIGATION INTERCEPTOR ---
    const handleSelectAttempt = (newId: string) => {
        if (newId === selectedId) return;

        // Check Child Form Status via Ref
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

    // --- CRUD ACTIONS ---

    const openCreateModal = () => setModalConfig({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: Storylet) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Storylet?",
            message: `Are you sure you want to permanently delete "${id}"? This action cannot be undone.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        if (storylets.find(s => s.id === cleanId)) {
            showToast("ID already exists. Please choose another.", "error");
            return;
        }

        if (modalConfig.mode === 'create') {
            await performCreate(cleanId);
        } else if (modalConfig.mode === 'duplicate' && modalConfig.sourceItem) {
            await performDuplicate(cleanId, modalConfig.sourceItem);
        }
    };

    const performCreate = async (newId: string) => {
        const newStorylet: Storylet = {
            id: newId,
            name: "New Storylet",
            text: "Write your story here...",
            options: [],
            tags: [],
            status: 'draft',
            version: 1
        };
        
        setStorylets(prev => [...prev, { id: newId, name: newStorylet.name }]);
        
        try {
            await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newStorylet })
            });
            // Force selection update even if dirty check might trigger (create is clean)
            guardRef.current = null; 
            setSelectedId(newId);
            setActiveStorylet(newStorylet);
            showToast("Storylet created!", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: Storylet) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; 
        
        const newStorylet: Storylet = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1, 
            status: 'draft'
        };

        try {
            const res = await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newStorylet })
            });

            if (res.ok) {
                setStorylets(prev => [...prev, { id: newId, name: newStorylet.name, folder: newStorylet.folder }]);
                guardRef.current = null;
                setSelectedId(newId);
                setActiveStorylet(newStorylet);
                showToast("Duplicated successfully.", "success");
            } else {
                showToast("Failed to duplicate.", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Network error.", "error");
        }
    };

    const performDelete = async () => {
        const id = confirmModal.itemToDelete;
        if (!id) return;

        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
            await fetch(`/api/admin/storylets?storyId=${storyId}&id=${id}`, { method: 'DELETE' });
            setStorylets(prev => prev.filter(s => s.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted successfully.", "info");
        } catch (e) {
            console.error(e);
            showToast("Delete failed.", "error");
        }
    };

    const handleSave = (data: Storylet) => {
        setStorylets(prev => prev.map(s => 
            s.id === data.id 
            ? { ...s, name: data.name, location: data.location, folder: data.folder, status: data.status } 
            : s
        ));
    };

    if (isLoadingList) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Storylets"
                items={storylets as any}
                selectedId={selectedId}
                onSelect={handleSelectAttempt} // Intercept selection
                onCreate={openCreateModal}
                groupOptions={[
                    { label: "Folder", key: "folder" },
                    { label: "Location", key: "location" }
                ]}
                defaultGroupByKey="folder" 
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div className="loading-container">Loading detail...</div>
                ) : activeStorylet ? (
                    <StoryletMainForm 
                        initialData={activeStorylet} 
                        onSave={handleSave}
                        onDelete={handleDeleteRequest} 
                        onDuplicate={openDuplicateModal} 
                        qualityDefs={qualities}
                        storyId={storyId}
                        guardRef={guardRef} // Pass Ref to Child
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a storylet</div>
                )}
            </div>

            {/* Input Modal */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Storylet" : "Duplicate Storylet"}
                description="Enter a unique ID for this item. IDs should be lowercase and use underscores."
                label="Storylet ID"
                placeholder="e.g. intro_event_01"
                defaultValue={modalConfig.mode === 'duplicate' ? `${modalConfig.sourceItem?.id}_copy` : ""}
                confirmLabel={modalConfig.mode === 'create' ? "Create" : "Duplicate"}
            />

            {/* Delete Confirmation */}
            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
                confirmLabel="Delete"
                onConfirm={performDelete}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />

            {/* Unsaved Changes Guard */}
            <UnsavedChangesModal 
                isOpen={showUnsavedModal}
                onSaveAndContinue={handleConfirmSwitch}
                onDiscard={handleDiscardSwitch}
                onCancel={handleCancelSwitch}
            />
        </div>
    );
}