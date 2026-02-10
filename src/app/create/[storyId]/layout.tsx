'use client'; 
import Link from 'next/link';
import CheatSheet from '@/components/admin/CheatSheet';
import AdminSidebarFooter from '@/components/admin/AdminSidebarFooter';
import { ToastProvider, useToast } from '@/providers/ToastProvider';
import { useEffect, useState, use } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import RefactorModal from '@/components/admin/RefactorModal'; 
import { CreatorProvider } from '@/providers/CreatorProvider';

const RefactorIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

export default function AdminLayout({ children, params }: { children: React.ReactNode, params: Promise<{ storyId: string }> }) {
    const { storyId } = use(params);
    return (
        <ToastProvider>
            <InnerLayout storyId={storyId}>
                {children}
            </InnerLayout>
        </ToastProvider>
    );
}

// Separated inner layout to use Toast context
function InnerLayout({ children, storyId }: { children: React.ReactNode, storyId: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { showToast } = useToast();
    const [showNav, setShowNav] = useState(false);
    const [showHelp, setShowHelp] = useState(false);    
    const [showRefactor, setShowRefactor] = useState(false);
    
    // Role State
    const [role, setRole] = useState<'owner' | 'writer' | 'reader' | null>(null);

    // Enhanced Security Check
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch(`/api/admin/verify?storyId=${storyId}`);
                if (!res.ok) {
                    router.push('/'); 
                    return;
                }
                const data = await res.json();
                setRole(data.role || 'reader');
            } catch (e) {
                console.error("Auth check failed", e);
                router.push('/');
            }
        };
        checkAccess();
    }, [storyId, router]);

    useEffect(() => {
        setShowNav(false);
        setShowHelp(false);
    }, [pathname]);

    // Global Shortcut Handler with Read-Only Guard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation(); 
                
                if (role === 'reader') {
                    showToast("Read Only Mode: Cannot Save", "info");
                    return;
                }

                window.dispatchEvent(new Event('global-save-trigger'));
            }
        };
        
        // Only attach if role is loaded
        if (role) {
            window.addEventListener('keydown', handleKeyDown, { capture: true });
        }
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [role, showToast]);

    const base = `/create/${storyId}`;
    
    if (!role) {
        return (
            <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e0e', color: '#666' }}>
                Verifying Access...
            </div>
        );
    }

    return (
        // Wrap everything in CreatorProvider
        <CreatorProvider storyId={storyId} initialRole={role}>
            {showRefactor && (
                <RefactorModal 
                    isOpen={showRefactor}
                    onClose={() => setShowRefactor(false)}
                    storyId={storyId}
                    currentId="" 
                    onSuccess={() => window.location.reload()} 
                />
            )}
            <div className="admin-layout" style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="admin-mobile-topbar" style={{ flexShrink: 0 }}>
                    <button className="admin-mobile-btn" onClick={() => setShowNav(true)}>☰</button>
                    <span className="admin-mobile-title">Creator Studio {role === 'reader' && '(Read Only)'}</span>
                    <button className="admin-mobile-btn" onClick={() => setShowHelp(true)}>?</button>
                </div>

                {(showNav || showHelp) && (
                    <div className="admin-mobile-backdrop" onClick={() => { setShowNav(false); setShowHelp(false); }} />
                )}

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    
                    <aside className={`admin-sidebar ${showNav ? 'mobile-open' : ''}`} style={{ flexShrink: 0 }}>
                        <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Creator Studio
                            <button className="mobile-close-btn" onClick={() => setShowNav(false)} style={{ display: showNav ? 'block' : 'none' }}>✕</button>
                        </div>
                        
                        {role === 'reader' && (
                            <div style={{ background: 'var(--tool-bg-input)', color: 'var(--tool-text-dim)', fontSize: '0.75rem', padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--tool-border)' }}>
                                Read Only Mode
                            </div>
                        )}

                        <nav className="admin-nav" style={{ overflowY: 'auto', flex: 1 }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                <li style={{ marginBottom: '1rem', padding: '0 1rem' }}>
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

                                {role !== 'reader' && (
                                    <li style={{ marginBottom: '1rem', padding: '0 1rem' }}>
                                        <button 
                                            onClick={() => setShowRefactor(true)}
                                            className="admin-link"
                                            style={{
                                                width: '100%',
                                                backgroundColor: 'var(--tool-bg-input)',
                                                border: '1px solid var(--tool-border)',
                                                color: 'var(--tool-text-main)',
                                                textAlign: 'left',
                                                display: 'flex', alignItems: 'center',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <RefactorIcon /> Refactor ID...
                                        </button>
                                    </li>
                                )}

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
                                <AdminLink href={`${base}/composer`} label="Image Composer" />
                                <AdminLink href={`${base}/audio`} label="Audio Engine" />
                                <AdminLink href={`${base}/assets`} label="Asset Manager" />
                                <SectionHeader label="Tools & Live" />
                                <AdminLink href={`${base}/graph`} label="Narrative Graph" />
                                <AdminLink href={`${base}/players`} label="Player Monitor" />
                                <AdminLink href={`${base}/world-state`} label="GM Console" />
                            </ul>
                        </nav>
                        <AdminSidebarFooter />
                    </aside>

                    <main className="admin-main" style={{ display: 'flex', flexDirection: 'row', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div className="admin-content-wrapper" style={{ flex: 1, overflowY: 'auto', height: '100%', position: 'relative' }}>
                            {children}
                        </div>

                        <aside className={`admin-help-sidebar ${showHelp ? 'mobile-open' : ''}`} style={{ borderLeft: '1px solid var(--tool-border)', background: 'var(--tool-bg-sidebar)', zIndex: 30, flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--tool-bg-header)', borderBottom: '1px solid var(--tool-border)' }} className="admin-mobile-only-header">
                                <span style={{fontWeight:'bold'}}>Reference</span>
                                <button className="mobile-close-btn" onClick={() => setShowHelp(false)}>✕</button>
                            </div>
                            <CheatSheet />
                        </aside>
                    </main>
                </div>
            </div>
        </CreatorProvider>
    );
}

function AdminLink({ href, label }: { href: string, label: string }) {
    return <li><Link href={href} className="admin-link">{label}</Link></li>;
}

function SectionHeader({ label }: { label: string }) {
    return <li style={{ margin: '1.5rem 0 0.5rem 1.2rem', fontSize: '0.7rem', textTransform: 'uppercase', color: '#5c6370', fontWeight: 'bold', letterSpacing: '1px', userSelect: 'none' }}>{label}</li>;
}