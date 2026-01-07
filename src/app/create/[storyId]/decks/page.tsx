'use client';

import { useState, useEffect, use } from 'react';
import { DeckDefinition } from '@/engine/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import SmartArea from '@/components/admin/SmartArea';
import BehaviorCard from '@/components/admin/BehaviorCard';
import { useToast } from '@/providers/ToastProvider';

export default function DecksAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [decks, setDecks] = useState<DeckDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { showToast } = useToast();

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
        
        const cleanId = newId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (decks.find(d => d.id === cleanId)) { alert("Exists"); return; }

        const newDeck: DeckDefinition = {
            id: cleanId,
            name: "Opportunities", // Default name
            saved: "True",
            hand_size: "3",
            deck_size: "0" // 0 = Unlimited
        };
        setDecks(prev => [...prev, newDeck]);
        setSelectedId(cleanId);
        showToast("Deck created. Don't forget to save.", "success");
    };

    const handleSaveSuccess = (updated: DeckDefinition) => {
        setDecks(prev => prev.map(d => d.id === updated.id ? updated : d));
        showToast("Deck saved.", "success");
    };

    const handleDeleteSuccess = (id: string) => {
        setDecks(prev => prev.filter(d => d.id !== id));
        setSelectedId(null);
        showToast("Deck deleted.", "info");
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    return (
        <div className="admin-split-view">
            <AdminListSidebar 
                title="Decks" 
                items={decks} 
                selectedId={selectedId} 
                onSelect={setSelectedId} 
                onCreate={handleCreate} 
                renderItem={(d) => (
                    <div style={{display:'flex', flexDirection:'column'}}>
                        <span className="item-title">{d.name || "Opportunities"}</span>
                        <span className="item-subtitle">{d.id}</span>
                    </div>
                )}
            />
            <div className="admin-editor-col">
                {selectedId ? (
                    <DeckEditor 
                        key={selectedId} 
                        initialData={decks.find(d => d.id === selectedId)!} 
                        onSave={handleSaveSuccess}
                        onDelete={handleDeleteSuccess}
                        storyId={storyId}
                    />
                ) : <div style={{ color: 'var(--tool-text-dim)', textAlign: 'center', marginTop: '20%' }}>Select a deck</div>}
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
            if (res.ok) { onSave(form); } 
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

            {/* NEW: Display Name Field */}
            <div className="form-group">
                <label className="form-label">Display Name</label>
                <input 
                    value={form.name || ''} 
                    onChange={e => handleChange('name', e.target.value)} 
                    className="form-input" 
                    placeholder="Opportunities"
                />
                <p className="special-desc">The title shown above the cards in the main story view.</p>
            </div>

            <div className="form-group">
                <label className="form-label">Visual Style</label>
                <select 
                    value={form.card_style || 'default'} 
                    onChange={e => handleChange('card_style', e.target.value)} 
                    className="form-select"
                >
                    <option value="default">Use Global Setting</option>
                    <option value="cards">Standard Cards</option>
                    <option value="rows">List Rows</option>
                    <option value="scrolling">Horizontal Scroll</option>
                </select>
                <p className="special-desc">Overrides the global Opportunity Hand style for this specific deck.</p>
            </div>

            <div className="form-group" style={{ background: 'var(--tool-bg-input)', padding: '1rem', borderRadius: '4px', border: '1px solid #333' }}>
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
                            type="text" 
                            value={form.timer || ''} 
                            onChange={e => handleChange('timer', e.target.value)} 
                            className="form-input" 
                            style={{ width: '200px' }}
                            placeholder="10 or { $speed * 2 }"
                        />
                        <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.9rem' }}>minutes</span>
                    </div>
                )}
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
                        placeholder="0 = Unlimited"
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
                    checked={form.saved !== "False"} 
                    onChange={() => handleChange('saved', form.saved === "False" ? "True" : "False")} 
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