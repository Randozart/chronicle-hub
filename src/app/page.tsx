'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [data, setData] = useState<{ myWorlds: any[], playedWorlds: any[] } | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login');
        if (status === 'authenticated') {
            fetch('/api/worlds').then(r => r.json()).then(setData);
        }
    }, [status, router]);

    if (status === 'loading' || !data) return (
        <div style={{ background: '#181a1f', height: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#555', fontStyle: 'italic' }}>Loading Studio...</span>
        </div>
    );

    return (
        <div className="admin-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            
            {/* TOP BAR (Studio Style) */}
            <div style={{ background: '#21252b', borderBottom: '1px solid #181a1f', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '24px', height: '24px', background: '#61afef', borderRadius: '4px' }} /> {/* Logo Placeholder */}
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: '#d7dae0' }}>Chronicle Hub</h1>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#abb2bf' }}>{session?.user?.email}</span>
                    <button onClick={() => { /* SignOut */ }} style={{ background: 'none', border: 'none', color: '#e06c75', cursor: 'pointer', fontSize: '0.9rem' }}>Log Out</button>
                </div>
            </div>

            {/* MAIN WORKSPACE */}
            <div style={{ flex: 1, padding: '3rem', overflowY: 'auto', background: '#181a1f' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    
                    {/* MY PROJECTS HEADER */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: 0 }}>My Projects</h2>
                        <button 
                            onClick={() => setShowCreate(true)}
                            className="new-btn" // Reusing your admin link style class
                            style={{ background: '#2c313a', color: '#98c379', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #333' }}
                        >
                            + New Project
                        </button>
                    </div>

                    {/* PROJECTS GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
                        {data.myWorlds.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '4rem', border: '2px dashed #333', borderRadius: '8px', textAlign: 'center', color: '#555' }}>
                                No projects found. Create one to get started.
                            </div>
                        )}

                        {data.myWorlds.map((w: any) => (
                            <div key={w.worldId} style={{ background: '#21252b', border: '1px solid #181a1f', borderRadius: '6px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.1s', cursor: 'default' }} className="hover:border-[#61afef]">
                                <div style={{ padding: '1.5rem', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#d7dae0' }}>{w.title}</h3>
                                        {w.published && <span style={{ fontSize: '0.7rem', background: '#2ecc71', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>LIVE</span>}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#5c6370', fontFamily: 'monospace', marginBottom: '1rem' }}>{w.worldId}</div>
                                    <p style={{ fontSize: '0.9rem', color: '#abb2bf', lineHeight: 1.5, margin: 0 }}>
                                        {w.summary || "No description."}
                                    </p>
                                </div>
                                <div style={{ background: '#282c34', padding: '0.75rem 1.5rem', borderTop: '1px solid #181a1f', display: 'flex', gap: '1rem' }}>
                                    <Link href={`/create/${w.worldId}/settings`} style={{ color: '#61afef', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold' }}>Edit World</Link>
                                    <Link href={`/play/${w.worldId}`} style={{ color: '#98c379', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold' }}>Play</Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ADVENTURES SECTION */}
                    {data.playedWorlds.length > 0 && (
                        <>
                            <h2 style={{ fontSize: '1.5rem', color: '#fff', margin: '0 0 2rem 0', borderTop: '1px solid #333', paddingTop: '2rem' }}>Recent Adventures</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {data.playedWorlds.map((w: any) => (
                                    <Link key={w.worldId} href={`/play/${w.worldId}`} style={{ textDecoration: 'none' }}>
                                        <div style={{ background: '#21252b', padding: '1rem', borderRadius: '6px', border: '1px solid #181a1f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} className="hover:bg-[#2c313a]">
                                            <div>
                                                <div style={{ color: '#d7dae0', fontWeight: 'bold' }}>{w.title}</div>
                                                <div style={{ color: '#5c6370', fontSize: '0.8rem' }}>{w.worldId}</div>
                                            </div>
                                            <span style={{ color: '#98c379' }}>►</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CREATE MODAL (Studio Style) */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#21252b', border: '1px solid #181a1f', borderRadius: '8px', width: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid #181a1f' }}>
                            <h3 style={{ margin: 0, color: '#fff' }}>Create New Project</h3>
                        </div>
                        <div style={{ padding: '2rem' }}>
                            <CreateWorldForm onClose={() => setShowCreate(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CreateWorldForm({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [id, setId] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Auto-generate ID from title
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        setId(slug);
    };

    const handleCreate = async () => {
        setLoading(true);
        const res = await fetch('/api/worlds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, worldId: id })
        });
        const data = await res.json();
        if (res.ok) {
            window.location.href = `/create/${data.worldId}/settings`;
        } else {
            alert(data.error);
            setLoading(false);
        }
    };

    return (
        <>
            <div className="form-group">
                <label className="form-label">World Title</label>
                <input value={title} onChange={handleTitleChange} className="form-input" placeholder="My Epic RPG" autoFocus />
            </div>
            <div className="form-group">
                <label className="form-label">Project ID</label>
                <input value={id} onChange={e => setId(e.target.value)} className="form-input" placeholder="my_epic_rpg" />
                <p style={{ fontSize: '0.75rem', color: '#5c6370', marginTop: '0.25rem' }}>This will be your URL: /play/{id || '...'}</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#abb2bf', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCreate} disabled={loading || !id} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                    {loading ? 'Creating...' : 'Create Project'}
                </button>
            </div>
        </>
    );
}