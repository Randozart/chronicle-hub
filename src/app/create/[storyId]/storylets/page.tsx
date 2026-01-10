// src/app/create/[storyId]/storylets/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { Storylet, QualityDefinition } from '@/engine/models';
import StoryletMainForm from './components/StoryletMainForm';
import AdminListSidebar from './components/AdminListSidebar';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal'; // <--- NEW IMPORT
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';

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

    // --- MODAL STATES ---
    const [inputModal, setInputModal] = useState<{
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
        setIsLoadingDetail(true);
        fetch(`/api/admin/storylets?storyId=${storyId}&id=${selectedId}`)
            .then(res => res.json())
            .then(data => setActiveStorylet(data))
            .catch(e => console.error(e))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedId]);

    // --- ACTIONS ---

    // Open Input Modals
    const openCreateModal = () => setInputModal({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: Storylet) => setInputModal({ isOpen: true, mode: 'duplicate', sourceItem: source });

    // Open Delete Modal
    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Storylet?",
            message: `Are you sure you want to permanently delete "${id}"? This action cannot be undone.`,
            itemToDelete: id
        });
    };

    // Input Modal Submit
    const handleInputSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        if (storylets.find(s => s.id === cleanId)) {
            showToast("ID already exists. Please choose another.", "error");
            return;
        }

        if (inputModal.mode === 'create') {
            await performCreate(cleanId);
        } else if (inputModal.mode === 'duplicate' && inputModal.sourceItem) {
            await performDuplicate(cleanId, inputModal.sourceItem);
        }
    };

    // 3. Perform Create
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
        
        // Optimistic Update
        setStorylets(prev => [...prev, { id: newId, name: newStorylet.name }]);
        
        try {
            await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newStorylet })
            });
            setSelectedId(newId);
            setActiveStorylet(newStorylet);
            showToast("Storylet created!", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to create.", "error");
        }
    };

    // 4. Perform Duplicate
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

    // 5. Perform Delete (Triggered by Confirmation Modal)
    const performDelete = async () => {
        const id = confirmModal.itemToDelete;
        if (!id) return;

        setConfirmModal({ ...confirmModal, isOpen: false }); // Close modal immediately

        try {
            await fetch(`/api/admin/storylets?storyId=${storyId}&id=${id}`, { method: 'DELETE' });
            setStorylets(prev => prev.filter(s => s.id !== id));
            setSelectedId(null);
            showToast("Deleted successfully.", "info");
        } catch (e) {
            console.error(e);
            showToast("Delete failed.", "error");
        }
    };

    // 6. Save Handler (Updates Sidebar List State Only)
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
                onSelect={setSelectedId}
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
                        onDelete={handleDeleteRequest} // Calls Modal logic
                        onDuplicate={openDuplicateModal}
                        qualityDefs={qualities}
                        storyId={storyId}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a storylet</div>
                )}
            </div>

            {/* MODAL: Input (Create / Duplicate) */}
            <InputModal
                isOpen={inputModal.isOpen}
                onClose={() => setInputModal({ ...inputModal, isOpen: false })}
                onSubmit={handleInputSubmit}
                title={inputModal.mode === 'create' ? "Create Storylet" : "Duplicate Storylet"}
                description="Enter a unique ID for this item. IDs should be lowercase and use underscores."
                label="Storylet ID"
                placeholder="e.g. intro_event_01"
                defaultValue={inputModal.mode === 'duplicate' ? `${inputModal.sourceItem?.id}_copy` : ""}
                confirmLabel={inputModal.mode === 'create' ? "Create" : "Duplicate"}
            />

            {/* MODAL: Confirmation (Delete) */}
            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
                confirmLabel="Delete"
                onConfirm={performDelete}
                onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
            />
        </div>
    );
}