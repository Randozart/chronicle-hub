'use client';

import { useState, useEffect, use, useRef } from 'react';
import { MapRegion, QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import RegionMainForm from './components/RegionMainForm'; // New Import
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function RegionsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    // Data State
    const [regions, setRegions] = useState<MapRegion[]>([]);
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
        sourceItem?: MapRegion;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        itemToDelete?: string;
    }>({ isOpen: false, title: '', message: '' });

    // 1. Fetch Data
    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            fetch(`/api/admin/regions?storyId=${storyId}`, { cache: 'no-store' }),
            fetch(`/api/admin/qualities?storyId=${storyId}`)
        ]).then(async ([regRes, qualRes]) => {
            if (regRes.ok) {
                const data = await regRes.json();
                const list = Array.isArray(data) ? data : Object.values(data);
                setRegions(list as MapRegion[]);
            }
            if (qualRes.ok) {
                const qData = await qualRes.json();
                setQualities(Object.values(qData));
            }
        }).finally(() => setIsLoading(false));
    }, [storyId]);

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
    const openDuplicateModal = (source: MapRegion) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Region?",
            message: `Are you sure you want to delete "${id}"? Locations in this region will lose their assignment.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (regions.find(r => r.id === cleanId)) {
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
        const newReg: MapRegion = { id: newId, name: "New Region", version: 1 };
        
        setRegions(prev => [...prev, newReg]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'regions', itemId: newId, data: newReg })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Region created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: MapRegion) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; 
        
        const newReg: MapRegion = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setRegions(prev => [...prev, newReg]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'regions', itemId: newId, data: newReg })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=regions&itemId=${id}`, { method: 'DELETE' });
            setRegions(prev => prev.filter(r => r.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted successfully.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };

    // List Update
    const handleListUpdate = (data: MapRegion) => {
        setRegions(prev => prev.map(r => r.id === data.id ? data : r));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Map Regions" 
                items={regions} 
                selectedId={selectedId} 
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
                renderItem={(r) => (
                    <div style={{display:'flex', flexDirection:'column'}}>
                        <span className="item-title">{r.name}</span>
                        <span className="item-subtitle">{r.id}</span>
                    </div>
                )}
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && regions.find(r => r.id === selectedId) ? (
                    <RegionMainForm 
                        initialData={regions.find(r => r.id === selectedId)!} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        storyId={storyId}
                        qualityDefs={qualities}
                        guardRef={guardRef}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a region</div>
                )}
            </div>

            {/* Modals */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Region" : "Duplicate Region"}
                description="Unique ID required (e.g. london)."
                label="Region ID"
                placeholder="e.g. wilderness"
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