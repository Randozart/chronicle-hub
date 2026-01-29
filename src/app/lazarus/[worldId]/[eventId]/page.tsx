'use client';
import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import GameImage from '@/components/GameImage';

interface Variation {
    _id: string;
    contentHash: string;
    title: string;
    // Normalized description often has [q:player_name], raw has the original text
    rawPayload: {
        Event: {
            Name: string;
            Description: string;
            Image: string;
        };
        OpenBranches: any[];
    };
    sourceFile: string;
    lastSeen: string;
}

export default function EventInspector({ params }: { params: Promise<{ worldId: string, eventId: string }> }) {
    const { worldId, eventId } = use(params);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'preview' | 'raw'>('preview');

    useEffect(() => {
        fetch(`/api/lazarus/world/${worldId}/event/${eventId}`)
            .then(r => r.json())
            .then(data => {
                setVariations(data.variations || []);
            })
            .finally(() => setLoading(false));
    }, [worldId, eventId]);

    if (loading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Evidence...</div>;
    if (variations.length === 0) return <div style={{ padding: '2rem', color: '#888' }}>Evidence not found.</div>;

    const current = variations[selectedIdx];
    const evt = current.rawPayload?.Event || {};
    const branches = current.rawPayload?.OpenBranches || [];

    // Helper to process HTML from StoryNexus (often contains <br> tags)
    const renderDescription = (html: string) => {
        return { __html: html || "<em>No description.</em>" };
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '2rem' }}>
            <div style={{ width: '250px', flexShrink: 0, borderRight: '1px solid #333', overflowY: 'auto', paddingRight: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <Link href={`/lazarus/${worldId}`} style={{ color: '#61afef', textDecoration: 'none', fontSize: '0.9rem' }}>&larr; Back to List</Link>
                </div>
                <h3 style={{ color: '#e5c07b', fontSize: '1rem', marginTop: 0 }}>Variations ({variations.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {variations.map((v, i) => (
                        <div 
                            key={v._id}
                            onClick={() => setSelectedIdx(i)}
                            style={{
                                padding: '10px', borderRadius: '4px', cursor: 'pointer',
                                background: selectedIdx === i ? '#61afef' : '#21252b',
                                color: selectedIdx === i ? '#000' : '#ccc',
                                border: '1px solid #444',
                                fontSize: '0.8rem'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ver {variations.length - i}</div>
                            <div style={{ opacity: 0.8, fontSize: '0.7rem' }}>{new Date(v.lastSeen).toLocaleDateString()}</div>
                            <div style={{ opacity: 0.6, fontSize: '0.7rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.sourceFile}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>
                        {evt.Name || "Untitled Event"} 
                        <span style={{ fontSize: '1rem', color: '#666', marginLeft: '10px' }}>#{eventId}</span>
                    </h1>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setTab('preview')} style={tabBtnStyle(tab === 'preview')}>Visual</button>
                        <button onClick={() => setTab('raw')} style={tabBtnStyle(tab === 'raw')}>Raw Data</button>
                    </div>
                </div>

                {tab === 'preview' && (
                    <div style={{ background: '#181a1f', border: '1px solid #333', borderRadius: '8px', padding: '2rem', maxWidth: '800px' }}>
                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                            {evt.Image && (
                                <div style={{ width: '150px', flexShrink: 0 }}>
                                    <div style={{ border: '4px solid #fff', overflow: 'hidden', borderRadius: '4px' }}>
                                        <img 
                                            src={`https://images.storynexus.failbettergames.com.s3.amazonaws.com/icons/${evt.Image}.png`} 
                                            alt={evt.Name}
                                            style={{ width: '100%', display: 'block' }}
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    </div>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div 
                                    style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }}
                                    dangerouslySetInnerHTML={renderDescription(evt.Description)} 
                                />
                            </div>
                        </div>

                        {branches.length > 0 && (
                            <div>
                                <h4 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#e5c07b' }}>Options</h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {branches.map((b: any) => (
                                        <div key={b.Id} style={{ background: '#21252b', padding: '1rem', borderRadius: '4px', border: '1px solid #444' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <strong style={{ color: '#fff' }}>{b.Name}</strong>
                                                <span style={{ fontSize: '0.8rem', color: '#666' }}>#{b.Id}</span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderDescription(b.Description)} />
                                            
                                            <div style={{ textAlign: 'right' }}>
                                                <button style={{ 
                                                    background: '#444', color: '#ccc', border: '1px solid #555', 
                                                    padding: '6px 12px', borderRadius: '4px', cursor: 'default' 
                                                }}>
                                                    {b.ButtonText || "Go"}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'raw' && (
                    <div style={{ background: '#000', padding: '1rem', borderRadius: '8px', border: '1px solid #333', overflowX: 'auto' }}>
                        <pre style={{ color: '#98c379', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {JSON.stringify(current.rawPayload, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

const tabBtnStyle = (isActive: boolean) => ({
    background: isActive ? '#61afef' : 'transparent',
    color: isActive ? '#111' : '#888',
    border: isActive ? '1px solid #61afef' : '1px solid #444',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
});