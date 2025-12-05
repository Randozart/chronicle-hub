'use client';

import { useState, useEffect, use } from 'react';
import { DeckDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import SmartArea from '@/components/admin/SmartArea'; // <--- NEW
import BehaviorCard from '@/components/admin/BehaviorCard'; // <--- NEW

export default function DecksAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    // ... (Keep existing fetch logic) ...
    const { storyId } = use(params);
    const [decks, setDecks] = useState<DeckDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/admin/decks?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const arr = Object.values(data).map((q: any) => q);
                setDecks(arr);
            })
            .finally(() => setIsLoading(false));
    }, [storyId]);

    const handleCreate = () => {
        const newId = prompt("Enter Deck ID (e.g. 'london_deck'):");
        if (!newId) return;
        if (decks.find(d => d.id === newId)) { alert("Exists"); return; }

        const newDeck: DeckDefinition = {
            id: newId,
            saved: "True",
            hand_size: "3",
            deck_size: "Unlimited"
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
            <AdminListSidebar title="Decks" items={decks} selectedId={selectedId} onSelect={setSelectedId} onCreate={handleCreate} />
            <div className="admin-editor-col">
                {selectedId ? (
                    <DeckEditor 
                        key={selectedId} 
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

    // CTRL+S Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [form]);

    const isSynced = form.timer === 'sync_actions';

    const handleChange = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: storyId, category: 'decks', itemId: form.id, data: form })
            });
            if (res.ok) { onSave(form); /* alert("Saved!"); */ } 
            else { alert("Failed."); }
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
        <div className="space-y-4">
            <div className="form-group">
                <label className="form-label">Deck ID</label>
                <input value={form.id} disabled className="form-input" style={{ opacity: 0.5 }} />
            </div>

            <div className="form-group" style={{ background: '#181a1f', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
                <label className="form-label">Regeneration Timer</label>
                <select 
                    value={isSynced ? 'sync_actions' : 'custom'}
                    onChange={(e) => {
                        if (e.target.value === 'sync_actions') handleChange('timer', 'sync_actions');
                        else handleChange('timer', '10');
                    }}
                    className="form-select"
                    style={{ marginBottom: '0.5rem' }}
                >
                    <option value="sync_actions">Sync with Global Actions</option>
                    <option value="custom">Custom Duration</option>
                </select>

                {!isSynced && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                            type="number" 
                            value={form.timer === 'sync_actions' ? '' : form.timer} 
                            onChange={e => handleChange('timer', e.target.value)} 
                            className="form-input" 
                            style={{ width: '100px' }}
                        />
                        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>minutes</span>
                    </div>
                )}
                <p className="special-desc">How often a card is drawn automatically.</p>
            </div>

            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Hand Size" 
                        value={form.hand_size} 
                        onChange={v => handleChange('hand_size', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="3"
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <SmartArea 
                        label="Deck Size (Cap)" 
                        value={form.deck_size || ''} 
                        onChange={v => handleChange('deck_size', v)} 
                        storyId={storyId} 
                        minHeight="38px" 
                        placeholder="Unlimited"
                    />
                </div>
            </div>
            
            <div className="form-group">
                <SmartArea 
                    label="Draw Cost (Logic)" 
                    value={form.draw_cost || ''} 
                    onChange={v => handleChange('draw_cost', v)} 
                    storyId={storyId} 
                    minHeight="38px" 
                    placeholder="optional (e.g. $gold >= 1)"
                    mode="condition"
                />
            </div>

            <div className="special-field-group" style={{ borderColor: '#c678dd' }}>
                <label className="special-label" style={{ color: '#c678dd' }}>Behavior</label>
                <BehaviorCard 
                    checked={form.saved === "True"} 
                    onChange={() => handleChange('saved', form.saved === "True" ? "False" : "True")} 
                    label="Persistent (Saved)" 
                    desc="Cards stay in hand when leaving the location." 
                />
            </div>

            <div className="admin-form-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={handleDelete} className="unequip-btn" style={{ width: 'auto', padding: '0.5rem 1rem' }}>Delete Deck</button>
                <button onClick={handleSave} disabled={isSaving} className="save-btn">Save Changes</button>
            </div>
        </div>
    );
}