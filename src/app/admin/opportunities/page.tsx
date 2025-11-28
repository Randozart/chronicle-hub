'use client';

import { useState, useEffect } from 'react';
import { Opportunity } from '@/engine/models';
import OpportunityMainForm from './components/OpportunityMainForm';
import AdminListSidebar from '../storylets/components/AdminListSidebar';

export default function OpportunitiesAdmin() {
    const [opportunities, setOpportunities] = useState<Partial<Opportunity>[]>([]); 
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(true);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // 1. Fetch List (Summary)
    useEffect(() => {
        fetch('/api/admin/opportunities?storyId=trader_johns_world')
            .then(res => res.json())
            .then(data => setOpportunities(data))
            .finally(() => setIsLoadingList(false));
    }, []);

    // 2. Fetch Detail when selected
    useEffect(() => {
        if (!selectedId) {
            setActiveOpportunity(null);
            return;
        }
        setIsLoadingDetail(true);
        fetch(`/api/admin/opportunities?storyId=trader_johns_world&id=${selectedId}`)
            .then(res => res.json())
            .then(data => setActiveOpportunity(data))
            .catch(e => console.error(e))
            .finally(() => setIsLoadingDetail(false));
    }, [selectedId]);

    // 3. Create New
    const handleCreate = () => {
        const newId = prompt("Enter unique Opportunity ID:");
        if (!newId) return;
        
        if (opportunities.find(s => s.id === newId)) { alert("Exists"); return; }

        const newOpportunity: Opportunity = {
            id: newId,
            name: "New Opportunity",
            text: "A card appears...",
            deck: "village_deck",
            frequency: "Standard",
            options: []
        };

        setOpportunities(prev => [...prev, { id: newId, name: newOpportunity.name }]);
        setSelectedId(newId);
        setActiveOpportunity(newOpportunity); 
    };

    // 4. Save Handler
    const handleSave = async (data: Opportunity) => {
        try {
            const res = await fetch('/api/admin/opportunities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: 'trader_johns_world', data })
            });
            if (res.ok) {
                alert("Saved!");
                setOpportunities(prev => prev.map(s => 
                    s.id === data.id 
                    ? { 
                        ...s, 
                        name: data.name, 
                        deck: data.deck, 
                        frequency: data.frequency,
                        folder: data.folder, 
                        status: data.status 
                      } 
                    : s
                ));            
            } else {
                alert("Error saving.");
            }
        } catch (e) { console.error(e); }
    };

    // 5. Delete Handler
    const handleDelete = async (id: string) => {
        if(!confirm("Delete this opportunity?")) return;
        await fetch(`/api/admin/opportunities?storyId=trader_johns_world&id=${id}`, { method: 'DELETE' });
        setOpportunities(prev => prev.filter(s => s.id !== id));
        setSelectedId(null);
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
                groupOptions={[
                    { label: "Folder", key: "folder" }, 
                    { label: "Deck", key: "deck" },
                    { label: "Frequency", key: "frequency" }
                ]}
                defaultGroupByKey="folder"
            />

            {/* RIGHT: Editor */}
            <div className="admin-editor-col" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isLoadingDetail ? (
                    <div>Loading detail...</div>
                ) : activeOpportunity ? (
                    <OpportunityMainForm 
                        initialData={activeOpportunity} 
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                ) : (
                    <div style={{ color: '#777', marginTop: '20%', textAlign: 'center' }}>Select a card</div>
                )}
            </div>
        </div>
    );
}