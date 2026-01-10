'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Opportunity, QualityDefinition } from '@/engine/models';
import OpportunityMainForm from './components/OpportunityMainForm';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function OpportunitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    
    // Data State
    const [opportunities, setOpportunities] = useState<Partial<Opportunity>[]>([]); 
    const [qualities, setQualities] = useState<QualityDefinition[]>([]); 
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Guard Ref & Navigation State
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: Opportunity;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    // 1. Fetch Data
    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/opportunities?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`)
        ]).then(async ([resOpp, resQual]) => {
            if (resOpp.ok) setOpportunities(await resOpp.json());
            if (resQual.ok) {
                const qData = await resQual.json();
                setQualities(Object.values(qData));
            }
            
            const paramId = searchParams.get('id');
            if (paramId) setSelectedId(paramId);
        }).finally(() => setIsLoadingList(false));
    }, [storyId, searchParams]);

    // 2. Fetch Detail
    useEffect(() => {
        if (!selectedId) {
            setActiveOpportunity(null);
            return;
        }
        setIsLoadingDetail(true);
        fetch(`/api/admin/opportunities?storyId=${storyId}&id=${selectedId}`)
            .then(res => res.json())
            .then(data => setActiveOpportunity(data))
            .catch(e => console.error(e))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedId]);

    // --- NAVIGATION INTERCEPTOR ---
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

    // --- CRUD ACTIONS ---
    const openCreateModal = () => setModalConfig({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: Opportunity) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Card?",
            message: `Are you sure you want to delete "${id}"?`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (opportunities.find(o => o.id === cleanId)) {
            showToast("ID exists.", "error");
            return;
        }

        if (modalConfig.mode === 'create') {
            await performCreate(cleanId);
        } else if (modalConfig.mode === 'duplicate' && modalConfig.sourceItem) {
            await performDuplicate(cleanId, modalConfig.sourceItem);
        }
    };

    const performCreate = async (newId: string) => {
        const newOpp: Opportunity = {
            id: newId,
            name: "New Opportunity",
            text: "A card appears...",
            deck: "village_deck",
            frequency: "Standard",
            options: [],
            tags: [],
            can_discard: true,
            keep_if_invalid: false,
            status: 'draft',
            version: 1
        };
        setOpportunities(prev => [...prev, { id: newId, name: newOpp.name }]);
        
        try {
            await fetch('/api/admin/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newOpp })
            });
            guardRef.current = null;
            setSelectedId(newId);
            setActiveOpportunity(newOpp);
            showToast("Card created.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: Opportunity) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; 
        
        const newOpp: Opportunity = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1,
            status: 'draft'
        };

        try {
            const res = await fetch('/api/admin/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newOpp })
            });

            if (res.ok) {
                setOpportunities(prev => [...prev, { id: newId, name: newOpp.name, folder: newOpp.folder }]);
                guardRef.current = null;
                setSelectedId(newId);
                setActiveOpportunity(newOpp);
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
            await fetch(`/api/admin/opportunities?storyId=${storyId}&id=${id}`, { method: 'DELETE' });
            setOpportunities(prev => prev.filter(s => s.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted.", "info");
        } catch (e) {
            console.error(e);
            showToast("Delete failed.", "error");
        }
    };

    // Lightweight update for the Sidebar list
    const handleListUpdate = (data: Opportunity) => {
        setOpportunities(prev => prev.map(o => 
            o.id === data.id 
            ? { ...o, name: data.name, deck: data.deck, frequency: data.frequency, folder: data.folder, status: data.status } 
            : o
        ));
    };

    if (isLoadingList) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Cards"
                items={opportunities as any}
                selectedId={selectedId}
                onSelect={handleSelectAttempt} // Intercepted
                onCreate={openCreateModal}
                groupOptions={[{ label: "Folder", key: "folder" }, { label: "Deck", key: "deck" }, { label: "Frequency", key: "frequency" }]}
                defaultGroupByKey="folder"
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div className="loading-container">Loading detail...</div>
                ) : activeOpportunity ? (
                    <OpportunityMainForm 
                        initialData={activeOpportunity} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        qualityDefs={qualities}
                        guardRef={guardRef} // Pass Ref
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a card</div>
                )}
            </div>

            {/* Modals */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Card" : "Duplicate Card"}
                description="Enter a unique ID. IDs should be lowercase and use underscores."
                label="Card ID"
                placeholder="e.g. city_event_rare"
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