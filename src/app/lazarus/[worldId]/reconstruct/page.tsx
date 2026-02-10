'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useToast } from '@/providers/ToastProvider';

export default function ReconstructPage({ params }: { params: Promise<{ worldId: string }> }) {
    const { worldId } = use(params);
    const { showToast } = useToast();
    
    const [activeTab, setActiveTab] = useState<'events' | 'qualities' | 'geography' | 'export'>('events');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/lazarus/world/${worldId}/reconstruct`)
            .then(r => r.json())
            .then(fetchedData => setData(fetchedData))
            .finally(() => setLoading(false));
    }, [worldId]);

    const downloadJSON = (filename: string, content: any) => {
        const blob = new Blob([JSON.stringify(content, null, 4)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${filename}`, 'success');
    };

    if (loading) return <div style={{padding:'2rem', color:'#888'}}>Analyzing World Logic...</div>;
    if (!data) return <div>Error loading data.</div>;

    const { events, qualities, geography } = data;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#e5c07b' }}>Reconstruction: {worldId}</h2>
                <Link href={`/lazarus/${worldId}`} style={{ color: '#61afef', fontSize: '0.9rem', textDecoration:'none' }}>&larr; Back</Link>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                {['events', 'qualities', 'geography', 'export'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            background: activeTab === tab ? '#61afef' : 'transparent',
                            color: activeTab === tab ? '#111' : '#888',
                            border: activeTab === tab ? '1px solid #61afef' : '1px solid #444',
                            padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                            textTransform: 'capitalize', fontWeight: 'bold'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ background: '#21252b', borderRadius: '8px', border: '1px solid #333', padding: '1rem', minHeight: '400px' }}>
                {activeTab === 'events' && (
                    <div>
                        <p style={{marginBottom:'1rem', color:'#888'}}>Found {events.length} unique Hub Events.</p>
                        <div style={{maxHeight:'600px', overflowY:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                                <thead>
                                    <tr style={{textAlign:'left', color:'#666'}}><th>ID</th><th>Title</th><th>Branches</th></tr>
                                </thead>
                                <tbody>
                                    {events.map((e: any) => (
                                        <tr key={e.Id} style={{borderTop:'1px solid #333'}}>
                                            <td style={{padding:'8px', color:'#61afef', fontFamily:'monospace'}}>{e.Id}</td>
                                            <td style={{padding:'8px', color:'#ccc'}}>{e.Name}</td>
                                            <td style={{padding:'8px', color:'#aaa'}}>{e.Branches.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'qualities' && (
                    <div>
                        <p style={{marginBottom:'1rem', color:'#888'}}>Found {qualities.length} unique Qualities.</p>
                        <div style={{maxHeight:'600px', overflowY:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                                <thead>
                                    <tr style={{textAlign:'left', color:'#666'}}><th>ID</th><th>Name</th><th>Variations</th></tr>
                                </thead>
                                <tbody>
                                    {qualities.map((q: any) => (
                                        <tr key={q._id} style={{borderTop:'1px solid #333'}}>
                                            <td style={{padding:'8px', color:'#61afef', fontFamily:'monospace'}}>{q._id}</td>
                                            <td style={{padding:'8px', color:'#ccc'}}>{q.name}</td>
                                            <td style={{padding:'8px', color:'#aaa'}}>{q.variations.length} observed states</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'export' && (
                    <div style={{display:'flex', gap:'1rem', flexDirection:'column'}}>
                        <div style={{background:'#111', padding:'1rem', borderRadius:'4px', color:'#999', fontSize:'0.9rem'}}>
                            Exporting will generate JSON files compatible with ChronicleHub imports.
                        </div>
                        <div style={{display:'flex', gap:'1rem'}}>
                            <button onClick={() => downloadJSON(`${worldId}_Events.json`, events)} className="save-btn" style={{padding:'10px'}}>Export Events</button>
                            <button onClick={() => downloadJSON(`${worldId}_Qualities.json`, qualities)} className="save-btn" style={{padding:'10px'}}>Export Qualities</button>
                            <button onClick={() => downloadJSON(`${worldId}_Geography.json`, geography)} className="save-btn" style={{padding:'10px'}}>Export Geography</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}