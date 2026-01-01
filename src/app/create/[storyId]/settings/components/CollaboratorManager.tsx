// src/app/create/[storyId]/settings/components/CollaboratorManager.tsx
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
                if (Array.isArray(data)) {
                    setList(data);
                } else {
                    setList([]);
                }
            })
            .catch(err => {
                console.error("Collaborator fetch error:", err);
                setList([]);
            });
    };

    useEffect(() => {
        fetchList();
    }, [storyId]);

    const handleInvite = async () => {
        if (!email) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/collaborators', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId, email, role: 'writer' })
            });
            
            if (res.ok) {
                setEmail("");
                fetchList(); 
                showToast("Invitation sent.", "success");
            } else {
                if (res.status === 403) {
                    showToast("Only the Owner can invite collaborators.", "error");
                } else {
                    const err = await res.json();
                    showToast(err.error || "Failed to invite", "error");
                }
            }
        } catch (e) {
            console.error(e);
            showToast("Network error.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove access?")) return;
        const res = await fetch(`/api/admin/collaborators?storyId=${storyId}&userId=${userId}`, { method: 'DELETE' });
        
        if (res.ok) {
            fetchList();
            showToast("Collaborator removed.", "info");
        } else if (res.status === 403) {
            showToast("Only the Owner can remove collaborators.", "error");
        }
    };

    return (
        <div className="special-field-group" style={{ borderColor: '#61afef' }}>
            <label className="special-label" style={{ color: '#61afef' }}>Collaborators</label>
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
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#2a3e5c' }}
                >
                    {isLoading ? "..." : "Invite"}
                </button>
            </div>

            <div style={{ display: 'grid', gap: '0.5rem' }}>
                {Array.isArray(list) && list.map((colab: any) => (
                    <div key={colab.userId} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#181a1f', padding: '0.5rem', borderRadius: '4px' }}>
                        <div style={{ flex: 1, color: '#ccc' }}>
                            {colab.userId.substring(0, 10)}... <span style={{ color: '#777', fontSize: '0.8rem' }}>({colab.role})</span>
                        </div>
                        <button 
                            onClick={() => handleRemove(colab.userId)} 
                            style={{ color: '#e06c75', background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Remove"
                        >✕</button>
                    </div>
                ))}
                {list.length === 0 && <p style={{ color: '#555', fontStyle: 'italic' }}>No collaborators yet.</p>}
            </div>
        </div>
    );
}