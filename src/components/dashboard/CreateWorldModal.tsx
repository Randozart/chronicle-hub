'use client';
import { useState } from 'react';

export default function CreateWorldModal({ onClose }: { onClose: () => void }) {
    const [title, setTitle] = useState("");
    const [id, setId] = useState("");
    const [loading, setLoading] = useState(false);
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        setId(slug);
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
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
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', width: '400px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)' }}>Create New World</h3>
                
                <div className="form-group">
                    <label className="form-label">Title</label>
                    <input value={title} onChange={handleTitleChange} className="form-input" placeholder="My Epic RPG" autoFocus />
                </div>
                <div className="form-group">
                    <label className="form-label">ID (URL Safe)</label>
                    <input value={id} onChange={e => setId(e.target.value)} className="form-input" placeholder="my_epic_rpg" />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleCreate} disabled={loading || !id} className="save-btn" style={{ width: 'auto', padding: '0.5rem 1.5rem' }}>
                        {loading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}