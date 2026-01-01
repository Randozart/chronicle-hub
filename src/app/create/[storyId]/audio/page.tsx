// src/app/create/[storyId]/audio/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { InstrumentDefinition, LigatureTrack } from '@/engine/audio/models';
import AdminListSidebar from '../storylets/components/AdminListSidebar';
import InstrumentEditor from './components/InstrumentEditor';
import TrackEditor from './components/TrackEditor';
import { AUDIO_PRESETS } from '@/engine/audio/presets';
import { useToast } from '@/providers/ToastProvider';

type AudioItem = (InstrumentDefinition | LigatureTrack) & { 
    category: 'instrument' | 'track';
    scope: 'local' | 'global';
    folder?: string;
};

const EMPTY_TEMPLATE = `[CONFIG]\nBPM: 120\nGrid: 4\nScale: C Minor\n\n[INSTRUMENTS]\n\n[PATTERN: Main]\n\nPiano |................|\n\n[PLAYLIST]\n\nMain\n`;

export default function AudioAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    const [items, setItems] = useState<AudioItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = () => {
        setIsLoading(true);
        fetch(`/api/admin/audio?storyId=${storyId}`)
            .then(res => res.json())
            .then(data => {
                const combined: AudioItem[] = [];
                if (data.instruments) {
                    Object.values(data.instruments).forEach((i: any) => 
                        combined.push({ ...i, category: 'instrument', scope: 'local', folder: 'Project Instruments' })
                    );
                }
                if (data.music) {
                    Object.values(data.music).forEach((t: any) => 
                        combined.push({ ...t, category: 'track', scope: 'local', folder: 'Project Tracks' })
                    );
                }
                if (data.global && Array.isArray(data.global)) {
                    data.global.forEach((g: any) => {
                        combined.push({
                            ...g.data,
                            id: g.id, 
                            category: g.type,
                            scope: 'global',
                            folder: g.folder || (g.type === 'track' ? `Global Tracks` : `Global Instruments`)
                        });
                    });
                }
                setItems(combined);
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [storyId]);

    const handleCreate = (type: 'instrument' | 'track') => {
        const name = prompt(`New ${type} name:`);
        if (!name) return;
        const id = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        if (items.find(i => i.id === id)) return alert("ID exists");
        
        const isGlobal = confirm("Save to Global Account? (Cancel for Local Project)");
        const scope = isGlobal ? 'global' : 'local';
        const folder = isGlobal ? (type === 'track' ? `Tracks/${storyId}` : 'Instruments') : (type === 'track' ? 'Project Tracks' : 'Project Instruments');

        let newItem: AudioItem;
        if (type === 'instrument') {
            newItem = {
                id, name, category: 'instrument', type: 'synth', scope, folder,
                config: { oscillator: { type: 'triangle' }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }, volume: -10 }
            };
        } else {
            newItem = {
                id, name, category: 'track', source: EMPTY_TEMPLATE, scope, folder
            };
        }
        
        setItems(prev => [...prev, newItem]);
        setSelectedId(id);
        handleSave(newItem);
    };

    const handleSave = async (updated: AudioItem) => {
        try {
            if (updated.scope === 'local') {
                const endpointCat = updated.category === 'instrument' ? 'instruments' : 'music';
                await fetch('/api/admin/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ storyId, category: endpointCat, itemId: updated.id, data: updated })
                });
            } else {
                await fetch('/api/assets/audio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        id: updated.id, 
                        type: updated.category, 
                        folder: updated.folder, 
                        data: updated 
                    })
                });
            }
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
            showToast(`${updated.category === 'instrument' ? 'Instrument' : 'Track'} saved!`, 'success');
        } catch(e) {
            console.error(e);
            showToast("Save failed", 'error');
        }
    };

    const handleDelete = async (id: string, category: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        if (!confirm(`Delete ${item.scope} item: ${item.name}?`)) return;

        if (item.scope === 'local') {
            const endpointCat = category === 'instrument' ? 'instruments' : 'music';
            await fetch(`/api/admin/config?storyId=${storyId}&category=${endpointCat}&itemId=${id}`, { method: 'DELETE' });
        } else {
            await fetch(`/api/assets/audio?id=${id}`, { method: 'DELETE' });
        }
        setItems(prev => prev.filter(i => i.id !== id));
        setSelectedId(null);
        showToast("Deleted successfully.", "info");
    };

    const handleUpdateInstrument = (updatedInstrument: InstrumentDefinition) => {
        const existing = items.find(i => i.id === updatedInstrument.id);
        if (!existing) return;
        
        const itemToSave: AudioItem = { 
            ...updatedInstrument, 
            category: 'instrument', 
            scope: existing.scope, 
            folder: existing.folder 
        };
        handleSave(itemToSave);
    };

    const selectedItem = items.find(i => i.id === selectedId);
    
    const allInstrumentsMap = new Map<string, InstrumentDefinition>();
    Object.values(AUDIO_PRESETS).forEach(preset => allInstrumentsMap.set(preset.id, preset));
    items.filter(i => i.category === 'instrument').forEach(inst => allInstrumentsMap.set(inst.id, inst as InstrumentDefinition));
    const allInstruments = Array.from(allInstrumentsMap.values());

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', height: 'calc(100vh - 50px)' }}>
            <div style={{ borderRight: '1px solid #333', height: 'calc(100vh - 50px)', position: 'sticky', top: '50px', width: '300px', display: 'flex', flexDirection: 'column' }}>
                 <div className="list-header" style={{display:'flex', gap:'10px', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom:'1px solid #333', background:'#21252b'}}>
                    <span style={{fontWeight:'bold', color:'#fff'}}>Audio Assets</span>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button className="new-btn" onClick={() => handleCreate('instrument')} style={{fontSize:'0.7rem', padding:'2px 6px'}}>+ Inst</button>
                        <button className="new-btn" onClick={() => handleCreate('track')} style={{fontSize:'0.7rem', padding:'2px 6px'}}>+ Track</button>
                    </div>
                </div>
                
                <div style={{flex:1, overflow:'hidden'}}>
                    <AdminListSidebar 
                        title="" 
                        items={items}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onCreate={() => {}}
                        groupOptions={[
                            { label: "By Folder", key: "folder" },
                            { label: "By Type", key: "category" },
                            { label: "By Scope", key: "scope" }
                        ]}
                        defaultGroupByKey="folder"
                    />
                </div>
            </div>

            <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background:'#141414' }}>
                {selectedItem?.category === 'instrument' && (
                    <div style={{padding:'2rem', overflowY: 'auto', flex: 1}}>
                        <InstrumentEditor 
                            key={selectedItem.id}
                            data={selectedItem as InstrumentDefinition} 
                            onSave={(d) => handleUpdateInstrument(d)} 
                            onDelete={() => handleDelete(selectedItem.id, 'instrument')}
                        />
                        <div style={{marginTop:'1rem', fontSize:'0.8rem', color:'#666'}}>
                            Scope: <span style={{color: selectedItem.scope === 'global' ? '#98c379' : '#61afef'}}>{selectedItem.scope.toUpperCase()}</span> | Folder: {selectedItem.folder}
                        </div>
                    </div>
                )}
                {selectedItem?.category === 'track' && (
                    <TrackEditor 
                        key={selectedItem.id}
                        data={selectedItem as LigatureTrack} 
                        onSave={handleSave} 
                        onDelete={() => handleDelete(selectedItem.id, 'track')}
                        availableInstruments={allInstruments} 
                        onUpdateInstrument={handleUpdateInstrument}
                        enableDownload={true}
                    />
                )}
                {!selectedItem && (
                    <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#444', flexDirection:'column' }}>
                        <h3>Select an asset to edit</h3>
                        <p style={{fontSize:'0.9rem'}}>Manage your project music and global library here.</p>
                    </div>
                )}
            </div>
        </div>
    );
}