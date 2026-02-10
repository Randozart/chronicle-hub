'use client';

import { useState, useEffect, use, useRef } from 'react';
import { ImageComposition, GlobalAsset } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InputModal from '@/components/admin/InputModal';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import UnsavedChangesModal from '@/components/admin/UnsavedChangesModal';
import { useToast } from '@/providers/ToastProvider';
import { FormGuard } from '@/hooks/useCreatorForm';
import ComposerEditor from './components/ComposerEditor';
import { getAllThemes } from '@/engine/themeParser';


export default function ComposerPage({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    const [allThemes, setAllThemes] = useState<Record<string, Record<string, string>>>({});

    const [items, setItems] = useState<ImageComposition[]>([]);
    const [assets, setAssets] = useState<GlobalAsset[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const guardRef = useRef<FormGuard | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        mode: 'create' | 'duplicate';
        sourceItem?: ImageComposition;
    }>({ isOpen: false, mode: 'create' });

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id?: string }>({ isOpen: false });

    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/compositions?storyId=${storyId}`),
            fetch(`/api/admin/assets/mine`),
            fetch(`/api/admin/themes`) 
        ]).then(async ([compRes, assetRes, themeRes]) => { 
            if (compRes.ok) setItems(await compRes.json());
            if (assetRes.ok) {
                const data = await assetRes.json();
                setAssets(data.assets || []);
            }
            if (themeRes.ok) {
                const data = await themeRes.json();
                setAllThemes(data.themes || {});
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

    const handleCreate = async (id: string) => {
        const cleanId = id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (items.find(i => i.id === cleanId)) return showToast("ID exists", "error");

        const newItem: ImageComposition = {
            id: cleanId,
            storyId,
            name: "New Composition",
            width: 512,
            height: 512,
            layers: [],
            parameters: {}
        };

        setItems(prev => [...prev, newItem]);
        setSelectedId(cleanId);
        
        await fetch('/api/admin/compositions', {
            method: 'POST',
            body: JSON.stringify({ storyId, data: newItem })
        });
    };

    const handleDelete = async () => {
        if (!confirmModal.id) return;
        await fetch(`/api/admin/compositions?storyId=${storyId}&id=${confirmModal.id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== confirmModal.id));
        if (selectedId === confirmModal.id) setSelectedId(null);
        setConfirmModal({ isOpen: false });
        showToast("Deleted", "info");
    };

    const handleSave = (updated: ImageComposition) => {
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    };

    if (isLoading) return <div className="loading-container">Loading Composer...</div>;

    const activeItem = items.find(i => i.id === selectedId);

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Compositions"
                items={items}
                selectedId={selectedId}
                onSelect={handleSelectAttempt}
                onCreate={() => setModalConfig({ isOpen: true, mode: 'create' })}
            />
            
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '90vh', maxHeight: '90vh', padding: 0 }}>
                {activeItem ? (
                    <ComposerEditor 
                        initialData={activeItem}
                        storyId={storyId}
                        assets={assets}
                        allThemes={allThemes}
                        onSave={handleSave}
                        onDelete={() => setConfirmModal({ isOpen: true, id: activeItem.id })}
                        guardRef={guardRef}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--tool-text-dim)' }}>
                        Select or create a composition
                    </div>
                )}
            </div>

            <InputModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                onSubmit={handleCreate}
                title="New Composition"
                label="ID"
                placeholder="hero_portrait"
                confirmLabel="Create"
            />

            <ConfirmationModal 
                isOpen={confirmModal.isOpen}
                title="Delete Composition?"
                message="This cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onCancel={() => setConfirmModal({ isOpen: false })}
            />

            <UnsavedChangesModal 
                isOpen={showUnsavedModal}
                onSaveAndContinue={async () => {
                    await guardRef.current?.save();
                    setShowUnsavedModal(false);
                    if (pendingId) setSelectedId(pendingId);
                }}
                onDiscard={() => {
                    setShowUnsavedModal(false);
                    if (pendingId) setSelectedId(pendingId);
                }}
                onCancel={() => setShowUnsavedModal(false)}
            />
        </div>
    );
}