'use client'

import Link from 'next/link';
import '@/app/globals.css';
import CheatSheet from './components/CheatSheet';
import { use } from 'react';


export default function AdminLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params); // <--- AWAIT THIS
    const base = `/create/${storyId}`;
    
    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-header">Creator Studio</div>
                <nav className="admin-nav">
                    <ul>
                        <AdminLink href={`${base}/qualities`} label="Qualities" />
                        <AdminLink href={`${base}/categories`} label="Categories" /> {/* NEW */}
                        <AdminLink href={`${base}/storylets`} label="Storylets" />
                        <AdminLink href={`${base}/opportunities`} label="Opportunities" />
                        <AdminLink href={`${base}/locations`} label="Locations" />
                        <AdminLink href={`${base}/regions`} label="Map Regions" />
                        <AdminLink href={`${base}/decks`} label="Decks" />
                        <AdminLink href={`${base}/images`} label="Image Library" />
                        <AdminLink href={`${base}/settings`} label="Settings" />
                    </ul>
                </nav>
                <div style={{ padding: '1rem', borderTop: '1px solid #333' }}>
                    <Link href="/" className="admin-link">Back to Game</Link>
                </div>
            </aside>
            {/* Main Content Area */}
            <main className="admin-main" style={{ display: 'flex', padding: 0 }}>
                
                {/* The Page Content (List + Editor) */}
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                    {children}
                </div>

                {/* Right Sidebar (Reference) */}
                <aside className="admin-help-sidebar">
                    <CheatSheet />
                </aside>

            </main>
        </div>
    );
}

function AdminLink({ href, label }: { href: string, label: string }) {
    return (
        <li>
            <Link href={href} className="admin-link">{label}</Link>
        </li>
    );
}