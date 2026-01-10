// src/app/create/[storyId]/markets/page.tsx
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { MarketDefinition, QualityDefinition, QualityType } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import MarketMainForm from './components/MarketMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function MarketsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    // Data State
    const [markets, setMarkets] = useState<MarketDefinition[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
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
        sourceItem?: MarketDefinition;
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
                const [mRes, qRes] = await Promise.all([
                    fetch(`/api/admin/markets?storyId=${storyId}`),
                    fetch(`/api/admin/qualities?storyId=${storyId}`)
                ]);
                
                if (mRes.ok) {
                    const data = await mRes.json();
                    setMarkets(Array.isArray(data) ? data : Object.values(data));
                }
                if (qRes.ok) {
                    const qData = await qRes.json();
                    setQualities(Object.values(qData));
                }
            } catch (e) {
                console.error(e);
                showToast("Failed to load.", "error");
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
    const openDuplicateModal = (source: MarketDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Market?",
            message: `Are you sure you want to delete "${id}"? This action cannot be undone.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (markets.find(m => m.id === cleanId)) {
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
        const newMarket: MarketDefinition = {
            id: newId,
            name: "New Market",
            defaultCurrencyId: "gold",
            stalls: [],
            version: 1
        };
        
        setMarkets(prev => [...prev, newMarket]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'markets', itemId: newId, data: newMarket })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Market created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: MarketDefinition) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; 
        
        const newMarket: MarketDefinition = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setMarkets(prev => [...prev, newMarket]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'markets', itemId: newId, data: newMarket })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=markets&itemId=${id}`, { method: 'DELETE' });
            setMarkets(prev => prev.filter(m => m.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Market deleted.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };

    // List Update
    const handleListUpdate = (data: MarketDefinition) => {
        setMarkets(prev => prev.map(m => m.id === data.id ? data : m));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Markets"
                items={markets}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && markets.find(m => m.id === selectedId) ? (
                    <MarketMainForm 
                        initialData={markets.find(m => m.id === selectedId)!} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        allQualities={qualities} 
                        storyId={storyId}
                        guardRef={guardRef}
                    />
                ) : <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a market</div>}
            </div>

            {/* Modals */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Market" : "Duplicate Market"}
                description="Unique ID required (e.g. grand_bazaar)."
                label="Market ID"
                placeholder="e.g. black_market"
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