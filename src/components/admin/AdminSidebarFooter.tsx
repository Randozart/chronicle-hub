'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/providers/ThemeProvider';
import ThemeControls from '../ui/ThemeControls';

export default function AdminSidebarFooter() {
    const { theme, setTheme } = useTheme();

    return (
        <div style={{ padding: '1rem', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            
            {/* THEME TOGGLE */}
            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                <ThemeControls />
            </div>

            <Link href="/" className="admin-link" style={{ display: 'block', color: 'var(--tool-text-dim)', textDecoration: 'none', padding: '0.5rem' }}>
                ← Back to Dashboard
            </Link>
            <button 
                onClick={() => signOut({ callbackUrl: '/login' })}
                style={{ 
                    background: 'none', border: 'none', color: '#e06c75', 
                    cursor: 'pointer', padding: '0.5rem', textAlign: 'left',
                    fontSize: '0.9rem', fontWeight: 'bold'
                }}
            >
                Log Out
            </button>
        </div>
    );
}