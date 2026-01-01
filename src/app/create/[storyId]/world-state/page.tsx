// src/app/create/[storyId]/world-state/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { QualityType, QualityState, WorldSettings } from '@/engine/models';
import SmartArea from '@/components/admin/SmartArea';
import { useToast } from '@/providers/ToastProvider';

export default function WorldStateAdmin({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const { showToast } = useToast();
    
    const [state, setState] = useState<Record<string, QualityState>>({});
    const [settings, setSettings] = useState<WorldSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Quality State
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [stateRes, settingsRes] = await Promise.all([
                fetch(`/api/admin/world-state?storyId=${storyId}`),
                fetch(`/api/admin/settings?storyId=${storyId}`)
            ]);
            
            if (stateRes.ok) setState(await stateRes.json());
            if (settingsRes.ok) setSettings(await settingsRes.json());
            
        } catch (e) {
            console.error(e);
            showToast("Failed to load GM console.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [storyId]);

    // GLOBAL SAVE TRIGGER (Just refreshes data to be safe, or saves pending edits if we had them)
    useEffect(() => {
        const handleGlobalSave = () => {
             // In this view, edits are usually immediate via button clicks, 
             // but we can trigger a toast to confirm "System Ready".
             showToast("Console state synced.");
        };
        window.addEventListener('global-save-trigger', handleGlobalSave);
        return () => window.removeEventListener('global-save-trigger', handleGlobalSave);
    }, []);

    const handleUpdateQuality = async (key: string, val: string, type: QualityType) => {
        setIsSaving(true);
        const payload: QualityState = { qualityId: key, type: type } as any;
        if (type === QualityType.String) (payload as any).stringValue = val;
        else (payload as any).level = parseInt(val) || 0;

        try {
            await fetch('/api/admin/world-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, updates: { [key]: payload } })
            });
            setState(prev => ({ ...prev, [key]: payload }));
            showToast(`Updated $world.${key}`, "success");
        } catch(e) {
            showToast("Update failed", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteQuality = async (key: string) => {
        if (!confirm(`Delete global quality "$world.${key}"?`)) return;
        await fetch(`/api/admin/world-state?storyId=${storyId}&key=${key}`, { method: 'DELETE' });
        const next = { ...state };
        delete next[key];
        setState(next);
        showToast("Global variable deleted.", "info");
    };

    const handleAddQuality = async () => {
        if (!newKey) return;
        const cleanKey = newKey.replace('$', '').trim();
        const isNum = !isNaN(Number(newValue));
        const type = isNum ? QualityType.Counter : QualityType.String;
        await handleUpdateQuality(cleanKey, newValue, type);
        setNewKey("");
        setNewValue("");
    };

    // --- SYSTEM MESSAGE HANDLER ---
    const handleUpdateMessage = async (newMsg: any) => {
        if (!settings) return;
        const updatedSettings = { ...settings, systemMessage: { ...settings.systemMessage, ...newMsg } };
        setSettings(updatedSettings); // Optimistic update
        
        // Debounce actual save in UI logic usually, but here immediate is fine for toggle
        await fetch('/api/admin/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storyId, category: 'settings', itemId: 'settings', data: updatedSettings })
        });
    };

    if (isLoading) return <div className="loading-container">Loading Control Room...</div>;

    return (
        <div className="admin-editor-col" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ borderBottom: '1px solid #444', marginBottom: '2rem', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#f1c40f' }}>Game Master Console</h2>
                <p style={{ color: '#888', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                    Live tools for managing the running game world.
                </p>
            </div>

            {/* 1. SYSTEM ANNOUNCEMENTS */}
            <div className="special-field-group" style={{ borderColor: '#ff467d', marginBottom: '3rem' }}>
                <label className="special-label" style={{ color: '#ff467d' }}>Live Announcement</label>
                <p className="special-desc">Broadcast a message to all players. Changing the ID will force it to re-appear for everyone.</p>
                
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <label className="toggle-label">
                        <input 
                            type="checkbox" 
                            checked={settings?.systemMessage?.enabled || false} 
                            onChange={e => handleUpdateMessage({ enabled: e.target.checked })} 
                        />
                        Active
                    </label>
                    <select 
                        value={settings?.systemMessage?.severity || 'info'} 
                        onChange={e => handleUpdateMessage({ severity: e.target.value })}
                        className="form-select" style={{ width: 'auto' }}
                    >
                        <option value="info">Info (Blue)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="critical">Critical (Red)</option>
                    </select>
                    <input 
                        value={settings?.systemMessage?.id || ''} 
                        onChange={e => handleUpdateMessage({ id: e.target.value })} 
                        className="form-input" placeholder="Message ID (e.g. patch-1.5)" style={{ flex: 1 }}
                    />
                </div>
                
                <div className="form-group">
                    <input 
                        value={settings?.systemMessage?.title || ''} 
                        onChange={e => handleUpdateMessage({ title: e.target.value })} 
                        className="form-input" placeholder="Title Header" 
                    />
                </div>
                <div className="form-group">
                    <SmartArea 
                        label="Message Content" 
                        value={settings?.systemMessage?.content || ''} 
                        onChange={v => handleUpdateMessage({ content: v })} 
                        storyId={storyId} 
                        minHeight="80px"
                    />
                </div>
            </div>

            {/* 2. GLOBAL VARIABLES */}
            <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#ccc', fontSize: '0.9rem', textTransform: 'uppercase', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Global State ($world)</h4>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.keys(state).length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#555', fontStyle: 'italic', border: '2px dashed #333', borderRadius: '8px' }}>
                            No global variables active.
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
                                    onBlur={(e) => handleUpdateQuality(key, e.target.value, data.type)}
                                />
                                
                                <button onClick={() => handleDeleteQuality(key)} style={{ background: 'none', border: 'none', color: '#e06c75', cursor: 'pointer', fontSize: '1.2rem' }}>
                                    ✕
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #444' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input value={newKey} onChange={e => setNewKey(e.target.value)} className="form-input" placeholder="$variable_name" style={{ flex: 1 }} />
                        <input value={newValue} onChange={e => setNewValue(e.target.value)} className="form-input" placeholder="Initial Value" style={{ flex: 1 }} />
                        <button onClick={handleAddQuality} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>Inject</button>
                    </div>
                </div>
            </div>
        </div>
    );
}