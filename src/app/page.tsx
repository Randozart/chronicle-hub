'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import WorldCard from '@/components/dashboard/WorldCard';
import CreateWorldModal from '@/components/dashboard/CreateWorldModal';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<{ myWorlds: any[], playedWorlds: any[] } | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (status === 'authenticated') {
            // Initial load
            fetchData('my');
        }
    }, [status, router]);

    useEffect(() => {
        if (status === 'authenticated') fetchData(activeTab);
    }, [activeTab]);

    const fetchData = (tab: string) => {
        const endpoint = tab === 'my' ? '/api/worlds' : '/api/worlds?mode=discover';
        fetch(endpoint).then(r => r.json()).then(setData);
    };

    if (status === 'loading' || !data) return (
        <div className="loading-container">Loading Studio...</div>
    );

    const worlds = activeTab === 'my' ? data.myWorlds : data.playedWorlds; // (Reuse playedWorlds structure for discover list?)
    // Note: API response structure might differ for discover mode. 
    // Let's assume endpoint returns array directly for discover mode or handle it.
    
    // Actually, /api/worlds returns { myWorlds, playedWorlds } normally.
    // If mode=discover, it returns ARRAY of worlds directly.
    // Let's normalize state.

    const displayList = Array.isArray(data) ? data : (activeTab === 'my' ? data.myWorlds : []);

    return (
        <div className="theme-wrapper" data-theme="default" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            
            {/* HEADER */}
            <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '24px', height: '24px', background: 'var(--accent-highlight)', borderRadius: '4px' }} />
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Chronicle Hub</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{session?.user?.email}</span>
                </div>
            </div>

            {/* CONTENT */}
            <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    
                    {/* TABS & ACTIONS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            <button 
                                onClick={() => setActiveTab('my')}
                                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'my' ? '2px solid var(--accent-highlight)' : '2px solid transparent', color: activeTab === 'my' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', paddingBottom: '5px' }}
                            >
                                My Projects
                            </button>
                            <button 
                                onClick={() => setActiveTab('discover')}
                                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'discover' ? '2px solid var(--success-color)' : '2px solid transparent', color: activeTab === 'discover' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', paddingBottom: '5px' }}
                            >
                                Community Arcade
                            </button>
                        </div>
                        
                        {activeTab === 'my' && (
                            <button onClick={() => setShowCreate(true)} className="deck-button" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                + New Project
                            </button>
                        )}
                    </div>

                    {/* GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                        {displayList.map((w: any) => (
                            <WorldCard key={w.worldId} w={w} isOwner={activeTab === 'my'} />
                        ))}
                        
                        {displayList.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {activeTab === 'my' ? "No projects found. Create one to get started." : "No public worlds found yet."}
                            </div>
                        )}
                    </div>

                    {/* Adventure List (Only show on My Tab if relevant) */}
                    {activeTab === 'my' && data && 'playedWorlds' in data && data.playedWorlds.length > 0 && (
                        <>
                            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '4rem 0 2rem 0', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>Recent Adventures</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {data.playedWorlds.map((w: any) => (
                                    <WorldCard key={w.worldId} w={w} isOwner={false} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showCreate && <CreateWorldModal onClose={() => setShowCreate(false)} />}
        </div>
    );
}