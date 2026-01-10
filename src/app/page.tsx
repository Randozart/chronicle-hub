'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import WorldCard from '@/components/dashboard/WorldCard';
import CreateWorldModal from '@/components/dashboard/CreateWorldModal';
import { signOut } from 'next-auth/react';
import SystemMessageBanner from '@/components/SystemMessageBanner';
import { useTheme } from '@/providers/ThemeProvider';
import MainLogo from '@/components/icons/MainLogo';
import ThemeControls from '@/components/ui/ThemeControls';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const { theme } = useTheme();
    
    const [data, setData] = useState<{ myWorlds: any[], playedWorlds: any[] } | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
    const [platformMsg, setPlatformMsg] = useState<any>(null);

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

    const dismissPlatformMsg = async () => {
         if (!platformMsg) return;
         await fetch('/api/user/acknowledge-message', { method: 'POST', body: JSON.stringify({ messageId: platformMsg.id }) });
    };

    if (status === 'loading') return <div className="loading-container">Loading Studio...</div>;

    // --- THE FIX ---
    // The raw 'data' from the API can be messy. We will create a clean, reliable list here.
    const getCleanDisplayList = () => {
        if (!data) return [];
        
        // Determine which list to use based on the active tab
        const sourceList = Array.isArray(data) 
            ? data 
            : (activeTab === 'my' ? data.myWorlds : data.playedWorlds);

        if (!Array.isArray(sourceList)) return [];

        // Map over the source list and sanitize each item before it gets to WorldCard
        return sourceList.map(w => {
            // Helper to safely convert array-like objects back to arrays
            const getTagsArray = (tags: any): string[] => {
                if (Array.isArray(tags)) return tags;
                if (tags && typeof tags === 'object') {
                    return Object.values(tags).filter(val => typeof val === 'string') as string[];
                }
                return [];
            };

            return {
                ...w,
                // Ensure tags is always a real array
                tags: getTagsArray(w.tags),
                // Ensure summary is always a string
                summary: (w.summary && typeof w.summary === 'object') ? JSON.stringify(w.summary) : (w.summary || ""),
                // Ensure title is always a string
                title: (w.title && typeof w.title === 'object') ? JSON.stringify(w.title) : (w.title || "Untitled World")
            };
        });
    };

    const displayList = getCleanDisplayList();
    const isGuest = status === 'unauthenticated';

    return (
        <div className="theme-wrapper" data-theme="default" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            
            {/* HEADER */}
            <div className="dashboard-header">
                <div className="header-brand">
                    <MainLogo width={40} height={40} />
                    <h1>Chronicle<span>Hub</span></h1>                
                </div>
                
                <div className="header-controls">
                    <ThemeControls />
                    <Link href="/docs" className="header-link">Docs</Link>
                    <div className="user-menu">
                        {isGuest ? (
                            <Link href="/login" className="login-link">Login</Link>
                        ) : (
                            <>
                                <span className="user-email">{session?.user?.email}</span>
                                <button onClick={() => signOut({ callbackUrl: '/login' })} className="logout-btn">Log Out</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {platformMsg && (
                <SystemMessageBanner message={platformMsg} type="platform" onDismiss={dismissPlatformMsg} />
             )}

            {/* CONTENT */}
            <div className="dashboard-content">
                <div className="dashboard-container">
                    
                    {/* TABS & ACTIONS */}
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

                    {/* GRID */}
                    <div className="dashboard-grid">
                        {displayList.map((w: any) => (
                            <WorldCard key={w.worldId} w={w} isOwner={activeTab === 'my'} isGuest={isGuest} />
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