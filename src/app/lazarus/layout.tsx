'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LazarusLayout({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/lazarus/verify')
            .then(res => {
                if (res.ok) setAuthorized(true);
                else router.push('/');
            })
            .catch(() => router.push('/'));
    }, [router]);

    if (!authorized) {
        return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f13', color: '#666' }}>Authenticating Lazarus Protocol...</div>;
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f13', color: '#dcdfe4', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
                background: '#181a1f', borderBottom: '1px solid #282c34', padding: '1rem 2rem', 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#e5c07b', textTransform: 'uppercase', letterSpacing: '2px' }}>
                        Lazarus Project
                    </h1>
                    <span style={{ background: '#282c34', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#abb2bf' }}>BETA</span>
                </div>
                
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <Link href="/lazarus" style={{ color: '#61afef', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📂</span> All Archives
                    </Link>

                    <Link href="/lazarus/ingest" style={{ color: '#61afef', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none' }}>
                        + Ingest Data
                    </Link>
                    
                    <div style={{ width: '1px', height: '20px', background: '#333' }} />

                    <Link href="/" style={{ color: '#abb2bf', textDecoration: 'none', fontSize: '0.9rem' }}>
                        Back to Hub
                    </Link>
                </div>
            </div>
            <main style={{ flex: 1, padding: '2rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}