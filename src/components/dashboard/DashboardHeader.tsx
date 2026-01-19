'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import MainLogo from '@/components/icons/MainLogo';
import ThemeControls from '@/components/ui/ThemeControls';
import { useEffect } from 'react';

interface Props {
    activePage?: 'dashboard' | 'profile';
}

export default function DashboardHeader({ activePage = 'dashboard' }: Props) {
    const { data: session, status } = useSession();
    const isGuest = status === 'unauthenticated';

    return (
        <div className="dashboard-header">
            <div className="header-brand">
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', color: 'inherit' }}>
                    <MainLogo width={40} height={40} />
                    <h1>Chronicle<span>Hub</span></h1>
                </Link>
                {activePage === 'profile' && (
                    <>
                        <span style={{ color: 'var(--text-muted)' }}>/</span>
                        <span style={{ fontWeight: 'bold' }}>Settings</span>
                    </>
                )}
            </div>
            
            <div className="header-controls">
                <ThemeControls />
                {activePage === 'profile' && (
                    <Link 
                        href="/" 
                        className="return-button" 
                        style={{ 
                            width: 'auto', 
                            padding: '0.4rem 1rem', 
                            fontSize: '0.85rem', 
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <span>←</span> Exit
                    </Link>
                )}

                <Link href="/docs" className="header-link">Docs</Link>
                
                <div className="user-menu">
                    {isGuest ? (
                        <Link href="/login" className="login-link">Login</Link>
                    ) : (
                        <>
                            {activePage !== 'profile' && (
                                <Link 
                                    href="/profile" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                                    title="Profile Settings"
                                >
                                    <div style={{ 
                                        width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', 
                                        background: 'var(--bg-item)', border: '1px solid var(--border-color)',
                                        flexShrink: 0
                                    }}>
                                        {/* [FIX] Ensure src exists before rendering img tag */}
                                        {session?.user?.image ? (
                                            <img src={session.user.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>?</div>
                                        )}
                                    </div>
                                    <span className="user-email" style={{ fontWeight: 'bold' }}>
                                        {session?.user?.name || "Drifter"}
                                    </span>
                                </Link>
                            )}
                            
                            <button onClick={() => signOut({ callbackUrl: '/' })} className="logout-btn">
                                Log Out
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}