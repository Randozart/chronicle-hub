'use client';

import { useState, useEffect, use } from 'react';
import { DeckDefinition } from '@/engine/models';

export default function DecksAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [decks, setDecks] = useState<DeckDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        // Assumes you created /api/admin/decks/route.ts
        fetch(`/api/admin/decks?storyId=${storyId}`) // Dynamic!
            .then(res => res.json())
            .then(data => {
                const arr = Object.values(data).map((q: any) => q);
                setDecks(arr);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleCreate = () => {
        const newId = prompt("Enter Deck ID (e.g. 'london_deck'):");
        if (!newId) return;
        if (decks.find(d => d.id === newId)) { alert("Exists"); return; }

        const newDeck: DeckDefinition = {
            id: newId,
            saved: "True",
            hand_size: "3",
            deck_size: "Unlimited" // Or number
        };
        setDecks(prev => [...prev, newDeck]);
        setSelectedId(newId);
    };

    const handleSaveSuccess = (updated: DeckDefinition) => {
        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
    };

    const handleDeleteSuccess = (id: string) => {
        setDecks(prev => prev.filter(d => d.id !== id));
        setSelectedId(null);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <div className="admin-list-col">
                <div className="list-header">
                    <span>Decks</span>
                    <button className="new-btn" onClick={handleCreate}>+ New</button>
                </div>
                <div className="list-items">
                    {decks.map(d => (
                        <div key={d.id} onClick={() => setSelectedId(d.id)} className={`list-item ${selectedId === d.id ? 'active' : ''}`}>
                            <span className="item-title">{d.id}</span>
                            <span className="item-subtitle">Size: {d.hand_size} • Saved: {d.saved}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="admin-editor-col">
                {selectedId ? (
                    <DeckEditor 
                        initialData={decks.find(d => d.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : <div style={{ color: '#777', textAlign: 'center', marginTop: '20%' }}>Select a deck</div>}
            </div>
        </div>
    );
}

function DeckEditor({ initialData, onSave, onDelete, storyId }: { initialData: DeckDefinition, onSave: (d: any) => void, onDelete: (id: string) => void, storyId: string }) {
    const [form, setForm] = useState(initialData);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => setForm(initialData), [initialData]);
    const handleChange = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: {storyId}, category: 'decks', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); alert("Saved!"); } else { alert("Failed."); }
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.id}"?`)) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/config?storyId=${storyId}&category=decks&itemId=${form.id}`, { method: 'DELETE' });
            if (res.ok) onDelete(form.id);
        } catch (e) { console.error(e); } finally { setIsSaving(false); }
    };

    return (
        <div>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>Edit Deck: {form.id}</h2>
            
            <div className="form-group">
                <label className="form-label">Hand Size</label>
                <input value={form.hand_size} onChange={e => handleChange('hand_size', e.target.value)} className="form-input" placeholder="3 or $hand_size" />
            </div>

            <div className="form-group">
                <label className="form-label">Persist Cards? (Saved)</label>
                <select value={form.saved} onChange={e => handleChange('saved', e.target.value)} className="form-select">
                    <option value="True">Yes (Cards stay when leaving)</option>
                    <option value="False">No (Cards wiped on exit)</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Timer (Minutes)</label>
                <input value={form.timer || ''} onChange={e => handleChange('timer', e.target.value)} className="form-input" placeholder="e.g. 10 or @regenInterval" />
            </div>

            <div className="form-group">
                <label className="form-label">Max Cards (Deck Size)</label>
                <input value={form.deck_size || ''} onChange={e => handleChange('deck_size', e.target.value)} className="form-input" placeholder="Unlimited or $max_cards" />
            </div>

            <div style={{ marginTop: '2rem', display: 'flow-root' }}>
                <button onClick={handleDelete} disabled={isSaving} className="unequip-btn" style={{ float: 'left' }}>Delete</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}