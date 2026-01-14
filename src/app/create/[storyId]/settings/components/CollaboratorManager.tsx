'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/providers/ToastProvider';

export default function CollaboratorManager({ storyId }: { storyId: string }) {
    const [email, setEmail] = useState("");
    const [list, setList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showToast } = useToast();

    const fetchList = () => {
        fetch(`/api/admin/collaborators?storyId=${storyId}`)
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 403) return []; 
                    throw new Error("Failed to load");
                }
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) setList(data);
                else setList([]);
            })
            .catch(err => {
                console.error("Collaborator fetch error:", err);
                setList([]);
            });
    };

    useEffect(() => { fetchList(); }, [storyId]);

    const handleInvite = async () => {
        if (!email) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/collaborators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, email, role: 'writer' })
            });
            const data = await res.json();

            if (res.ok) {
                setEmail("");
                if (data.collaborator) setList(prev => [...prev, data.collaborator]);
                else fetchList();
                showToast("Invitation sent.", "success");
            } else {
                showToast(data.error || "Failed to invite", "error");
            }
        } catch (e) {
            showToast("Network error.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove access?")) return;
        const res = await fetch(`/api/admin/collaborators?storyId=${storyId}&userId=${userId}`, { method: 'DELETE' });
        
        if (res.ok) {
            setList(prev => prev.filter(c => c.userId !== userId));
            showToast("Collaborator removed.", "info");
        } else if (res.status === 403) {
            showToast("Only the Owner can remove collaborators.", "error");
        }
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#555' }}>
            <label className="special-label" style={{ color: 'var(--tool-text-main)' }}>Collaborators</label>
            <p className="special-desc">Invite other users to help write this world.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem', marginTop: '1rem' }}>
                <input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="User Email" 
                    className="form-input" 
                />
                <button 
                    onClick={handleInvite} 
                    disabled={isLoading}
                    className="save-btn" 
                    style={{ padding: '0.5rem 1rem'}}
                >
                    {isLoading ? "..." : "Invite"}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Array.isArray(list) && list.map((colab: any) => (
                    <div key={colab.userId} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--tool-bg-input)', padding: '0.75rem', borderRadius: '4px' }}>
                        {/* Avatar */}
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#000', border: '1px solid var(--tool-border)', flexShrink: 0 }}>
                            {colab.image ? (
                                <img src={colab.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: '#555' }}>?</div>
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                            <div style={{ color: 'var(--tool-text-main)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {colab.username || "Drifter"} 
                                <span style={{ color: 'var(--tool-accent)', fontSize: '0.75rem', marginLeft: '6px', fontWeight: 'normal', textTransform: 'uppercase', border: '1px solid var(--tool-accent)', padding: '0 4px', borderRadius: '4px' }}>
                                    {colab.role}
                                </span>
                            </div>
                            <div style={{ color: 'var(--tool-text-dim)', fontSize: '0.8rem' }}>
                                {colab.email}
                            </div>
                        </div>

                        <button 
                            onClick={() => handleRemove(colab.userId)} 
                            style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 8px' }}
                            title="Remove"
                        >✕</button>
                    </div>
                ))}
                {list.length === 0 && <p style={{ color: '#555', fontStyle: 'italic' }}>No collaborators yet.</p>}
            </div>
        </div>
    );
}