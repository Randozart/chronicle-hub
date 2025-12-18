'use client';

import { useState, useEffect, use } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InstrumentEditor from './components/InstrumentEditor';
import TrackEditor from './components/TrackEditor';
import InstrumentLibrary from './components/InstrumentLibrary';
import { AUDIO_PRESETS } from '@/engine/audio/presets'; // NEW: Import global presets

type AudioItem = (InstrumentDefinition | LigatureTrack) & { category: 'instrument' | 'track' };

const EMPTY_TEMPLATE = `[CONFIG]\nBPM: 120\nGrid: 4\nScale: C Minor\n\n[INSTRUMENTS]\n\n[PATTERN: Main]\n\n[PLAYLIST]\n`;

export default function AudioAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [items, setItems] = useState<AudioItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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
                id, name, category: 'track', source: EMPTY_TEMPLATE
            };
        }
        setItems(prev => [...prev, newItem]);
        setSelectedId(id);
    };

    const handleSave = async (updated: AudioItem) => {
        const endpointCat = updated.category === 'instrument' ? 'instruments' : 'music';
        await fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyId, category: endpointCat, itemId: updated.id, data: updated })
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

    const handleUpdateInstrument = (updatedInstrument: InstrumentDefinition) => {
        const itemToSave: AudioItem = { ...updatedInstrument, category: 'instrument' };
        handleSave(itemToSave);
    };

    const selectedItem = items.find(i => i.id === selectedId);
    
    // UPDATED: Create a comprehensive, de-duplicated list of all instruments
    const allInstrumentsMap = new Map<string, InstrumentDefinition>();
    // First, add all global presets
    Object.values(AUDIO_PRESETS).forEach(preset => allInstrumentsMap.set(preset.id, preset));
    // Then, add/overwrite with instruments from the current world's database
    items.filter(i => i.category === 'instrument').forEach(inst => allInstrumentsMap.set(inst.id, inst as InstrumentDefinition));
    const allInstruments = Array.from(allInstrumentsMap.values());

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedItem?.category === 'track' ? 'auto 1fr 250px' : 'auto 1fr', height: 'calc(100vh - 50px)' }}>
            <div style={{ borderRight: '1px solid #333', height: 'calc(100vh - 50px)', position: 'sticky', top: '50px' }}>
                 <div className="list-header" style={{display:'flex', gap:'10px', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span>Audio Assets</span>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button className="new-btn" onClick={() => handleCreate('instrument')}>+ Inst</button>
                        <button className="new-btn" onClick={() => handleCreate('track')}>+ Track</button>
                    </div>
                </div>
                <AdminListSidebar 
                    title="Audio"
                    items={items}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onCreate={() => {}}
                    groupOptions={[{ label: "Type", key: "category" }]}
                    defaultGroupByKey="category"
                />
            </div>

            <div style={{ overflowY: 'auto', padding: '1rem' }}>
                {selectedItem?.category === 'instrument' && (
                    <InstrumentEditor 
                        key={selectedItem.id}
                        data={selectedItem as InstrumentDefinition} 
                        onSave={(d) => handleSave({ ...d, category: 'instrument' })} 
                        onDelete={() => handleDelete(selectedItem.id, 'instrument')}
                    />
                )}
                {selectedItem?.category === 'track' && (
                    <TrackEditor 
                        key={selectedItem.id}
                        data={selectedItem as LigatureTrack} 
                        onSave={handleSave} 
                        onDelete={() => handleDelete(selectedItem.id, 'track')}
                        availableInstruments={allInstruments} // Pass the combined list
                        onUpdateInstrument={handleUpdateInstrument}
                        enableDownload={true}
                    />
                )}
                {!selectedItem && <div style={{padding:'2rem', color:'#666'}}>Select an Audio Asset to begin.</div>}
            </div>

            {selectedItem?.category === 'track' && (
                <div style={{ width: '250px', borderLeft: '1px solid #333' }}>
                    <InstrumentLibrary 
                        instruments={allInstruments} // Pass the combined list
                        onSelect={(instrumentId) => setSelectedId(instrumentId)}
                    />
                </div>
            )}
        </div>
    );
}