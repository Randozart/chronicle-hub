'use client';
import { useEffect, useState } from 'react';

export default function OverviewTab() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        fetch('/api/sysadmin/stats').then(r => r.json()).then(setStats);
    }, []);

    if (!stats) return <div>Loading Analytics...</div>;

    const { counts, growth } = stats;
    const maxGrowth = Math.max(...growth.map((g: any) => g.count), 1); // Avoid div by zero

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <StatCard label="Total Users" value={counts.users} color="#61afef" />
                <StatCard label="Daily Active (24h)" value={counts.dau} color="#98c379" />
                <StatCard label="Total Worlds" value={counts.worlds} color="#e5c07b" />
                <StatCard label="Uploaded Assets" value={counts.assets} color="#c678dd" />
            </div>

            {/* CSS Bar Chart */}
            <div style={{ background: '#21252b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', color: '#abb2bf' }}>User Growth (Last 7 Days)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '10px' }}>
                    {growth.map((day: any) => {
                        const height = (day.count / maxGrowth) * 100;
                        return (
                            <div key={day._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                <div style={{ 
                                    width: '100%', height: `${height}%`, 
                                    background: 'var(--accent-highlight)', 
                                    borderRadius: '4px 4px 0 0', opacity: 0.8,
                                    transition: 'height 0.5s ease'
                                }} />
                                <span style={{ fontSize: '0.7rem', color: '#777' }}>{day._id.slice(5)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: any) {
    return (
        <div style={{ background: '#21252b', padding: '1.5rem', borderRadius: '8px', borderLeft: `4px solid ${color}`, boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '0.85rem', color: '#777', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginTop: '0.5rem' }}>{value}</div>
        </div>
    );
}