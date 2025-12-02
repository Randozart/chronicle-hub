'use client';

import { useState, useEffect, use } from 'react';
import { MarketDefinition, QualityDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import MarketMainForm from './components/MarketMainForm';

export default function MarketsAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [markets, setMarkets] = useState<MarketDefinition[]>([]);
    const [qualities, setQualities] = useState<QualityDefinition[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const [mRes, qRes] = await Promise.all([
                fetch(`/api/admin/markets?storyId=${storyId}`),
                fetch(`/api/admin/qualities?storyId=${storyId}`)
            ]);
            
            if (mRes.ok) setMarkets(await mRes.json());
            if (qRes.ok) {
                const qData = await qRes.json();
                setQualities(Object.values(qData));
            }
            setIsLoading(false);
        };
        load();
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Market ID (e.g. 'grand_bazaar'):");
        if (!newId) return;
        if (markets.find(m => m.id === newId)) return alert("Exists");

        const newMarket: MarketDefinition = {
            id: newId,
            name: "New Market",
            defaultCurrencyId: "gold",
            stalls: []
        };
        setMarkets(prev => [...prev, newMarket]);
        setSelectedId(newId);
    };

    const handleSave = async (updated: MarketDefinition) => {
        try {
            await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, category: 'markets', itemId: updated.id, data: updated })
            });
            setMarkets(prev => prev.map(m => m.id === updated.id ? updated : m));
            alert("Saved!");
        } catch (e) { console.error(e); alert("Error saving"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete Market?")) return;
        await fetch(`/api/admin/config?storyId=${storyId}&category=markets&itemId=${id}`, { method: 'DELETE' });
        setMarkets(prev => prev.filter(m => m.id !== id));
        setSelectedId(null);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Markets"
                items={markets}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
            />
            <div className="admin-editor-col">
                {selectedId ? (
                    <MarketMainForm 
                        initialData={markets.find(m => m.id === selectedId)!} 
                        onSave={handleSave}
                        onDelete={handleDelete}
                        allQualities={qualities}
                        storyId={storyId}
                    />
                ) : <div style={{ color: '#777', marginTop: '20%', textAlign: 'center' }}>Select a market</div>}
            </div>
        </div>
    );
}