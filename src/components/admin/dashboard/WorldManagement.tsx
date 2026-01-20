'use client';
import { useEffect, useState } from 'react';

export default function WorldManagement() {
    const [worlds, setWorlds] = useState([]);

    const fetchWorlds = () => {
        fetch('/api/sysadmin/worlds').then(r => r.json()).then(setWorlds);
    };

    useEffect(() => { fetchWorlds(); }, []);

    const togglePublish = async (worldId: string) => {
        if (!confirm("Are you sure you want to FORCE UNPUBLISH this world?")) return;
        await fetch('/api/sysadmin/worlds', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worldId, action: 'unpublish' })
        });
        fetchWorlds();
    };

    return (
        <div style={{ overflowX: 'auto', background: '#21252b', borderRadius: '8px', border: '1px solid #333' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ textAlign: 'left', background: '#181a1f', color: '#777' }}>
                        <th style={{ padding: '1rem' }}>World</th>
                        <th style={{ padding: '1rem' }}>Owner</th>
                        <th style={{ padding: '1rem' }}>Safety</th>
                        <th style={{ padding: '1rem' }}>Status</th>
                        <th style={{ padding: '1rem' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {worlds.map((w: any) => {
                        const safety = [];
                        if (w.contentConfig?.mature) safety.push("16+");
                        if (w.contentConfig?.erotica) safety.push("18+");
                        if (w.contentConfig?.triggers) safety.push("CW");

                        return (
                            <tr key={w.worldId} style={{ borderTop: '1px solid #333' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{w.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#555', fontFamily: 'monospace' }}>{w.worldId}</div>
                                </td>
                                <td style={{ padding: '1rem', color: '#ccc' }}>{w.ownerName}</td>
                                <td style={{ padding: '1rem' }}>
                                    {safety.length > 0 ? (
                                        <span style={{ color: '#e5c07b', border: '1px solid #e5c07b', padding: '2px 4px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                            {safety.join(' ')}
                                        </span>
                                    ) : <span style={{opacity:0.3}}>-</span>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {w.published 
                                        ? <span style={{ color: '#98c379' }}>● Live</span> 
                                        : <span style={{ color: '#555' }}>○ Draft</span>
                                    }
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {w.published && (
                                        <button 
                                            onClick={() => togglePublish(w.worldId)}
                                            style={{ background: '#e06c75', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                        >
                                            Kill Switch
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}