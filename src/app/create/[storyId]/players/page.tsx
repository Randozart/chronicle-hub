'use client';

import { useState, useEffect, use } from 'react';
import { 
    QualityDefinition,
    WorldSettings,
    QualityType
} from '@/engine/models';
import CharacterInspector from './components/CharacterInspector'; // New Import
import { useToast } from '@/providers/ToastProvider';

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
    const { showToast } = useToast(); // Use Toast hook
    
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
                showToast("Failed to load world config.", "error");
            }
        };
        loadConfig();
    }, [storyId, showToast]);

    // 2. Poll Player List
    useEffect(() => {
        const fetchPlayers = () => {
            fetch(`/api/admin/players?storyId=${storyId}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setPlayers(data.map((p: any) => {
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
                .catch(err => console.error("Poll failed", err))
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
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--tool-border)', paddingBottom: '1rem' }}>
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
                    border: '1px solid var(--tool-border)',
                    color: 'var(--tool-accent)' 
                }}>
                    {players.length} Active Characters
                </span>
            </div>

            {isLoading ? (
                <div className="loading-container">Scanning world...</div>
            ) : players.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--tool-text-dim)', padding: '4rem', background: 'var(--tool-bg-dark)', borderRadius: '8px', border: '1px dashed var(--tool-border)' }}>
                    <p>No souls have entered this world yet.</p>
                </div>
            ) : (
                <div style={{ background: 'var(--tool-bg-input)', border: '1px solid var(--tool-border)', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'var(--tool-bg-header)', textAlign: 'left', borderBottom: '1px solid var(--tool-border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: 'var(--tool-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Character Name</th>
                                <th style={{ padding: '1rem', color: 'var(--tool-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>User Account</th>
                                <th style={{ padding: '1rem', color: 'var(--tool-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Location</th>
                                <th style={{ padding: '1rem', color: 'var(--tool-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                                <th style={{ padding: '1rem', color: 'var(--tool-text-dim)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Last Active</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Admin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map((p, index) => (
                                <tr key={p.characterId || `p-${index}`} style={{ borderBottom: '1px solid var(--tool-border)', transition: 'background 0.2s' }} className="hover:bg-white/5">
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--tool-text-header)', fontSize: '1rem' }}>{p.characterName}</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--tool-text-dim)' }}>
                                        {p.username}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ 
                                            background: 'var(--tool-accent-fade)', color: 'var(--tool-accent)', 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', border: '1px solid var(--tool-accent)'
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
                                                background: p.lastActive && new Date(p.lastActive).getTime() > Date.now() - 300000 ? 'var(--success-color)' : 'var(--tool-border)' 
                                            }} />
                                            <span style={{ color: 'var(--tool-text-dim)', fontSize: '0.9rem' }}>{formatTimeAgo(p.lastActive)}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (p.characterId) {
                                                    setSelectedCharId(p.characterId);
                                                } else {
                                                    showToast("Cannot inspect: Character ID is undefined.", "error");
                                                }
                                            }}
                                            style={{
                                                background: 'transparent', border: '1px solid var(--tool-border)', color: 'var(--tool-text-main)',
                                                padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'
                                            }}
                                            className="hover:border-white hover:text-white"
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