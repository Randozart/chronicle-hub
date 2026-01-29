'use client';
import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';
import GameImage from '@/components/GameImage';

interface Variation {
    _id: string;
    contentHash: string;
    title: string;
    rawPayload: any;
    sourceFile: string;
    lastSeen: string;
}

export default function EventInspector({ params }: { params: Promise<{ worldId: string, eventId: string }> }) {
    const { worldId, eventId } = use(params);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'preview' | 'raw' | 'state'>('preview');

    useEffect(() => {
        fetch(`/api/lazarus/world/${worldId}/event/${eventId}`)
            .then(r => r.json())
            .then(data => {
                setVariations(data.variations || []);
            })
            .finally(() => setLoading(false));
    }, [worldId, eventId]);

    const current = variations[selectedIdx];
    const evt = current?.rawPayload?.Event || {};
    
    // Combine Open and Locked branches for full view
    const branches = useMemo(() => [
        ...(current?.rawPayload?.OpenBranches || []).map((b: any) => ({ ...b, _status: 'open' })),
        ...(current?.rawPayload?.LockedBranches || []).map((b: any) => ({ ...b, _status: 'locked' }))
    ].sort((a, b) => (a.Ordering || 0) - (b.Ordering || 0)), [current]);

    // Extract Snapshot + Inferred State
    const playerState = useMemo(() => {
        if (!current?.rawPayload) return [];
        const payload = current.rawPayload;
        
        const qualities: any[] = [];
        const seenIds = new Set<string>();

        const pushQ = (list: any[], type: string) => {
            if (!list) return;
            const arr = Array.isArray(list) ? list : Object.values(list).flat();
            arr.forEach(q => {
                if (q && q.Id) {
                    const idStr = String(q.Id);
                    if (!seenIds.has(idStr)) {
                        qualities.push({ ...q, _source: type });
                        seenIds.add(idStr);
                    }
                }
            });
        };

        // 1. Explicit State
        pushQ(payload.MidPanelQualities, 'Main');
        pushQ(payload.OtherStatuses?.Story, 'Story');
        pushQ(payload.OtherStatuses?.Accomplishment, 'Accomplishment');
        pushQ(payload.InventoryItems, 'Inventory');

        // 2. Inferred State from HTML Requirements
        // Regex looks for "data-edit='123' ... (you have <strong>5</strong>)"
        // or just "(you have 5)"
        branches.forEach((b: any) => {
            const html = (b.BranchRequirementsDescription || "") + (b.BranchUnlockRequirementsDescription || "");
            if (!html) return;

            // Pattern 1: StoryNexus standard tooltip: data-edit="ID" ... (you have X)
            // We match the ID and the value
            const complexRegex = /data-edit=["'](\d+)["'][^>]*>.*?\(you have\s*(?:<strong>)?(.*?)(?:<\/strong>)?\)/g;
            let match;
            while ((match = complexRegex.exec(html)) !== null) {
                const id = match[1];
                const val = match[2].replace(/<\/?[^>]+(>|$)/g, ""); // Clean tags

                if (!seenIds.has(id)) {
                    // We don't have the Name from this regex, but we have the ID and Level
                    qualities.push({ 
                        Id: parseInt(id), 
                        Name: `Unknown Quality (${id})`, // We can resolve this if we look up the ID later
                        Level: val, 
                        _source: 'Inferred (HTML)' 
                    });
                    seenIds.add(id);
                }
            }
        });

        return qualities.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
    }, [current, branches]);

    // Related IDs including those found in HTML
    const relatedIds = useMemo(() => {
        const ids = new Set<number>();
        if (current?.rawPayload?.RootEventId) ids.add(current.rawPayload.RootEventId);
        if (evt.ParentBranch?.Id) ids.add(evt.ParentBranch.Id);

        branches.forEach((b: any) => {
            // Challenges Array
            if (b.Challenges) {
                b.Challenges.forEach((c: any) => {
                    if (c.AssociatedQuality?.Id) ids.add(c.AssociatedQuality.Id);
                });
            }
            // HTML Scrape
            const html = (b.BranchRequirementsDescription || "") + (b.BranchUnlockRequirementsDescription || "");
            const regex = /data-edit=["'](\d+)["']/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                ids.add(parseInt(match[1]));
            }
        });
        return Array.from(ids);
    }, [current, evt, branches]);

    if (loading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Evidence...</div>;
    if (variations.length === 0) return <div style={{ padding: '2rem', color: '#888' }}>Evidence not found.</div>;

    const renderDescription = (html: string) => ({ __html: html || "<em>No description.</em>" });

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '2rem', color: '#ccc' }}>
            
            <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #333', overflowY: 'auto', paddingRight: '1rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <Link href={`/lazarus/${worldId}`} style={{ color: '#61afef', textDecoration: 'none', fontSize: '0.9rem' }}>&larr; Back to List</Link>
                </div>
                
                <h3 style={{ color: '#e5c07b', fontSize: '0.9rem', marginTop: 0, textTransform: 'uppercase' }}>Variations ({variations.length})</h3>
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

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ margin: 0, color: '#fff', fontSize: '1.5rem' }}>
                        {evt.Name || "Untitled Event"} 
                        <span style={{ fontSize: '1rem', color: '#666', marginLeft: '10px' }}>#{eventId}</span>
                    </h1>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setTab('preview')} style={tabBtnStyle(tab === 'preview')}>Visual</button>
                        <button onClick={() => setTab('state')} style={tabBtnStyle(tab === 'state')}>Snapshot</button>
                        <button onClick={() => setTab('raw')} style={tabBtnStyle(tab === 'raw')}>Raw Data</button>
                    </div>
                </div>

                {tab === 'preview' && (
                    <div style={{ background: '#181a1f', border: '1px solid #333', borderRadius: '8px', padding: '2rem' }}>
                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                            {evt.Image && (
                                <div style={{ width: '150px', flexShrink: 0 }}>
                                    <div style={{ border: '4px solid #fff', overflow: 'hidden', borderRadius: '4px' }}>
                                        <img 
                                            src={evt.Image.startsWith('//') ? `https:${evt.Image}` : evt.Image} 
                                            alt={evt.Name}
                                            style={{ width: '100%', display: 'block' }}
                                            onError={(e) => e.currentTarget.style.display = 'none'}
                                        />
                                    </div>
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1rem', lineHeight: '1.6', color: '#ddd' }} dangerouslySetInnerHTML={renderDescription(evt.Description)} />
                            </div>
                        </div>

                        {branches.length > 0 && (
                            <div>
                                <h4 style={{ borderBottom: '1px solid #444', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#e5c07b' }}>Options</h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {branches.map((b: any) => {
                                        const isLocked = b._status === 'locked';
                                        return (
                                            <div key={b.Id} style={{ 
                                                background: isLocked ? '#212121' : '#21252b', 
                                                padding: '1rem', borderRadius: '4px', 
                                                border: isLocked ? '1px dashed #444' : '1px solid #444',
                                                opacity: isLocked ? 0.7 : 1
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <strong style={{ color: isLocked ? '#e06c75' : '#fff' }}>
                                                        {b.Name} {isLocked && "(LOCKED)"}
                                                    </strong>
                                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>#{b.Id}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1rem' }} dangerouslySetInnerHTML={renderDescription(b.Description)} />
                                                
                                                {b.BranchRequirementsDescription && (
                                                    <div 
                                                        style={{ fontSize: '0.8rem', background: '#111', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem', color: '#888' }}
                                                        dangerouslySetInnerHTML={{ __html: b.BranchRequirementsDescription }} 
                                                    />
                                                )}

                                                <div style={{ textAlign: 'right' }}>
                                                    <button 
                                                        disabled={isLocked}
                                                        style={{ 
                                                            background: isLocked ? '#333' : '#444', 
                                                            color: isLocked ? '#555' : '#ccc', 
                                                            border: '1px solid #555', 
                                                            padding: '6px 12px', borderRadius: '4px', 
                                                            cursor: isLocked ? 'not-allowed' : 'default' 
                                                        }}
                                                    >
                                                        {b.ButtonText || "Go"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'state' && (
                    <div style={{ background: '#181a1f', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #333', background: '#21252b' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>Player State at Time of Capture</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#888' }}>
                                Combined explicit state and values inferred from requirements.
                            </p>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ background: '#111', color: '#777', textAlign: 'left' }}>
                                <tr>
                                    <th style={{ padding: '10px' }}>ID</th>
                                    <th style={{ padding: '10px' }}>Name</th>
                                    <th style={{ padding: '10px' }}>Level</th>
                                    <th style={{ padding: '10px' }}>Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playerState.map((q, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #333' }}>
                                        <td style={{ padding: '10px', fontFamily: 'monospace', color: '#61afef' }}>{q.Id}</td>
                                        <td style={{ padding: '10px', color: '#ddd' }}>{q.Name}</td>
                                        <td style={{ padding: '10px', color: '#98c379', fontWeight: 'bold' }}>{q.Level || q.EffectiveLevel || 0}</td>
                                        <td style={{ padding: '10px', color: '#aaa' }}>{q._source}</td>
                                    </tr>
                                ))}
                                {playerState.length === 0 && (
                                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>No state data available in this log.</td></tr>
                                )}
                            </tbody>
                        </table>
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

            {/* RIGHT SIDEBAR */}
            <div style={{ width: '200px', flexShrink: 0, borderLeft: '1px solid #333', paddingLeft: '1rem', overflowY: 'auto' }}>
                <h3 style={{ color: '#e5c07b', fontSize: '0.9rem', marginTop: 0, textTransform: 'uppercase' }}>Linked Data</h3>
                
                {current?.rawPayload?.RootEventId && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>ROOT EVENT</div>
                        <Link href={`/lazarus/${worldId}/${current.rawPayload.RootEventId}`} style={{ color: '#61afef', textDecoration: 'none', fontSize: '0.85rem' }}>
                            Event #{current.rawPayload.RootEventId}
                        </Link>
                    </div>
                )}

                {relatedIds.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '4px' }}>RELATED IDS</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {relatedIds.map(id => (
                                <div key={id} style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                    ID {id}
                                </div>
                            ))}
                        </div>
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