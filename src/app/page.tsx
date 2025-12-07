'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Keep for other navs
import Link from 'next/link';
import WorldCard from '@/components/dashboard/WorldCard';
import CreateWorldModal from '@/components/dashboard/CreateWorldModal';
import { signOut } from 'next-auth/react';
import SystemMessageBanner from '@/components/SystemMessageBanner';

export default function Dashboard() {
    const { data: session, status } = useSession();
    // const router = useRouter(); // Not strictly needed for redirects if using Links
    const [data, setData] = useState<{ myWorlds: any[], playedWorlds: any[] } | any[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
    const [platformMsg, setPlatformMsg] = useState<any>(null);

    // 1. Determine Mode on Load
    useEffect(() => {
        if (status === 'loading') return;
        
        if (status === 'unauthenticated') {
            // GUEST: Force Discover mode
            setActiveTab('discover');
        } else {
            // USER: Default to My Projects
            setActiveTab('my');
        }
    }, [status]);

    // 2. Fetch Data when tab changes or status settles
    useEffect(() => {
        if (status === 'loading') return;
        
        const modeToFetch = status === 'unauthenticated' ? 'discover' : activeTab;
        const endpoint = modeToFetch === 'my' ? '/api/worlds' : '/api/worlds?mode=discover';
        
        fetch(endpoint)
            .then(r => r.json())
            .then(setData)
            .catch(console.error);
            
    }, [activeTab, status]);
    
    useEffect(() => {
        fetch('/api/platform/announcement')
            .then(r => r.json())
            .then(setPlatformMsg)
            .catch(() => {}); // silent fail
    }, []);

    const dismissPlatformMsg = async () => {
         if (!platformMsg) return;
         await fetch('/api/user/acknowledge-message', {
             method: 'POST',
             body: JSON.stringify({ messageId: platformMsg.id })
         });
    };

    if (status === 'loading') return <div className="loading-container">Loading Studio...</div>;

    const displayList = Array.isArray(data) ? data : (activeTab === 'my' ? (data?.myWorlds || []) : (data?.playedWorlds || []));

    // Helper for Guests
    const isGuest = status === 'unauthenticated';

    return (
        <div className="theme-wrapper" data-theme="default" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            
            {/* HEADER */}
            <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-color)', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '24px', height: '24px', background: 'var(--accent-highlight)', borderRadius: '4px' }} />
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Chronicle Hub</h1>
                </div>
                <Link href="/docs" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }} className="hover:text-white transition">
                    Documentation
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isGuest ? (
                        <Link href="/login" style={{ color: 'var(--accent-highlight)', textDecoration: 'none', fontWeight: 'bold' }}>
                            Login / Register
                        </Link>
                    ) : (
                        <>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{session?.user?.email}</span>
                            <button 
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                className="hover:bg-[#333] hover:text-white transition"
                            >
                                Log Out
                            </button>
                        </>
                    )}
                </div>
            </div>

            {platformMsg && (
                <SystemMessageBanner 
                    message={platformMsg} 
                    type="platform" 
                    onDismiss={dismissPlatformMsg} 
                />
             )}

            {/* CONTENT */}
            <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    
                    {/* TABS & ACTIONS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '2rem' }}>
                            {!isGuest && (
                                <button 
                                    onClick={() => setActiveTab('my')}
                                    style={{ background: 'none', border: 'none', borderBottom: activeTab === 'my' ? '2px solid var(--accent-highlight)' : '2px solid transparent', color: activeTab === 'my' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', paddingBottom: '5px' }}
                                >
                                    My Projects
                                </button>
                            )}
                            <button 
                                onClick={() => setActiveTab('discover')}
                                style={{ background: 'none', border: 'none', borderBottom: activeTab === 'discover' ? '2px solid var(--success-color)' : '2px solid transparent', color: activeTab === 'discover' ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', paddingBottom: '5px' }}
                            >
                                Community Arcade
                            </button>
                        </div>
                        
                        {!isGuest && activeTab === 'my' && (
                            <button onClick={() => setShowCreate(true)} className="deck-button" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                + New Project
                            </button>
                        )}
                    </div>

                    {/* GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
                        {displayList.map((w: any) => (
                            <WorldCard 
                                key={w.worldId} 
                                w={w} 
                                isOwner={activeTab === 'my'} 
                                isGuest={isGuest} // Pass guest status
                            />
                        ))}
                        
                        {displayList.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '4rem', border: '2px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                {activeTab === 'my' ? "No projects found. Create one to get started." : "No public worlds found yet."}
                            </div>
                        )}
                    </div>
                    
                    {/* ... (Recent Adventures Block - Keep existing, but check !isGuest) ... */}
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