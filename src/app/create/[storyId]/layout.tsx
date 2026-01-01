// src/app/create/[storyId]/layout.tsx
'use client'; // Converted to client component to handle events

import Link from 'next/link';
import '@/app/globals.css';
import CheatSheet from '../../../components/admin/CheatSheet';
import { verifyWorldAccess } from '@/engine/accessControl';
// import { redirect } from 'next/navigation'; // Removed for client-side transition
import VisualFilters from '@/components/VisualFilters';
import AdminSidebarFooter from '../../../components/admin/AdminSidebarFooter';
import { ToastProvider } from '@/providers/ToastProvider';
import { useEffect, use } from 'react';

export default function AdminLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    
    // GLOBAL HOTKEY LISTENER
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                // Dispatch custom event that active forms listen to
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
                {/* LEFT SIDEBAR (Fixed) */}
                <aside className="admin-sidebar">
                    <div className="admin-header">Creator Studio</div>
                    <nav className="admin-nav">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        
                            {/* --- SYSTEM --- */}
                            <SectionHeader label="Game System" />
                            <AdminLink href={`${base}/settings`} label="Settings" />
                            <AdminLink href={`${base}/qualities`} label="Qualities" />
                            <AdminLink href={`${base}/categories`} label="Categories" />
                            
                            {/* --- WORLD --- */}
                            <SectionHeader label="World & Economy" />
                            <AdminLink href={`${base}/locations`} label="Locations" />
                            <AdminLink href={`${base}/regions`} label="Map Regions" />
                            <AdminLink href={`${base}/markets`} label="Markets" />
                            <AdminLink href={`${base}/decks`} label="Decks" />
                            
                            {/* --- NARRATIVE --- */}
                            <SectionHeader label="Narrative" />
                            <AdminLink href={`${base}/storylets`} label="Storylets" />
                            <AdminLink href={`${base}/opportunities`} label="Cards" />
                            
                            {/* --- ASSETS --- */}
                            <SectionHeader label="Assets" />
                            <AdminLink href={`${base}/images`} label="Image Library" />
                            <AdminLink href={`${base}/audio`} label="Audio Engine" />

                            {/* --- TOOLS --- */}
                            <SectionHeader label="Tools & Live" />
                            <AdminLink href={`${base}/graph`} label="Narrative Graph" />
                            <AdminLink href={`${base}/players`} label="Player Monitor" />
                            <AdminLink href={`${base}/world-state`} label="GM Console" />
                        </ul>
                    </nav>
                    <AdminSidebarFooter />
                </aside>

                {/* MAIN AREA */}
                <main className="admin-main">
                    <div className="admin-content-wrapper">
                        {children}
                    </div>
                    
                    <aside className="admin-help-sidebar">
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