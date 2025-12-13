'use client';

import { useState, useEffect, use } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InstrumentEditor from './components/InstrumentEditor';
import TrackEditor from './components/TrackEditor';

type AudioItem = (InstrumentDefinition | LigatureTrack) & { category: 'instrument' | 'track' };

export default function AudioAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [items, setItems] = useState<AudioItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Fetch Data
    useEffect(() => {
        // We reuse the generic config endpoint because we mapped 'instruments' and 'music' in models
        // But we probably need a dedicated GET route or use the generic one if you updated the GET routes.
        // Let's assume you updated /api/admin/config or similar, 
        // OR we just fetch the world config. 
        // For simplicity, let's assume you created a generic GET or we fetch the big config.
        // Actually, let's create a specific fetcher here for clarity using the generic pattern implies we might need specific routes.
        // Let's assume we added /api/admin/audio which returns { instruments: [], tracks: [] }
        // For now, I'll mock the fetch logic to use the Generic Config loader pattern if it existed, 
        // but since we didn't write specific GET routes for audio yet, let's write a quick one or fetch from world config.
        
        // Let's fetch the full config to be safe/easy, or use the pattern you used for qualities.
        // Ideally: GET /api/admin/audio?storyId=...
        fetch(`/api/admin/audio?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const combined: AudioItem[] = [];
                if (data.instruments) {
                    Object.values(data.instruments).forEach((i: any) => combined.push({ ...i, category: 'instrument' }));
                }
                if (data.music) {
                    Object.values(data.music).forEach((t: any) => combined.push({ ...t, category: 'track' }));
                }
                setItems(combined);
            })
            .finally(() => setIsLoading(false));
    }, [storyId]);

    const handleCreate = (type: 'instrument' | 'track') => {
        const name = prompt(`New ${type} name:`);
        if (!name) return;
        const id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        if (items.find(i => i.id === id)) return alert("ID exists");

        let newItem: AudioItem;

        if (type === 'instrument') {
            newItem = {
                id, name, category: 'instrument', type: 'synth',
                config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }, volume: -10 }
            };
        } else {
            newItem = {
                id, name, category: 'track', source: `[CONFIG]\nBPM: 120\nGrid: 4\nScale: C Minor\n\n[INSTRUMENTS]\n\n[PATTERN: Main]\n\n[PLAYLIST]\n`
            };
        }

        setItems(prev => [...prev, newItem]);
        setSelectedId(id);
    };

    const handleSave = async (updated: AudioItem) => {
        // Strip the transient 'category' field before saving if needed, 
        // or just use it to direct the API call.
        const endpointCat = updated.category === 'instrument' ? 'instruments' : 'music';
        
        await fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                storyId, 
                category: endpointCat, 
                itemId: updated.id, 
                data: updated 
            })
        });
        
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        alert("Saved");
    };

    const handleDelete = async (id: string, category: string) => {
        if (!confirm("Delete?")) return;
        const endpointCat = category === 'instrument' ? 'instruments' : 'music';
        await fetch(`/api/admin/config?storyId=${storyId}&category=${endpointCat}&itemId=${id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedId(null);
    };

    const selectedItem = items.find(i => i.id === selectedId);

    return (
        <div className="admin-split-view">
            <div className="admin-list-col">
                 <div className="list-header" style={{display:'flex', gap:'10px'}}>
                    <span>Audio</span>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button className="new-btn" onClick={() => handleCreate('instrument')}>+ Inst</button>
                        <button className="new-btn" onClick={() => handleCreate('track')}>+ Track</button>
                    </div>
                </div>
                <AdminListSidebar 
                    title="" // Hidden title since we have custom header
                    items={items}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onCreate={() => {}} // Handled above
                    groupOptions={[{ label: "Type", key: "category" }]}
                    defaultGroupByKey="category"
                />
            </div>

            <div className="admin-editor-col">
                {selectedItem?.category === 'instrument' && (
                    <InstrumentEditor 
                        data={selectedItem as InstrumentDefinition} 
                        onSave={handleSave} 
                        onDelete={() => handleDelete(selectedItem.id, 'instrument')} 
                    />
                )}
                {selectedItem?.category === 'track' && (
                    <TrackEditor 
                        data={selectedItem as LigatureTrack} 
                        onSave={handleSave} 
                        onDelete={() => handleDelete(selectedItem.id, 'track')}
                        // Pass all instruments so the editor can preview sound
                        availableInstruments={items.filter(i => i.category === 'instrument') as InstrumentDefinition[]}
                        enableDownload={true}
                    />
                )}
                {!selectedItem && <div style={{padding:'2rem', color:'#666'}}>Select an Audio Asset</div>}
            </div>
        </div>
    );
}