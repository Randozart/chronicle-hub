'use client';

/*
 * Chronicle Hub
 * Copyright (C) 2026 Randy Smits-Scheuder Goedheijt <randozart@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import WorldCard from '@/components/dashboard/WorldCard';
import CreateWorldModal from '@/components/dashboard/CreateWorldModal';
import SystemMessageBanner from '@/components/SystemMessageBanner';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function Dashboard() {
    const { status } = useSession();
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
         
         setPlatformMsg(null);
    };

    if (status === 'loading') return <div className="loading-container">Loading Studio...</div>;

    const getCleanDisplayList = () => {
        if (!data) return [];
        const sourceList = Array.isArray(data) ? data : (activeTab === 'my' ? data.myWorlds : data.playedWorlds);
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