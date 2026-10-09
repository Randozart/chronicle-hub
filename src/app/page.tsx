'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import WorldCard from '@/components/dashboard/WorldCard';
import CreateWorldModal from '@/components/dashboard/CreateWorldModal';
import SystemMessageBanner from '@/components/SystemMessageBanner';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function Dashboard() {
    const { status } = useSession();
    const [data, setData] = useState<{ myWorlds: any[], playedWorlds: any[], worlds?: any[], isSystemAdmin?: boolean } | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
    const [platformMsg, setPlatformMsg] = useState<any>(null);
    const [chronicles, setChronicles] = useState<Array<{ chronicleId: string; characterName: string; endingName?: string; epitaph?: string; stats?: Record<string, number>; at: string }>>([]);

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') setActiveTab('discover');
        else setActiveTab('my');
    }, [status]);

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
        fetch('/api/platform/announcement').then(r => r.json()).then(setPlatformMsg).catch(() => {}); 
    }, []);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/chronicles').then(r => r.json()).then(d => {
            if (d?.success) setChronicles(d.chronicles || []);
        }).catch(() => {});
    }, [status]);

    const dismissPlatformMsg = async () => {
         if (!platformMsg) return;
         await fetch('/api/user/acknowledge-message', { method: 'POST', body: JSON.stringify({ messageId: platformMsg.id }) });
         
         setPlatformMsg(null);
    };

    if (status === 'loading') return <div className="loading-container">Loading Studio...</div>;

    const getCleanDisplayList = () => {
        if (!data) return [];
        const sourceList = Array.isArray(data) ? data : (activeTab === 'my' ? (data.myWorlds || []) : (data.worlds || data.playedWorlds || []));
        
        if (!Array.isArray(sourceList)) return [];

        return sourceList.map(w => {
            const getTagsArray = (tags: any): string[] => {
                if (Array.isArray(tags)) return tags;
                if (tags && typeof tags === 'object') return Object.values(tags).filter(val => typeof val === 'string') as string[];
                return [];
            };
            return {
                ...w,
                tags: getTagsArray(w.tags),
                summary: (w.summary && typeof w.summary === 'object') ? JSON.stringify(w.summary) : (w.summary || ""),
                title: (w.title && typeof w.title === 'object') ? JSON.stringify(w.title) : (w.title || "Untitled World")
            };
        });
    };

    const displayList = getCleanDisplayList();
    const isGuest = status === 'unauthenticated';
    const isSystemAdmin = data?.isSystemAdmin || false;

    return (
        <div className="theme-wrapper" data-theme="default" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            <DashboardHeader activePage="dashboard" />

            {platformMsg && (
                <SystemMessageBanner message={platformMsg} type="platform" onDismiss={dismissPlatformMsg} />
             )}

            <div className="dashboard-content">
                <div className="dashboard-container">
                    
                    <div className="dashboard-tabs">
                        <div className="tab-group">
                            {!isGuest && (
                                <button 
                                    onClick={() => setActiveTab('my')}
                                    className={`dash-tab ${activeTab === 'my' ? 'active' : ''}`}
                                >
                                    My Projects
                                </button>
                            )}
                            <button 
                                onClick={() => setActiveTab('discover')}
                                className={`dash-tab discover ${activeTab === 'discover' ? 'active' : ''}`}
                            >
                                Community Arcade
                            </button>
                        </div>
                        
                        {!isGuest && activeTab === 'my' && (
                            <button onClick={() => setShowCreate(true)} className="deck-button compact">
                                + New Project
                            </button>
                        )}
                    </div>

                    <div className="dashboard-grid">
                        {displayList.map((w: any) => (
                            <WorldCard
                                key={w.worldId}
                                w={w}
                                isOwner={activeTab === 'my' && !!w.currentUserId}
                                isGuest={isGuest}
                                isAdmin={isSystemAdmin}
                            />
                        ))}
                        
                        {displayList.length === 0 && (
                            <div className="empty-state">
                                {activeTab === 'my' ? "No projects found. Create one to get started." : "No public worlds found yet."}
                            </div>
                        )}
                    </div>
                    
                    {activeTab === 'my' && data && 'playedWorlds' in data && (data.playedWorlds || []).length > 0 && (
                        <>
                            <h2 className="section-title">Recent Adventures</h2>
                            <div className="dashboard-grid">
                                {data.playedWorlds.map((w: any) => (
                                    <WorldCard key={w.worldId} w={w} isOwner={false} isAdmin={isSystemAdmin} />
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'my' && chronicles.length > 0 && (
                        <>
                            <h2 className="section-title">Your Chronicles</h2>
                            <div className="dashboard-grid">
                                {chronicles.map(c => (
                                    <div key={c.chronicleId} className="empty-state" style={{ textAlign: 'left', padding: '1.25rem' }}>
                                        <div style={{ color: 'var(--text-highlight)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            {c.characterName}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                            {c.endingName || 'A finished story'} · {new Date(c.at).toLocaleDateString()}
                                        </div>
                                        {c.epitaph && (
                                            <div style={{ fontStyle: 'italic', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                                “{c.epitaph}”
                                            </div>
                                        )}
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            {[
                                                c.stats?.day ? `${c.stats.day} days` : null,
                                                c.stats?.cases_closed != null ? `${c.stats.cases_closed} cases closed` : null,
                                                c.stats?.reputation ? `reputation ${c.stats.reputation}` : null,
                                            ].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
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