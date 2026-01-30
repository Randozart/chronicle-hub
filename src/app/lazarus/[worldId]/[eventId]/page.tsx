'use client';
import { useState, useEffect, use, useMemo } from 'react';
import Link from 'next/link';

export default function EventInspector({ params }: { params: Promise<{ worldId: string, eventId: string }> }) {
    const { worldId, eventId } = use(params);
    const [variations, setVariations] = useState<any[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'analysis' | 'raw'>('analysis');

    useEffect(() => {
        fetch(`/api/lazarus/world/${worldId}/event/${eventId}`)
            .then(r => r.json())
            .then(data => setVariations(data.variations || []))
            .finally(() => setLoading(false));
    }, [worldId, eventId]);

    const current = variations[selectedIdx];
    const evt = current?.rawPayload?.Event || {};
    
    const branches = useMemo(() => {
        if (current?.enrichedBranches) return current.enrichedBranches;
        return [];
    }, [current]);

    if (loading) return <div style={{padding:'2rem', color:'#888'}}>Loading...</div>;
    if (variations.length === 0) return <div style={{padding:'2rem', color:'#888'}}>No evidence found.</div>;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '2rem', color: '#ccc' }}>
            <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid #333', paddingRight: '1rem' }}>
                <Link href={`/lazarus/${worldId}`} style={{ color: '#61afef', textDecoration: 'none', display:'block', marginBottom:'1rem' }}>&larr; Back</Link>
                <h3 style={{ fontSize: '0.9rem', color: '#e5c07b' }}>Variations</h3>
                {variations.map((v, i) => (
                    <div key={i} onClick={() => setSelectedIdx(i)} 
                        style={{ padding: '8px', cursor: 'pointer', background: selectedIdx === i ? '#61afef' : '#222', color: selectedIdx === i ? '#000' : '#ccc', borderRadius: '4px', marginBottom:'4px', fontSize:'0.8rem' }}>
                        {new Date(v.lastSeen).toLocaleDateString()} {v.isHub && "(HUB)"}
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h1 style={{ color: '#fff', fontSize: '1.5rem', marginBottom:'1rem' }}>{evt.Name} <span style={{color:'#666'}}>#{eventId}</span></h1>
                
                <div style={{ marginBottom: '1rem', display:'flex', gap:'10px' }}>
                    <button onClick={()=>setTab('analysis')} style={{background: tab==='analysis'?'#61afef':'#333', color: tab==='analysis'?'#000':'#ccc', padding:'5px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Analysis</button>
                    <button onClick={()=>setTab('raw')} style={{background: tab==='raw'?'#61afef':'#333', color: tab==='raw'?'#000':'#ccc', padding:'5px 15px', border:'none', borderRadius:'4px', cursor:'pointer'}}>Raw</button>
                </div>

                {tab === 'analysis' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#181a1f', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333', display:'flex', gap:'1.5rem' }}>
                            {evt.Image && <img src={evt.Image.startsWith('//') ? 'https:' + evt.Image : evt.Image} style={{width:'100px', height:'100px', objectFit:'cover', border:'2px solid #fff', borderRadius:'4px'}} />}
                            <div style={{flex:1}} dangerouslySetInnerHTML={{__html: evt.Description || "No description"}} />
                        </div>

                        {branches.map((b: any) => (
                            <div key={b.Id} style={{ background: '#21252b', border: '1px solid #444', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
                                {/* HEADER: Shows Challenges */}
                                <div style={{ padding: '1rem', background: '#2c313a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{b.Name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>ID #{b.Id}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {b.Challenges?.map((c: any, ci: number) => (
                                            <span key={ci} style={{ background: '#e5c07b', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                {c.IsLuck ? '🎲 LUCK' : `💪 ${c.AssociatedQuality?.Name?.toUpperCase()}`}: {c.TargetNumber}%
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ padding: '1rem' }}>
                                    {/* REQUIREMENTS: Visible vs Unlock */}
                                    {b.BranchRequirementsDescription && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase' }}>Visible Requirement</div>
                                            <div dangerouslySetInnerHTML={{ __html: b.BranchRequirementsDescription }} style={{ fontSize: '0.85rem', color: '#ccc' }} />
                                        </div>
                                    )}
                                    {b.BranchUnlockRequirementsDescription && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#e06c75', textTransform: 'uppercase' }}>Unlock Requirement (Hidden Logic)</div>
                                            <div dangerouslySetInnerHTML={{ __html: b.BranchUnlockRequirementsDescription }} style={{ fontSize: '0.85rem', color: '#e06c75', opacity: 0.8 }} />
                                        </div>
                                    )}

                                    <div dangerouslySetInnerHTML={{ __html: b.Description }} style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1.5rem' }} />

                                     {/* OUTCOMES */}
                                    {b.inferredOutcomes?.length > 0 && (
                                        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                            <div style={{ fontSize: '0.7rem', color: '#98c379', marginBottom: '10px' }}>OBSERVED OUTCOMES</div>
                                            {b.inferredOutcomes.map((out: any, k: number) => (
                                                <div key={k} style={{ background: '#111', padding: '12px', borderRadius: '4px', marginBottom: '10px', borderLeft: '4px solid #98c379' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <Link href={`/lazarus/${worldId}/${out.eventId}`} style={{ color: '#61afef', fontWeight: 'bold', textDecoration: 'none', fontSize: '1rem' }}>
                                                            &rarr; {out.title || "Untitled Result"}
                                                        </Link>
                                                        <span style={{ fontSize: '0.6rem', color: '#444' }}>{out.evidenceId}</span>
                                                    </div>

                                                    {/* LITERAL MESSAGES */}
                                                    {out.logic?.messages?.map((msg: string, mi: number) => (
                                                        <div key={mi} style={{ fontSize: '0.8rem', color: '#e5c07b', marginTop: '5px', fontStyle: 'italic' }}>
                                                            • <span dangerouslySetInnerHTML={{ __html: msg }} />
                                                        </div>
                                                    ))}

                                                    {/* NUMERICAL DIFFS */}
                                                    {out.logic?.diffs?.length > 0 && (
                                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #222' }}>
                                                            {out.logic.diffs.map((d: any, di: number) => (
                                                                <div key={di} style={{ fontSize: '0.75rem', display: 'flex', gap: '10px' }}>
                                                                    <span style={{ color: '#777', flex: 1 }}>{d.name} ({d.category})</span>
                                                                    <span style={{ color: d.diff > 0 ? '#98c379' : '#e06c75' }}>
                                                                        {d.before} &rarr; {d.after} ({d.diff > 0 ? `+${d.diff}` : d.diff})
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'raw' && (
                    <pre style={{ background: '#000', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.8rem', color: '#98c379' }}>
                        {JSON.stringify(current.rawPayload, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}