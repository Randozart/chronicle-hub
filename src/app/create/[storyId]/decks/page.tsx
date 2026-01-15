'use client';

import { useState, useEffect, use, useRef } from 'react';
import { DeckDefinition, QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import DeckMainForm from './components/DeckMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function DecksAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [decks, setDecks] = useState<DeckDefinition[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: DeckDefinition;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            fetch(`/api/admin/decks?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`)
        ]).then(async ([deckRes, qualRes]) => {
            if (deckRes.ok) {
                const data = await deckRes.json();
                const list = Array.isArray(data) ? data : Object.values(data);
                setDecks(list as DeckDefinition[]);
            }
            if (qualRes.ok) {
                const qData = await qualRes.json();
                setQualities(Object.values(qData));
            }
        }).finally(() => setIsLoading(false));
    }, [storyId]);

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

    const openCreateModal = () => setModalConfig({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: DeckDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Deck?",
            message: `Are you sure you want to delete "${id}"? Cards linked to this deck may become inaccessible.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (decks.find(d => d.id === cleanId)) {
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
        const newDeck: DeckDefinition = {
            id: newId,
            name: "New Deck",
            saved: "True",
            hand_size: "3",
            deck_size: "0",
            version: 1
        };
        
        setDecks(prev => [...prev, newDeck]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'decks', itemId: newId, data: newDeck })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Deck created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: DeckDefinition) => {
        const { _id, ...rest } = source as any; 
        
        const newDeck: DeckDefinition = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setDecks(prev => [...prev, newDeck]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'decks', itemId: newId, data: newDeck })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=decks&itemId=${id}`, { method: 'DELETE' });
            setDecks(prev => prev.filter(d => d.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted successfully.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };
    const handleListUpdate = (data: DeckDefinition) => {
        setDecks(prev => prev.map(d => d.id === data.id ? data : d));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Decks"
                items={decks}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
                renderItem={(d) => (
                    <div style={{display:'flex', flexDirection:'column'}}>
                        <span className="item-title">{d.name || "Unnamed Deck"}</span>
                        <span className="item-subtitle">{d.id}</span>
                    </div>
                )}
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && decks.find(d => d.id === selectedId) ? (
                    <DeckMainForm 
                        initialData={decks.find(d => d.id === selectedId)!} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        storyId={storyId}
                        qualityDefs={qualities}
                        guardRef={guardRef}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a deck</div>
                )}
            </div>
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Deck" : "Duplicate Deck"}
                description="Unique ID required (e.g. london_deck)."
                label="Deck ID"
                placeholder="e.g. intro_deck"
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