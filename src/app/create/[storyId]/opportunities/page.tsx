// src/app/create/[storyId]/opportunities/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { Opportunity, QualityDefinition } from '@/engine/models';
import OpportunityMainForm from './components/OpportunityMainForm';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import { useToast } from '@/providers/ToastProvider';

export default function OpportunitiesAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [opportunities, setOpportunities] = useState<Partial<Opportunity>[]>([]); 
    const [qualities, setQualities] = useState<QualityDefinition[]>([]); 
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // 1. Fetch List + Qualities
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
        }).finally(() => setIsLoadingList(false));
    }, [storyId]);

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

    // 3. Create New
    const handleCreate = async () => {
        const newId = prompt("Enter unique Opportunity ID:");
        if (!newId) return;
        if (opportunities.find(s => s.id === newId)) { alert("Exists"); return; }
        
        const newOpportunity: Opportunity = {
            id: newId,
            name: "New Opportunity",
            text: "A card appears...",
            deck: "village_deck",
            frequency: "Standard",
            options: [],
            tags: [],
            can_discard: true,
            keep_if_invalid: false
        };
        setOpportunities(prev => [...prev, { id: newId, name: newOpportunity.name }]);
        
        try {
            await fetch('/api/admin/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data: newOpportunity })
            });
            setSelectedId(newId);
            setActiveOpportunity(newOpportunity); 
            showToast("Card created.", "success");
        } catch (e) {
            console.error(e);
            showToast("Failed to create card.", "error");
        }
    };

    // 4. Save Handler
    const handleSave = async (data: Opportunity) => {
        try {
            const res = await fetch('/api/admin/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, data })
            });
            if (res.ok) {
                showToast("Saved successfully!", "success");
                setOpportunities(prev => prev.map(s => 
                    s.id === data.id 
                    ? { ...s, name: data.name, deck: data.deck, frequency: data.frequency, folder: data.folder, status: data.status } 
                    : s
                ));            
            } else {
                showToast("Error saving card.", "error");
            }
        } catch (e) { console.error(e); }
    };

    // 5. Delete Handler
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this opportunity?")) return;
        await fetch(`/api/admin/opportunities?storyId=${storyId}&id=${id}`, { method: 'DELETE' });
        setOpportunities(prev => prev.filter(s => s.id !== id));
        setSelectedId(null);
        showToast("Deleted.", "info");
    };

    if (isLoadingList) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Cards"
                items={opportunities as any}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                groupOptions={[{ label: "Folder", key: "folder" }, { label: "Deck", key: "deck" }, { label: "Frequency", key: "frequency" }]}
                defaultGroupByKey="folder"
            />
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div>Loading detail...</div>
                ) : activeOpportunity ? (
                    <OpportunityMainForm 
                        initialData={activeOpportunity} 
                        onSave={handleSave}
                        onDelete={handleDelete}
                        qualityDefs={qualities} // FIX: Pass qualities here
                    />
                ) : (
                    <div style={{ color: '#777', marginTop: '20%', textAlign: 'center' }}>Select a card</div>
                )}
            </div>
        </div>
    );
}