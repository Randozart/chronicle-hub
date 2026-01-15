'use client';

import { useState, useEffect, use, useRef } from 'react';
import { ImageDefinition, QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import GameImage from '@/components/GameImage';
import ImageMainForm from './components/ImageMainForm'; 
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function ImagesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [images, setImages] = useState<ImageDefinition[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 20 * 1024 * 1024 });
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: ImageDefinition;
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
            fetch(`/api/admin/images?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`),
            fetch('/api/admin/usage')
        ]).then(async ([imgRes, qualRes, usageRes]) => {
            if (imgRes.ok) {
                const data = await imgRes.json();
                const list = Array.isArray(data) ? data : Object.keys(data).map(key => ({ ...data[key], id: key }));
                setImages(list as ImageDefinition[]);
            }
            if (qualRes.ok) {
                const qData = await qualRes.json();
                setQualities(Object.values(qData));
            }
            if (usageRes.ok) {
                const uData = await usageRes.json();
                setStorageUsage({ used: uData.usage || 0, limit: uData.limit || (20 * 1024 * 1024) });
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
    const openDuplicateModal = (source: ImageDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Asset?",
            message: `Are you sure you want to delete "${id}"? This only removes the definition, not the file itself.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (images.find(img => img.id === cleanId)) {
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
        const newImg: ImageDefinition = {
            id: newId,
            url: "/images/placeholder.png",
            alt: "New Asset",
            category: 'uncategorized',
            version: 1
        };
        
        setImages(prev => [...prev, newImg]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'images', itemId: newId, data: newImg })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Asset definition created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: ImageDefinition) => {
        const { _id, ...rest } = source as any; 
        
        const newImg: ImageDefinition = {
            ...rest,
            id: newId,
            alt: `${source.alt} (Copy)`,
            version: 1
        };

        setImages(prev => [...prev, newImg]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'images', itemId: newId, data: newImg })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=images&itemId=${id}`, { method: 'DELETE' });
            setImages(prev => prev.filter(i => i.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted definition.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };

    const handleListUpdate = (data: ImageDefinition) => {
        setImages(prev => prev.map(i => i.id === data.id ? data : i));
    };

    const handleStorageUpdate = (newUsage: number) => {
        setStorageUsage(prev => ({ ...prev, used: newUsage }));
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    const usedMB = (storageUsage.used / (1024 * 1024)).toFixed(2);
    const limitMB = (storageUsage.limit / (1024 * 1024)).toFixed(0);
    const percent = Math.min(100, (storageUsage.used / storageUsage.limit) * 100);
    const isCritical = percent > 90;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Assets" 
                items={images} 
                selectedId={selectedId} 
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
                groupOptions={[{ label: "Category", key: "category" }]}
                defaultGroupByKey="category"
                renderItem={(img) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '24px', height: '24px', flexShrink: 0, overflow: 'hidden', borderRadius: '3px' }}>
                            <GameImage 
                                code={img.id} 
                                imageLibrary={{ [img.id]: img }} 
                                alt="" 
                                type="icon"
                                className="option-image" 
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="item-title" style={{ fontSize: '0.85rem' }}>{img.id}</span>
                            {img.size && <span style={{ fontSize: '0.65rem', color: '#666' }}>{(img.size / 1024).toFixed(0)} KB</span>}
                        </div>
                    </div>
                )}
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--tool-bg-header)', borderBottom: '1px solid var(--tool-border)', display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>Storage:</span>
                    <div style={{ flex: 1, height: '8px', background: 'var(--tool-bg-dark)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: isCritical ? 'var(--danger-color)' : 'var(--success-color)',
                            transition: 'width 0.3s ease' 
                        }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: isCritical ? 'var(--danger-color)' : 'var(--tool-text-main)' }}>
                        {usedMB} / {limitMB} MB
                    </span>
                </div>

                {selectedId && images.find(i => i.id === selectedId) ? (
                    <ImageMainForm 
                        initialData={images.find(i => i.id === selectedId)!} 
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        storyId={storyId}
                        qualityDefs={qualities}
                        guardRef={guardRef}
                        onStorageUpdate={handleStorageUpdate}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select an asset</div>
                )}
            </div>
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Asset Definition" : "Duplicate Asset"}
                description="Enter a unique ID (e.g. hero_portrait)."
                label="Asset ID"
                placeholder="e.g. map_01"
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