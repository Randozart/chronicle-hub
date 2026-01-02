'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useTheme } from '@/providers/ThemeProvider';

export default function AdminSidebarFooter() {
    const { theme, setTheme } = useTheme();

    return (
        <div style={{ padding: '1rem', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            
            {/* THEME TOGGLE */}
            <div style={{ display: 'flex', background: 'var(--tool-bg-header)', padding: '2px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                {(['light', 'system', 'dark'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTheme(t)}
                        style={{
                            flex: 1,
                            background: theme === t ? '#61afef' : 'transparent',
                            color: theme === t ? '#000' : '#888',
                            border: 'none',
                            padding: '4px',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: theme === t ? 'bold' : 'normal',
                            transition: 'all 0.2s'
                        }}
                        title={`Switch to ${t} mode`}
                    >
                        {t === 'light' ? '☀' : t === 'dark' ? '☾' : 'Auto'}
                    </button>
                ))}
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