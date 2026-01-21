'use client';
import React, { useState } from 'react';
import { useToast } from '@/providers/ToastProvider';

interface Props {
    storyId: string;
}

export default function RefactorTool({ storyId }: Props) {
    const { showToast } = useToast();
    const [pattern, setPattern] = useState('quality');
    const [scope, setScope] = useState('all');
    const [oldId, setOldId] = useState('');
    const [newId, setNewId] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (uniqueKey: string) => {
        const next = new Set(expandedRows);
        if (next.has(uniqueKey)) next.delete(uniqueKey);
        else next.add(uniqueKey);
        setExpandedRows(next);
    };

    const runAction = async (mode: 'preview' | 'execute') => {
        if (!oldId || !newId) { showToast("Both IDs required", "error"); return; }
        setIsLoading(true);
        if (mode === 'preview') setExpandedRows(new Set());
        
        try {
            const res = await fetch('/api/admin/refactor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storyId, 
                    type: pattern, // 'quality' or 'standard'
                    scope,         // 'all', 'content', or 'settings'
                    oldId, 
                    newId, 
                    mode 
                })
            });
            const data = await res.json();
            
            if (data.success) {
                if (mode === 'preview') {
                    setPreviewData(data);
                    if (data.found === 0) showToast("No matches found.", "info");
                } else {
                    showToast(`Refactor complete. Updated ${data.replaced} occurrences.`, "success");
                    setPreviewData(null);
                    setOldId('');
                    setNewId('');
                }
            } else {
                showToast(data.error || "Operation failed", "error");
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ color: 'var(--tool-text-header)' }}>Global ID Refactor</h3>
            <p style={{ color: 'var(--warning-color)', fontSize: '0.9rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--warning-color)', paddingLeft: '1rem' }}>
                <strong>Warning:</strong> This tool performs a bulk find-and-replace across your database. 
                Always use <strong>Scan</strong> first to verify changes.
            </p>

            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Match Pattern</label>
                    <select className="form-select" value={pattern} onChange={e => setPattern(e.target.value)}>
                        <option value="quality">Smart Variable (Qualities)</option>
                        <option value="standard">Standard ID (Exact Match)</option>
                    </select>
                    <p className="property-hint" style={{ marginTop: '5px' }}>
                        {pattern === 'quality' 
                            ? `Matches: $${oldId || 'id'}, {${oldId || 'id'}}, and logic references.` 
                            : `Matches: Exact word "${oldId || 'id'}". Use for Locations, Images, Decks.`}
                    </p>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Search Scope</label>
                    <select className="form-select" value={scope} onChange={e => setScope(e.target.value)}>
                        <option value="all">Entire World</option>
                        <option value="content">Story Content Only (Storylets/Cards)</option>
                        <option value="settings">Configuration Only (Settings/Defs)</option>
                    </select>
                </div>
            </div>

            <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Find ID</label>
                    <input className="form-input" value={oldId} onChange={e => setOldId(e.target.value)} placeholder="old_id" />
                </div>
                <div style={{ display:'flex', alignItems:'center', paddingTop:'1.5rem' }}>➜</div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Replace With</label>
                    <input className="form-input" value={newId} onChange={e => setNewId(e.target.value)} placeholder="new_id" />
                </div>
            </div>

            <button 
                className="deck-button" 
                onClick={() => runAction('preview')} 
                disabled={isLoading}
                style={{ width: '100%', marginTop: '1rem' }}
            >
                {isLoading ? "Scanning..." : "Scan for Changes"}
            </button>

            {previewData && (
                <div style={{ marginTop: '2rem', background: 'var(--tool-bg-dark)', padding: '1rem', borderRadius: '4px', border: '1px solid var(--tool-border)' }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>Impact Preview</h4>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-highlight)', marginBottom: '1rem' }}>
                        {previewData.found} <span style={{fontSize:'1rem', color:'var(--tool-text-dim)', fontWeight:'normal'}}>matches found</span>
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', background: '#111', border: '1px solid #333', borderRadius: '4px' }}>
                        <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#222', zIndex: 1 }}>
                                <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
                                    <th style={{padding:'8px', width:'30px'}}></th>
                                    <th style={{padding:'8px'}}>Source</th>
                                    <th style={{padding:'8px'}}>Name</th>
                                    <th style={{padding:'8px', textAlign: 'right'}}>Matches</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.affectedFiles.map((file: any, i: number) => {
                                    const uniqueKey = `${file.collection}_${file.id}`;
                                    const isExpanded = expandedRows.has(uniqueKey);

                                    return (
                                        <React.Fragment key={uniqueKey}>
                                            <tr 
                                                style={{ borderBottom: '1px solid #333', cursor: 'pointer', background: isExpanded ? '#2c313a' : 'transparent' }}
                                                onClick={() => toggleRow(uniqueKey)}
                                            >
                                                <td style={{padding:'8px', color:'var(--tool-text-dim)'}}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </td>
                                                <td style={{padding:'8px', color:'var(--tool-text-dim)'}}>{file.collection}</td>
                                                <td style={{padding:'8px', fontWeight: 'bold'}}>{file.name || file.id}</td>
                                                <td style={{padding:'8px', color:'var(--accent-highlight)', textAlign: 'right'}}>{file.matches}</td>
                                            </tr>
                                            
                                            {isExpanded && (
                                                <tr style={{ background: '#1a1d23', borderBottom: '1px solid #333' }}>
                                                    <td colSpan={4} style={{ padding: '10px 20px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {file.details.map((detail: any, idx: number) => (
                                                                <div key={idx} style={{ fontFamily: 'monospace', fontSize: '0.75rem', borderLeft: '2px solid var(--tool-border)', paddingLeft: '10px' }}>
                                                                    <div style={{ color: 'var(--tool-text-dim)', marginBottom: '2px' }}>{detail.path}</div>
                                                                    <div style={{ color: '#ce9178', whiteSpace: 'pre-wrap' }}>
                                                                        {detail.snippet}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button onClick={() => setPreviewData(null)} style={{ background: 'transparent', border: 'none', color: 'var(--tool-text-dim)', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => runAction('execute')} className="save-btn" style={{ background: 'var(--danger-color)', color: '#fff' }}>
                            Confirm & Rename
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}