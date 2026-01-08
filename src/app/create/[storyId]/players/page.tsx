'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { 
    QualityDefinition,
    CharacterDocument, 
    PendingEvent,
    WorldSettings,
    QualityType
} from '@/engine/models';

// Lightweight type for the list view
interface PlayerSummary {
    userId: string;
    characterId: string;
    username: string; 
    characterName: string; 
    location: string;
    lastActive?: string;
    actions?: number;
    qualities?: Record<string, any>; 
}

export default function PlayerMonitor({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [players, setPlayers] = useState<PlayerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // For the Inspector
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [worldQualities, setWorldQualities] = useState<Record<string, QualityDefinition>>({});
    const [settings, setSettings] = useState<WorldSettings | null>(null);

    // 1. Fetch World Definitions & Settings
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const [qRes, sRes] = await Promise.all([
                    fetch(`/api/admin/qualities?storyId=${storyId}`),
                    fetch(`/api/admin/settings?storyId=${storyId}`)
                ]);
                
                if (qRes.ok) {
                    const data = await qRes.json();
                    const defs: Record<string, QualityDefinition> = {};
                    if (Array.isArray(data)) data.forEach((q: any) => defs[q.id] = q);
                    else Object.assign(defs, data);
                    setWorldQualities(defs);
                }

                if (sRes.ok) {
                    const sData = await sRes.json();
                    setSettings(sData);
                }
            } catch (e) {
                console.error("Failed to load config", e);
            }
        };
        loadConfig();
    }, [storyId]);

    // 2. Poll Player List
    useEffect(() => {
        const fetchPlayers = () => {
            fetch(`/api/admin/players?storyId=${storyId}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setPlayers(data.map((p: any) => {
                            // Helper: Aggressive ID finding
                            const getSafeId = (obj: any): string => {
                                if (obj.characterId) return String(obj.characterId);
                                if (obj._id) {
                                    if (typeof obj._id === 'object' && obj._id.$oid) return obj._id.$oid;
                                    return String(obj._id);
                                }
                                if (obj.id) return String(obj.id);
                                return ""; 
                            };

                            const safeId = getSafeId(p);

                            // Helper: Name Resolution
                            let resolvedName = p.name;
                            
                            if ((!resolvedName || resolvedName === 'Unknown') && settings?.playerName && p.qualities) {
                                const rawId = settings.playerName;
                                const cleanId = rawId.replace('$', '');
                                const qState = p.qualities[cleanId] || p.qualities[rawId];
                                
                                if (qState) {
                                    if ((qState.type as string) === 'S' || qState.type === QualityType.String) {
                                        resolvedName = qState.stringValue;
                                    } else if ('level' in qState) {
                                        resolvedName = qState.level.toString();
                                    }
                                }
                            }

                            return {
                                userId: p.userId,
                                characterId: safeId, 
                                username: p.username || "Anonymous",
                                characterName: resolvedName || "Unknown",
                                location: p.location,
                                lastActive: p.lastActive,
                                actions: p.actions,
                                qualities: p.qualities
                            };
                        }));
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        };

        if (settings) {
            fetchPlayers();
            const interval = setInterval(fetchPlayers, 15000); 
            return () => clearInterval(interval);
        }
    }, [storyId, settings]);

    const formatTimeAgo = (dateString?: string) => {
        if (!dateString) return "Never";
        const date = new Date(dateString);
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="admin-editor-col" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Player Monitor</h2>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--tool-text-dim)', fontSize: '0.9rem' }}>
                        Real-time view of active characters.
                    </p>
                </div>
                <span style={{ 
                    background: 'var(--tool-bg-header)', 
                    padding: '5px 10px', 
                    borderRadius: '4px', 
                    border: '1px solid #444',
                    color: 'var(--tool-text-highlight)' 
                }}>
                    {players.length} Active Characters
                </span>
            </div>

            {isLoading ? (
                <div className="loading-container">Scanning world...</div>
            ) : players.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--tool-text-dim)', padding: '4rem', background: 'var(--tool-bg-dark)', borderRadius: '8px' }}>
                    <p>No souls have entered this world yet.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--tool-bg-input)', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'var(--tool-bg-header)', textAlign: 'left', borderBottom: '1px solid #333' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Character Name</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>User Account</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Location</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.8rem', textTransform: 'uppercase' }}>Last Active</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map((p, index) => (
                                <tr key={p.characterId || `p-${index}`} style={{ borderBottom: '1px solid #2c313a', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--tool-text-header)', fontSize: '1rem' }}>{p.characterName}</div>
                                        {/* HIDE ID FROM LIST HERE */}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--tool-text-dim)' }}>
                                        {p.username}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ 
                                            background: '#2a3e5c', color: '#61afef', 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500'
                                        }}>
                                            {p.location}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--tool-text-main)', fontWeight: 'bold' }}>
                                        {p.actions !== undefined ? `${p.actions}` : '-'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ 
                                                width: '8px', height: '8px', borderRadius: '50%', 
                                                background: p.lastActive && new Date(p.lastActive).getTime() > Date.now() - 300000 ? '#2ecc71' : '#555' 
                                            }} />
                                            <span style={{ color: '#aaa', fontSize: '0.9rem' }}>{formatTimeAgo(p.lastActive)}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (p.characterId) {
                                                    setSelectedCharId(p.characterId);
                                                } else {
                                                    alert("Cannot inspect: Character ID is undefined.");
                                                }
                                            }}
                                            style={{
                                                background: 'transparent', border: '1px solid #555', color: '#ccc',
                                                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                            }}
                                            className="hover:bg-white/10 hover:border-white hover:text-white"
                                        >
                                            Inspect
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedCharId && (
                <CharacterInspector 
                    characterId={selectedCharId} 
                    storyId={storyId} 
                    worldQualities={worldQualities}
                    settings={settings}
                    onClose={() => setSelectedCharId(null)} 
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENT: INSPECTOR MODAL ---

function CharacterInspector({ characterId, storyId, worldQualities, settings, onClose }: { 
    characterId: string, 
    storyId: string, 
    worldQualities: Record<string, QualityDefinition>,
    settings: WorldSettings | null,
    onClose: () => void 
}) {
    const [char, setChar] = useState<CharacterDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState<'all' | 'dynamic' | 'static'>('dynamic');
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/character/${characterId}?storyId=${storyId}`)
            .then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(`API Error ${r.status}: ${text}`);
                }
                return r.json();
            })
            .then(setChar)
            .catch(err => {
                console.error(err);
                alert("Failed to fetch character details. Ensure the API route /api/admin/character/[id] exists.");
            })
            .finally(() => setLoading(false));
    }, [characterId, storyId]);

    const handleUpdateQuality = async (qid: string, newVal: number | string) => {
        try {
            const res = await fetch(`/api/admin/character/update`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ storyId, characterId, qualityId: qid, value: newVal })
            });
            if(res.ok) {
                // Optimistic update
                setChar(prev => {
                    if(!prev) return null;
                    const next = { ...prev, qualities: { ...prev.qualities } };
                    if(next.qualities[qid]) {
                         // @ts-ignore
                        if(typeof newVal === 'string') next.qualities[qid].stringValue = newVal;
                         // @ts-ignore
                        else next.qualities[qid].level = Number(newVal);
                    }
                    return next;
                });
            } else {
                alert("Failed to update.");
            }
        } catch(e) { console.error(e); }
    };

    if (!char && !loading) return null;

    const displayedQualities = useMemo(() => {
        if (!char) return [];
        return Object.entries(char.qualities)
            .filter(([qid, state]) => {
                const isDynamic = !!char.dynamicQualities?.[qid] || !worldQualities[qid];
                if (searchTerm && !qid.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                if (filterMode === 'dynamic') return isDynamic;
                if (filterMode === 'static') return !isDynamic;
                return true;
            })
            .sort((a, b) => a[0].localeCompare(b[0]));
    }, [char, filterMode, worldQualities, searchTerm]);

    const getActionCount = () => {
        const q = Object.values(char?.qualities || {}).find(q => q.qualityId === '$actions' || q.qualityId.endsWith('actions'));
        // @ts-ignore
        if (q && 'level' in q) return q.level;
        return 0;
    };

    const resolveInspectorName = () => {
        if (char?.name && char.name !== "Unknown") return char.name;
        if (settings?.playerName) {
            const rawId = settings.playerName;
            const cleanId = rawId.replace('$', '');
            const qState = char?.qualities[cleanId] || char?.qualities[rawId];
            if (qState) {
                // @ts-ignore
                if ((qState.type as string) === 'S' || qState.type === QualityType.String) {
                    // @ts-ignore
                    return qState.stringValue;
                }
            }
        }
        return "Unknown Character";
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'end' }}>
            <div style={{ 
                width: '600px', maxWidth: '100%', background: '#1e2125', 
                borderLeft: '1px solid #444', height: '100%', overflowY: 'auto',
                display: 'flex', flexDirection: 'column'
            }}>
                {loading ? (
                    <div style={{ padding: '2rem' }}>Loading character data...</div>
                ) : char && (
                    <>
                        {/* HEADER */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #333', background: '#282c34' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: 0, color: '#fff' }}>{resolveInspectorName()}</h2>
                                    {/* HIDE ID FROM INSPECTOR HERE */}
                                </div>
                                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                                <div style={{ background: '#21252b', padding: '5px 10px', borderRadius: '4px' }}>
                                    📍 <strong>{worldQualities[char.currentLocationId]?.name || char.currentLocationId}</strong>
                                </div>
                                <div style={{ background: '#21252b', padding: '5px 10px', borderRadius: '4px' }}>
                                    ⚡ <strong>{getActionCount()} Actions</strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '1.5rem', flex: 1 }}>
                            {/* ... Rest of Inspector Content (Pending Events, Qualities List) ... */}
                            <h3 style={{ color: '#e5c07b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                                Living Stories (Queue)
                            </h3>
                            
                            {!char.pendingEvents || char.pendingEvents.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', marginBottom: '2rem' }}>No pending events queued.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '10px', marginBottom: '2rem' }}>
                                    {char.pendingEvents.map((evt: PendingEvent, idx: number) => (
                                        <div key={idx} style={{ background: '#2c313a', padding: '0.8rem', borderRadius: '4px', borderLeft: '3px solid #e5c07b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <strong style={{ color: '#e5c07b' }}>{evt.targetId}</strong>
                                                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{new Date(evt.triggerTime).toLocaleString()}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                                Operation: <code>{evt.op} {evt.value}</code>
                                                {evt.recurring && <span style={{ marginLeft: '10px', background: '#98c379', color: '#000', padding: '1px 4px', borderRadius: '2px', fontSize: '0.7rem' }}>Recurring</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* QUALITIES INSPECTOR */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '1rem', borderBottom: '1px solid #444', paddingBottom: '0.5rem' }}>
                                <h3 style={{ color: '#61afef', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                                    Qualities
                                </h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ background: '#111', border: '1px solid #444', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}
                                    />
                                    <select 
                                        value={filterMode} 
                                        onChange={e => setFilterMode(e.target.value as any)}
                                        style={{ background: '#111', border: '1px solid #444', color: 'white', padding: '4px', borderRadius: '4px', fontSize: '0.8rem' }}
                                    >
                                        <option value="dynamic">Dynamic Only</option>
                                        <option value="static">Static Only</option>
                                        <option value="all">Show All</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '1px', background: '#333', border: '1px solid #333' }}>
                                {displayedQualities.map(([qid, state]) => {
                                    const isDynamic = !!char.dynamicQualities?.[qid] || !worldQualities[qid];
                                    const def = char.dynamicQualities?.[qid] || worldQualities[qid] || {};
                                    
                                    // @ts-ignore
                                    const isString = (state.type as string) === 'S' || state.type === QualityType.String; 
                                    const hasLevel = 'level' in state;
                                    const hasCP = 'changePoints' in state;
                                    
                                    return (
                                        <div key={qid} style={{ background: '#1e2125', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#ddd' }}>{def.name || qid}</span>
                                                    {isDynamic && <span style={{ fontSize: '0.65rem', background: '#c678dd', color: 'white', padding: '1px 4px', borderRadius: '2px' }}>DYN</span>}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#666', fontFamily: 'monospace' }}>{qid}</div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                {isString ? (
                                                     <input 
                                                        // @ts-ignore
                                                        defaultValue={state.stringValue} 
                                                        onBlur={(e) => {
                                                            // @ts-ignore
                                                            if (e.target.value !== state.stringValue) handleUpdateQuality(qid, e.target.value);
                                                        }}
                                                        style={{ background: '#111', border: '1px solid #444', color: '#e5c07b', padding: '4px 8px', borderRadius: '4px', width: '120px' }}
                                                     />
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <input 
                                                            type="number"
                                                            defaultValue={hasLevel ? state.level : 0} 
                                                            onBlur={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                // @ts-ignore
                                                                if (!isNaN(val) && val !== state.level) handleUpdateQuality(qid, val);
                                                            }}
                                                            style={{ background: '#111', border: '1px solid #444', color: '#98c379', padding: '4px 8px', borderRadius: '4px', width: '80px', textAlign: 'right' }}
                                                        />
                                                        {state.type === 'P' && hasCP && <span style={{ fontSize: '0.7rem', color: '#555' }}>(CP: {state.changePoints})</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {displayedQualities.length === 0 && (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: '#666', background: '#1e2125' }}>
                                        No qualities found matching filter.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}