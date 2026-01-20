'use client';
import { useState } from 'react';
import OverviewTab from '@/components/admin/dashboard/OverviewTab';
import UserManagement from '@/components/admin/dashboard/UserManagement';
import WorldManagement from '@/components/admin/dashboard/WorldManagement';
import SystemConfig from '@/components/admin/dashboard/SystemConfig';

const ChartIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
    </svg>
);

const UsersIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const GlobeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const BroadcastIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12a3 3 0 0 0-3-3h-2v6h2a3 3 0 0 0 3-3Z" />
        <path d="M17 17v-6a2 2 0 0 0-2-2H6l-3 3v2l3 3h9a2 2 0 0 0 2-2Z" />
        <path d="M2 8v8" />
    </svg>
);

export default function SysAdminPage() {
    const [activeTab, setActiveTab] = useState('overview');

    const renderTab = () => {
        switch (activeTab) {
            case 'users': return <UserManagement />;
            case 'worlds': return <WorldManagement />;
            case 'config': return <SystemConfig />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#141414', color: '#ccc', display: 'flex' }}>
            <div style={{ width: '250px', background: '#181a1f', borderRight: '1px solid #333', padding: '2rem 1rem', flexShrink: 0 }}>
                <h2 style={{ color: '#61afef', margin: '0 0 2rem 0', paddingLeft: '1rem', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    SysAdmin
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <NavBtn 
                        label="Overview" 
                        id="overview" 
                        active={activeTab} 
                        set={setActiveTab} 
                        icon={<ChartIcon />} 
                    />
                    <NavBtn 
                        label="Users & Roles" 
                        id="users" 
                        active={activeTab} 
                        set={setActiveTab} 
                        icon={<UsersIcon />} 
                    />
                    <NavBtn 
                        label="Worlds" 
                        id="worlds" 
                        active={activeTab} 
                        set={setActiveTab} 
                        icon={<GlobeIcon />} 
                    />
                    <NavBtn 
                        label="Announcements" 
                        id="config" 
                        active={activeTab} 
                        set={setActiveTab} 
                        icon={<BroadcastIcon />} 
                    />
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.7rem', color: '#555', textAlign: 'center' }}>
                    ChronicleHub Admin v2.1
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '3rem', overflowY: 'auto' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h1 style={{ marginTop: 0, marginBottom: '2rem', color: '#fff', borderBottom: '1px solid #333', paddingBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '1.5rem' }}>
                        {activeTab === 'overview' && 'Dashboard Overview'}
                        {activeTab === 'users' && 'User Management'}
                        {activeTab === 'worlds' && 'World Registry'}
                        {activeTab === 'config' && 'System Configuration'}
                    </h1>
                    {renderTab()}
                </div>
            </div>
        </div>
    );
}

function NavBtn({ label, id, active, set, icon }: { label: string, id: string, active: string, set: (id: string) => void, icon: React.ReactNode }) {
    const isActive = active === id;
    return (
        <button 
            onClick={() => set(id)}
            style={{
                background: isActive ? 'rgba(97, 175, 239, 0.1)' : 'transparent',
                color: isActive ? '#61afef' : '#abb2bf',
                border: 'none',
                borderLeft: `3px solid ${isActive ? '#61afef' : 'transparent'}`,
                padding: '0.8rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                borderRadius: '0 4px 4px 0'
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span> 
            {label}
        </button>
    );
}