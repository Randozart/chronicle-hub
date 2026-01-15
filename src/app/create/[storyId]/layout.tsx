'use client'; 

import Link from 'next/link';
import CheatSheet from '../../../components/admin/CheatSheet';
import AdminSidebarFooter from '../../../components/admin/AdminSidebarFooter';
import { ToastProvider } from '@/providers/ToastProvider';
import { useEffect, useState, use } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    const pathname = usePathname();
    const [showNav, setShowNav] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    useEffect(() => {
        setShowNav(false);
        setShowHelp(false);
    }, [pathname]);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                window.dispatchEvent(new Event('global-save-trigger'));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const base = `/create/${storyId}`;
    
    return (
        <ToastProvider>
            <div className="admin-layout">
                <div className="admin-mobile-topbar">
                    <button className="admin-mobile-btn" onClick={() => setShowNav(true)}>
                        ☰
                    </button>
                    <span className="admin-mobile-title">Creator Studio</span>
                    <button className="admin-mobile-btn" onClick={() => setShowHelp(true)}>
                        ?
                    </button>
                </div>
                {(showNav || showHelp) && (
                    <div 
                        className="admin-mobile-backdrop" 
                        onClick={() => { setShowNav(false); setShowHelp(false); }} 
                    />
                )}
                <aside className={`admin-sidebar ${showNav ? 'mobile-open' : ''}`}>
                    <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Creator Studio
                        <button 
                            className="mobile-close-btn" 
                            onClick={() => setShowNav(false)}
                            style={{ display: showNav ? 'block' : 'none' }}
                        >✕</button>
                    </div>
                    
                    <nav className="admin-nav">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            
                            <li style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
                                <Link 
                                    href={`/play/${storyId}?playtest=true`}
                                    target="_blank"
                                    className="admin-link"
                                    style={{
                                        backgroundColor: 'var(--tool-accent-green, #28a745)',
                                        color: '#fff',
                                        textAlign: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        padding: '0.6rem',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    ▶ Playtest World
                                </Link>
                            </li>
                            <SectionHeader label="Game System" />
                            <AdminLink href={`${base}/settings`} label="Settings" />
                            <AdminLink href={`${base}/qualities`} label="Qualities" />
                            <AdminLink href={`${base}/categories`} label="Categories" />
                            <SectionHeader label="World & Economy" />
                            <AdminLink href={`${base}/locations`} label="Locations" />
                            <AdminLink href={`${base}/regions`} label="Map Regions" />
                            <AdminLink href={`${base}/markets`} label="Markets" />
                            <AdminLink href={`${base}/decks`} label="Decks" />
                            <SectionHeader label="Narrative" />
                            <AdminLink href={`${base}/storylets`} label="Storylets" />
                            <AdminLink href={`${base}/opportunities`} label="Cards" />
                            <SectionHeader label="Assets" />
                            <AdminLink href={`${base}/images`} label="Image Library" />
                            <AdminLink href={`${base}/audio`} label="Audio Engine" />
                            <SectionHeader label="Tools & Live" />
                            <AdminLink href={`${base}/graph`} label="Narrative Graph" />
                            <AdminLink href={`${base}/players`} label="Player Monitor" />
                            <AdminLink href={`${base}/world-state`} label="GM Console" />
                        </ul>
                    </nav>
                    <AdminSidebarFooter />
                </aside>
                <main className="admin-main">
                    <div className="admin-content-wrapper">
                        {children}
                    </div>
                    <aside className={`admin-help-sidebar ${showHelp ? 'mobile-open' : ''}`}>
                        <div style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                            padding: '1rem', background: 'var(--tool-bg-header)', borderBottom: '1px solid var(--tool-border)',
                        }} className="admin-mobile-only-header">
                            <span style={{fontWeight:'bold'}}>Reference</span>
                            <button className="mobile-close-btn" onClick={() => setShowHelp(false)}>✕</button>
                        </div>

                        <CheatSheet />
                    </aside>
                </main>
            </div>
        </ToastProvider>
    );
}

function AdminLink({ href, label }: { href: string, label: string }) {
    return (
        <li>
            <Link href={href} className="admin-link">{label}</Link>
        </li>
    );
}

function SectionHeader({ label }: { label: string }) {
    return (
        <li style={{ 
            margin: '1.5rem 0 0.5rem 1.2rem', 
            fontSize: '0.7rem', 
            textTransform: 'uppercase', 
            color: '#5c6370', 
            fontWeight: 'bold', 
            letterSpacing: '1px',
            userSelect: 'none'
        }}>
            {label}
        </li>
    );
}