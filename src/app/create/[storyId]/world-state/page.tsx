'use client';

import { useState, useEffect, use } from 'react';
import { QualityType, QualityState } from '@/engine/models';

export default function WorldStateAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [state, setState] = useState<Record<string, QualityState>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchState = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/world-state?storyId=${storyId}`);
            const data = await res.json();
            setState(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchState(); }, [storyId]);

    const handleUpdate = async (key: string, val: string, type: QualityType) => {
        setIsSaving(true);
        
        // Determine payload
        const payload: QualityState = {
            qualityId: key,
            type: type,
        } as any;

        if (type === QualityType.String) {
            (payload as any).stringValue = val;
        } else {
            (payload as any).level = parseInt(val) || 0;
        }

        await fetch('/api/admin/world-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyId, updates: { [key]: payload } })
        });
        
        setState(prev => ({ ...prev, [key]: payload }));
        setIsSaving(false);
    };

    const handleDelete = async (key: string) => {
        if (!confirm(`Delete global quality "$world.${key}"?`)) return;
        await fetch(`/api/admin/world-state?storyId=${storyId}&key=${key}`, { method: 'DELETE' });
        const next = { ...state };
        delete next[key];
        setState(next);
    };

    const handleAdd = async () => {
        if (!newKey) return;
        const cleanKey = newKey.replace('$', '').trim();
        
        // Infer type
        const isNum = !isNaN(Number(newValue));
        const type = isNum ? QualityType.Counter : QualityType.String;
        
        await handleUpdate(cleanKey, newValue, type);
        setNewKey("");
        setNewValue("");
    };

    if (isLoading) return <div className="loading-container">Loading Control Room...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid #444', marginBottom: '2rem', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#f1c40f' }}>Game Master Console</h2>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                    Manage Global State. Variables here are shared by <strong>all players</strong>.
                    <br/>Access them in logic using <code>$world.variable_name</code> or <code>$variable[scope:world]</code>.
                </p>
            </div>

            {/* STATE LIST */}
            <div style={{ display: 'grid', gap: '1rem' }}>
                {Object.keys(state).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#555', fontStyle: 'italic', border: '2px dashed #333', borderRadius: '8px' }}>
                        No global state active.
                    </div>
                )}

                {Object.entries(state).map(([key, data]) => {
                    const val = data.type === 'S' ? (data as any).stringValue : (data as any).level;
                    
                    return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#181a1f', padding: '1rem', borderRadius: '4px', borderLeft: '3px solid #f1c40f' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: '#f1c40f', fontWeight: 'bold', fontFamily: 'monospace' }}>$world.{key}</div>
                                <div style={{ fontSize: '0.7rem', color: '#666' }}>Type: {data.type}</div>
                            </div>
                            
                            <input 
                                className="form-input" 
                                style={{ width: '200px' }}
                                defaultValue={val}
                                onBlur={(e) => handleUpdate(key, e.target.value, data.type)}
                            />
                            
                            <button onClick={() => handleDelete(key)} style={{ background: 'none', border: 'none', color: '#e06c75', cursor: 'pointer', fontSize: '1.2rem' }}>
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ADD NEW */}
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #444' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#ccc', fontSize: '0.9rem', textTransform: 'uppercase' }}>Add Global Variable</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input 
                        value={newKey} 
                        onChange={e => setNewKey(e.target.value)} 
                        className="form-input" 
                        placeholder="Variable Name (e.g. season)" 
                        style={{ flex: 1 }}
                    />
                    <input 
                        value={newValue} 
                        onChange={e => setNewValue(e.target.value)} 
                        className="form-input" 
                        placeholder="Initial Value" 
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleAdd} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                        Inject
                    </button>
                </div>
            </div>
        </div>
    );
}