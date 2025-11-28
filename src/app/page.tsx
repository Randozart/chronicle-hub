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

    if (status === 'loading' || !data) return <div className="p-8 text-white">Loading Dashboard...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', color: '#fff' }}>
            <h1 style={{ fontSize: '2rem', borderBottom: '1px solid #444', paddingBottom: '1rem', marginBottom: '2rem' }}>
                Chronicle Hub
            </h1>

            {/* MY WORLDS */}
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ color: '#98c379' }}>My Worlds</h2>
                    <button 
                        onClick={() => setShowCreate(true)}
                        className="save-btn" // Reuse your global button class
                        style={{ fontSize: '0.9rem' }}
                    >
                        + Create New
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {data.myWorlds.map((w: any) => (
                        <div key={w.worldId} style={{ background: '#1e2127', border: '1px solid #444', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{w.title}</h3>
                                <div style={{ fontSize: '0.8rem', color: '#777', fontFamily: 'monospace' }}>{w.worldId}</div>
                            </div>
                            <p style={{ color: '#ccc', fontSize: '0.9rem', flex: 1 }}>{w.summary || "No description."}</p>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Link href={`/play/${w.worldId}`} className="deck-button" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                                    Play
                                </Link>
                                <Link href={`/create/${w.worldId}/qualities`} className="unequip-btn" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', background: '#3e4451' }}>
                                    Edit
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* PLAYED WORLDS */}
            {data.playedWorlds.length > 0 && (
                <div>
                    <h2 style={{ color: '#61afef', marginBottom: '1rem' }}>Adventures</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {data.playedWorlds.map((w: any) => (
                            <div key={w.worldId} style={{ background: '#1e2127', border: '1px solid #444', borderRadius: '8px', padding: '1.5rem' }}>
                                <h3 style={{ margin: 0 }}>{w.title}</h3>
                                <Link href={`/play/${w.worldId}`} className="deck-button" style={{ display: 'block', marginTop: '1rem', textAlign: 'center', textDecoration: 'none' }}>
                                    Continue
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {showCreate && <CreateWorldModal onClose={() => setShowCreate(false)} />}
        </div>
    );
}

function CreateWorldModal({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [id, setId] = useState("");
    
    const handleCreate = async () => {
        const res = await fetch('/api/worlds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, worldId: id })
        });
        const data = await res.json();
        if (res.ok) {
            window.location.href = `/create/${data.worldId}/settings`; // Redirect to editor
        } else {
            alert(data.error);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', width: '400px', border: '1px solid #444' }}>
                <h3 style={{ margin: '0 0 1.5rem 0' }}>Create New World</h3>
                
                <div className="form-group">
                    <label className="form-label">Title</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="form-input" placeholder="My Epic RPG" />
                </div>
                
                <div className="form-group">
                    <label className="form-label">ID (URL Safe)</label>
                    <input value={id} onChange={e => setId(e.target.value)} className="form-input" placeholder="my_epic_rpg" />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleCreate} className="save-btn">Create</button>
                </div>
            </div>
        </div>
    );
}