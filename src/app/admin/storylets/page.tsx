'use client';

import { useState, useEffect } from 'react';
import { Storylet } from '@/engine/models';
import StoryletMainForm from './components/StoryletMainForm'; // We'll create this next
import AdminListSidebar from './components/AdminListSidebar';

export default function StoryletsAdmin() {
    const [storylets, setStorylets] = useState<Partial<Storylet>[]>([]); // List only has partial data
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeStorylet, setActiveStorylet] = useState<Storylet | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // 1. Fetch List (Summary)
    useEffect(() => {
        fetch('/api/admin/storylets?storyId=trader_johns_world')
            .then(res => res.json())
            .then(data => setStorylets(data))
            .finally(() => setIsLoadingList(false));
    }, []);

    // 2. Fetch Detail when selected
    useEffect(() => {
        if (!selectedId) {
            setActiveStorylet(null);
            return;
        }
        setIsLoadingDetail(true);
        fetch(`/api/admin/storylets?storyId=trader_johns_world&id=${selectedId}`)
            .then(res => res.json())
            .then(data => setActiveStorylet(data))
            .catch(e => console.error(e))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedId]);

    // 3. Create New
    const handleCreate = () => {
        const newId = prompt("Enter unique Storylet ID:");
        if (!newId) return;
        
        // Basic validation
        if (storylets.find(s => s.id === newId)) { alert("Exists"); return; }

        const newStorylet: Storylet = {
            id: newId,
            name: "New Storylet",
            text: "Write your story here...",
            options: []
        };

        // Optimistic update
        setStorylets(prev => [...prev, { id: newId, name: newStorylet.name }]);
        setSelectedId(newId);
        setActiveStorylet(newStorylet); // Pre-fill detail view
    };

    // 4. Save Handler
    const handleSave = async (data: Storylet) => {
        try {
            const res = await fetch('/api/admin/storylets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: 'trader_johns_world', data })
            });
            if (res.ok) {
                alert("Saved!");
                // Update list view in case Name changed
                setStorylets(prev => prev.map(s => s.id === data.id ? { ...s, name: data.name } : s));
            } else {
                alert("Error saving.");
            }
        } catch (e) { console.error(e); }
    };

    // 5. Delete Handler
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this storylet?")) return;
        await fetch(`/api/admin/storylets?storyId=trader_johns_world&id=${id}`, { method: 'DELETE' });
        setStorylets(prev => prev.filter(s => s.id !== id));
        setSelectedId(null);
    };

    if (isLoadingList) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Storylets"
                items={storylets as any} // Cast because partial
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[
                    { label: "Location", key: "location" }
                ]}
                defaultGroupByKey="location"
            />

            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div>Loading detail...</div>
                ) : activeStorylet ? (
                    <StoryletMainForm 
                        initialData={activeStorylet} 
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                ) : (
                    <div style={{ color: '#777', marginTop: '20%', textAlign: 'center' }}>Select a storylet</div>
                )}
            </div>
        </div>
    );
}