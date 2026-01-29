'use client';
import { useEffect, useState } from 'react';
import GameModal from '@/components/GameModal';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [inspectData, setInspectData] = useState<any>(null); 
    const [tagInput, setTagInput] = useState("");

    const fetchUsers = () => {
        fetch(`/api/sysadmin/users?search=${search}`).then(r => r.json()).then(setUsers);
    };

    useEffect(() => { fetchUsers(); }, []);

    const toggleBan = async (user: any) => {
        const action = user.isBanned ? "Unban" : "Ban";
        const reason = user.isBanned ? null : prompt("Reason for suspension?");
        if (user.isBanned || reason) {
            await fetch('/api/sysadmin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user._id, action: 'ban', role: !user.isBanned ? 'banned' : 'active', reason })
            });
            fetchUsers();
        }
    };

    const updateRole = async (user: any, newRole: string) => {
        if (!confirm(`Change role to ${newRole}?`)) return;
        await fetch('/api/sysadmin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user._id, role: newRole })
        });
        fetchUsers();
        setInspectData(null); 
    };

    const addTag = async () => {
        if (!tagInput || !inspectData) return;
        const currentTags = inspectData.accessTags || [];
        if (currentTags.includes(tagInput)) return;

        const newTags = [...currentTags, tagInput];
        await saveTags(newTags);
        setTagInput("");
    };

    const removeTag = async (tagToRemove: string) => {
        if (!inspectData) return;
        const newTags = (inspectData.accessTags || []).filter((t: string) => t !== tagToRemove);
        await saveTags(newTags);
    };

    const saveTags = async (tags: string[]) => {
        await fetch('/api/sysadmin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: inspectData._id, action: 'update_tags', tags })
        });
        setInspectData({ ...inspectData, accessTags: tags });
        fetchUsers(); 
    };
    
    const inspectUser = (user: any) => {
        setInspectData(user);
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <input className="form-input" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} />
                <button className="deck-button" onClick={fetchUsers}>Search</button>
            </div>

            <div style={{ overflowX: 'auto', background: '#21252b', borderRadius: '8px', border: '1px solid #333' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: '#181a1f', color: '#777' }}>
                            <th style={{ padding: '1rem' }}>User</th>
                            <th style={{ padding: '1rem' }}>Status</th>
                            <th style={{ padding: '1rem' }}>Role</th>
                            <th style={{ padding: '1rem' }}>Access Tags</th>
                            <th style={{ padding: '1rem' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u: any) => (
                            <tr key={u._id} style={{ borderTop: '1px solid #333', background: u.isBanned ? 'rgba(224, 108, 117, 0.1)' : 'transparent' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{u.username}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#777' }}>{u.email}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {u.isBanned ? <span style={{color: 'var(--danger-color)'}}>Suspended</span> : <span style={{color: 'var(--success-color)'}}>Active</span>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {u.roles?.includes('admin') || u.roles?.includes('owner') ? <span style={{color: '#e5c07b'}}>Admin</span> :
                                     u.roles?.includes('archivist') ? <span style={{color: '#61afef'}}>Archivist</span> :
                                     <span style={{color: '#777'}}>Writer</span>}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.75rem', color: '#aaa' }}>
                                    {(u.accessTags || []).slice(0, 3).join(', ')}
                                    {(u.accessTags || []).length > 3 && '...'}
                                </td>
                                <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                                    <button onClick={() => toggleBan(u)} style={{ background: u.isBanned ? '#98c379' : '#e06c75', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#000' }}>
                                        {u.isBanned ? "Unban" : "Suspend"}
                                    </button>
                                    <button onClick={() => inspectUser(u)} style={{ background: '#61afef', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#000' }}>
                                        Manage
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {inspectData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#21252b', padding: '2rem', borderRadius: '8px', border: '1px solid #444', width: '600px', maxWidth: '90vw' }}>
                        <h2 style={{ marginTop: 0, borderBottom: '1px solid #444', paddingBottom: '1rem' }}>Manage: {inspectData.username}</h2>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ color: '#aaa' }}>System Role</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => updateRole(inspectData, 'writer')} style={{ flex: 1, padding: '8px', background: '#333', border: '1px solid #555', color: '#ccc', cursor: 'pointer' }}>Standard</button>
                                <button onClick={() => updateRole(inspectData, 'archivist')} style={{ flex: 1, padding: '8px', background: 'rgba(97, 175, 239, 0.2)', border: '1px solid #61afef', color: '#61afef', cursor: 'pointer' }}>Archivist</button>
                                <button onClick={() => updateRole(inspectData, 'admin')} style={{ flex: 1, padding: '8px', background: 'rgba(229, 192, 123, 0.2)', border: '1px solid #e5c07b', color: '#e5c07b', cursor: 'pointer' }}>Admin</button>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#777', marginTop: '5px' }}>Archivists can access the Lazarus Tool globally.</p>
                        </div>

                        <div>
                            <h4 style={{ color: '#aaa' }}>World Access Tags</h4>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input 
                                    className="form-input" 
                                    placeholder="author:world_id" 
                                    value={tagInput} 
                                    onChange={e => setTagInput(e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button onClick={addTag} className="save-btn" style={{ padding: '0 1rem' }}>Add</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {(inspectData.accessTags || []).map((tag: string) => (
                                    <span key={tag} style={{ background: '#333', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #555' }}>
                                        {tag}
                                        <button onClick={() => removeTag(tag)} style={{ border: 'none', background: 'none', color: '#e06c75', cursor: 'pointer' }}>×</button>
                                    </span>
                                ))}
                                {(inspectData.accessTags || []).length === 0 && <span style={{ color: '#555', fontStyle: 'italic' }}>No specific access tags.</span>}
                            </div>
                        </div>

                        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
                            <button onClick={() => setInspectData(null)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}