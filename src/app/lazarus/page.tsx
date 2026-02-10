'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LazarusDashboard() {
    const [worlds, setWorlds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/lazarus/worlds')
            .then(res => res.json())
            .then(data => setWorlds(data.worlds || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading Archives...</div>;

    return (
        <div>
            <div style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: '#fff' }}>Reconstruction Archives</h2>
                <p style={{ color: '#777', marginTop: '0.5rem' }}>
                    Select a recovered world to analyze events and reconstruct logic.
                </p>
            </div>

            {worlds.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', background: '#181a1f', borderRadius: '8px', border: '1px dashed #333', color: '#555' }}>
                    No archives found or you do not have permission to view any.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    {worlds.map(w => (
                        <Link key={w} href={`/lazarus/${w}`} style={{ textDecoration: 'none' }}>
                            <div style={{ 
                                background: '#21252b', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem',
                                transition: 'all 0.2s', cursor: 'pointer' 
                            }} className="hover:border-accent">
                                <h3 style={{ margin: '0 0 0.5rem 0', color: '#e5c07b', textTransform: 'capitalize' }}>{w}</h3>
                                <div style={{ fontSize: '0.8rem', color: '#777' }}>Click to Browse Events</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}