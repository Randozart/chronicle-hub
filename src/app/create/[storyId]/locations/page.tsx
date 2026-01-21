'use client';

import { useState, useEffect, use, useRef } from 'react';
import { LocationDefinition, QualityDefinition, Storylet } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import LocationMainForm from './components/LocationMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';
import { useRouter } from 'next/navigation';

export default function LocationsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const router = useRouter(); 
    const { showToast } = useToast();
    const [locations, setLocations] = useState<LocationDefinition[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: LocationDefinition;
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
            fetch(`/api/admin/locations?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`)
        ]).then(async ([locRes, qualRes]) => {
            if (locRes.ok) {
                const data = await locRes.json();
                const list = Array.isArray(data) ? data : Object.values(data);
                setLocations(list as LocationDefinition[]);
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
    const openDuplicateModal = (source: LocationDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Location?",
            message: `Are you sure you want to delete "${id}"?`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (locations.find(l => l.id === cleanId)) {
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
        const newLoc: LocationDefinition = {
            id: newId,
            name: "New Location",
            image: "",
            deck: "default_deck",
            regionId: "default", 
            coordinates: { x: 0, y: 0 },
            version: 1
        };
        
        setLocations(prev => [...prev, newLoc]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'locations', itemId: newId, data: newLoc })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Location created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: LocationDefinition) => {
        const { _id, ...rest } = source as any; 
        
        const newLoc: LocationDefinition = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setLocations(prev => [...prev, newLoc]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'locations', itemId: newId, data: newLoc })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=locations&itemId=${id}`, { method: 'DELETE' });
            setLocations(prev => prev.filter(l => l.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted successfully.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };
    const handleListUpdate = (data: LocationDefinition) => {
        setLocations(prev => prev.map(l => l.id === data.id ? data : l));
    };

    const handleCreateLinkedStorylet = async (locationId: string) => {
        const timestamp = Date.now();
        const newId = `${locationId}_event_${timestamp}`;
        
        const newStorylet: Storylet = {
            id: newId,
            name: "New Event",
            text: "Write your event here...",
            location: locationId, 
            options: [],
            tags: [],
            status: 'draft',
            version: 1
        };

        try {
            const res = await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, data: newStorylet })
            });

            if (res.ok) {
                showToast("Storylet created! Redirecting...", "success");
                router.push(`/create/${storyId}/storylets?id=${newId}`);
            } else {
                showToast("Failed to create storylet.", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("Network error.", "error");
        }
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Locations"
                items={locations}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
                groupOptions={[{ label: "Region", key: "regionId" }]}
                defaultGroupByKey="regionId"
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && locations.find(l => l.id === selectedId) ? (
                    <LocationMainForm 
                        initialData={locations.find(l => l.id === selectedId)!} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        storyId={storyId}
                        qualityDefs={qualities}
                        guardRef={guardRef}
                        onCreateStoryletInLocation={handleCreateLinkedStorylet}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a location</div>
                )}
            </div>
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Location" : "Duplicate Location"}
                description="Unique ID required (e.g. village_square)."
                label="Location ID"
                placeholder="e.g. iron_republic"
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