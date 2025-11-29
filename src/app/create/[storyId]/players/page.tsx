'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface PlayerData {
    userId: string;
    username: string;
    email: string;
    location: string;
    lastActive?: string;
    actions?: number;
}

export default function PlayerMonitor({ params }: { params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Auto-refresh every 30 seconds so it feels "Live"
    useEffect(() => {
        const fetchPlayers = () => {
            fetch(`/api/admin/players?storyId=${storyId}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setPlayers(data);
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        };

        fetchPlayers();
        const interval = setInterval(fetchPlayers, 30000);
        return () => clearInterval(interval);
    }, [storyId]);

    // Helper to calculate "Time Ago"
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
        <div className="admin-editor-col" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #444', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Player Monitor</h2>
                <span style={{ color: '#777', fontSize: '0.9rem' }}>
                    {players.length} Total Players
                </span>
            </div>

            {isLoading ? (
                <div className="loading-container">Scanning world...</div>
            ) : players.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#777', padding: '4rem' }}>
                    <p>No souls have entered this world yet.</p>
                </div>
            ) : (
                <div style={{ background: '#181a1f', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#21252b', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase' }}>User</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase' }}>Location</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase' }}>Actions</th>
                                <th style={{ padding: '1rem', color: '#aaa', fontSize: '0.85rem', textTransform: 'uppercase' }}>Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {players.map((p) => (
                                <tr key={p.userId} style={{ borderBottom: '1px solid #2c313a' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{p.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.email}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ 
                                            background: '#2a3e5c', color: '#61afef', 
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' 
                                        }}>
                                            {p.location}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#ccc' }}>
                                        {p.actions}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ 
                                            color: p.lastActive && new Date(p.lastActive).getTime() > Date.now() - 300000 ? '#98c379' : '#777',
                                            fontWeight: 'bold', fontSize: '0.9rem'
                                        }}>
                                            {formatTimeAgo(p.lastActive)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}