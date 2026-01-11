'use client';

import { useState, useEffect, use, useRef } from 'react';
import { CategoryDefinition, WorldSettings } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import CategoryMainForm from './components/CategoryMainForm';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';

export default function CategoriesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    // State
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [settings, setSettings] = useState<WorldSettings | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Guard & Navigation
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // Modals
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: CategoryDefinition;
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
            fetch(`/api/admin/categories?storyId=${storyId}`),
            fetch(`/api/admin/settings?storyId=${storyId}`)
        ]).then(async ([catRes, setRes]) => {
            if (catRes.ok) {
                const data = await catRes.json();
                setCategories(Object.values(data));
            }
            if (setRes.ok) {
                setSettings(await setRes.json());
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

    // --- CRUD ---
    const openCreateModal = () => setModalConfig({ isOpen: true, mode: 'create' });
    const openDuplicateModal = (source: CategoryDefinition) => setModalConfig({ isOpen: true, mode: 'duplicate', sourceItem: source });

    const handleDeleteRequest = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Category?",
            message: `Are you sure you want to delete "${id}"? Items using this category will become Uncategorized.`,
            itemToDelete: id
        });
    };

    const handleModalSubmit = async (inputValue: string) => {
        const cleanId = inputValue.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (categories.find(c => c.id === cleanId)) {
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
        const newCat: CategoryDefinition = {
            id: newId,
            name: newId.charAt(0).toUpperCase() + newId.slice(1),
            color: "#ffffff",
            version: 1
        };
        
        setCategories(prev => [...prev, newCat]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'categories', itemId: newId, data: newCat })
            });
            guardRef.current = null;
            setSelectedId(newId);
            showToast("Category created.", "success");
        } catch(e) {
            showToast("Failed to create.", "error");
        }
    };

    const performDuplicate = async (newId: string, source: CategoryDefinition) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...rest } = source as any; 
        
        const newCat: CategoryDefinition = {
            ...rest,
            id: newId,
            name: `${source.name} (Copy)`,
            version: 1
        };

        setCategories(prev => [...prev, newCat]);
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'categories', itemId: newId, data: newCat })
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
            await fetch(`/api/admin/config?storyId=${storyId}&category=categories&itemId=${id}`, { method: 'DELETE' });
            setCategories(prev => prev.filter(c => c.id !== id));
            if (selectedId === id) setSelectedId(null);
            showToast("Deleted.", "info");
        } catch (e) {
            showToast("Delete failed.", "error");
        }
    };

    // Updates state from Child
    const handleListUpdate = (data: CategoryDefinition) => {
        setCategories(prev => prev.map(c => c.id === data.id ? data : c));
    };

    const handleSettingsUpdate = (newSettings: WorldSettings) => {
        setSettings(newSettings);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Categories"
                items={categories}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={openCreateModal}
                renderItem={(c) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.color || '#fff', border: '1px solid #444' }} />
                        <span>{c.name || c.id}</span>
                    </div>
                )}
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {selectedId && settings && categories.find(c => c.id === selectedId) ? (
                    <CategoryMainForm 
                        initialData={categories.find(c => c.id === selectedId)!} 
                        settings={settings}
                        onSave={handleListUpdate}
                        onDelete={handleDeleteRequest}
                        onDuplicate={openDuplicateModal}
                        onUpdateSettings={handleSettingsUpdate}
                        storyId={storyId}
                        guardRef={guardRef}
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a category</div>
                )}
            </div>

            {/* Modals */}
            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleModalSubmit}
                title={modalConfig.mode === 'create' ? "Create Category" : "Duplicate Category"}
                description="Unique ID required."
                label="Category ID"
                placeholder="e.g. menace"
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