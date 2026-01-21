'use client';
import { useEffect, useState } from 'react';
import GameModal from '@/components/GameModal';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [inspectData, setInspectData] = useState<any>(null); 

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
                                    {u.isBanned && <div style={{fontSize:'0.7rem', color: '#aaa'}}>{u.banReason}</div>}
                                </td>
                                <td style={{ padding: '1rem' }}>{/* Role Select (Same as before) */}</td>
                                <td style={{ padding: '1rem', display: 'flex', gap: '10px' }}>
                                    <button onClick={() => toggleBan(u)} style={{ background: u.isBanned ? '#98c379' : '#e06c75', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#000' }}>
                                        {u.isBanned ? "Unban" : "Suspend"}
                                    </button>
                                    <button onClick={() => inspectUser(u)} style={{ background: '#61afef', border:'none', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#000' }}>
                                        Inspect
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <GameModal 
                isOpen={!!inspectData} 
                title="User Inspection" 
                message={<pre style={{textAlign:'left', maxHeight:'400px', overflow:'auto', fontSize:'0.8rem'}}>{JSON.stringify(inspectData, null, 2)}</pre>}
                onClose={() => setInspectData(null)}
                onConfirm={() => setInspectData(null)}
                confirmLabel="Close"
                type="alert" 
            />
        </div>
    );
}