// src/app/create/[storyId]/storylets/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { Storylet, QualityDefinition } from '@/engine/models';
import StoryletMainForm from './components/StoryletMainForm';
import AdminListSidebar from './components/AdminListSidebar';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/providers/ToastProvider'; // NEW

export default function StoryletsAdmin ({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    
    const [storylets, setStorylets] = useState<Partial<Storylet>[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]); // NEW: Store qualities
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeStorylet, setActiveStorylet] = useState<Storylet | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // 1. Fetch List + Qualities (for Linter)
    useEffect(() => {
        Promise.all([
            fetch(`/api/admin/storylets?storyId=${storyId}`),
            fetch(`/api/admin/qualities?storyId=${storyId}`) // FETCH QUALITIES
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

    // 3. Create New
    const handleCreate = async () => {
        const newId = prompt("Enter unique Storylet ID:");
        if (!newId) return;
        if (storylets.find(s => s.id === newId)) { alert("Exists"); return; }
        
        const newStorylet: Storylet = {
            id: newId,
            name: "New Storylet",
            text: "Write your story here...",
            options: [],
            tags: [],
            status: 'draft'
        };
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

    // 4. Save Handler
    const handleSave = async (data: Storylet) => {
        try {
            const res = await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data })
            });
            if (res.ok) {
                showToast("Saved successfully!", "success"); // TOAST
                setStorylets(prev => prev.map(s => 
                    s.id === data.id ? { ...s, name: data.name, location: data.location, folder: data.folder, status: data.status } : s
                ));
            } else {
                showToast("Error saving storylet.", "error");
            }
        } catch (e) { console.error(e); }
    };

    // 5. Delete Handler
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this storylet?")) return;
        await fetch(`/api/admin/storylets?storyId=${storyId}&id=${id}`, { method: 'DELETE' });
        setStorylets(prev => prev.filter(s => s.id !== id));
        setSelectedId(null);
        showToast("Deleted.", "info");
    };

    if (isLoadingList) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Storylets"
                items={storylets as any}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[
                    { label: "Folder", key: "folder" },
                    { label: "Location", key: "location" }
                ]}
                defaultGroupByKey="folder" 
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div>Loading detail...</div>
                ) : activeStorylet ? (
                    <StoryletMainForm 
                        initialData={activeStorylet} 
                        onSave={handleSave}
                        onDelete={handleDelete}
                        qualityDefs={qualities} // PASS QUALITIES
                    />
                ) : (
                    <div style={{ color: 'var(--tool-text-dim)', marginTop: '20%', textAlign: 'center' }}>Select a storylet</div>
                )}
            </div>
        </div>
    );
}