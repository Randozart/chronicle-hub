'use client';
import { useEffect, useState } from 'react';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");

    const fetchUsers = () => {
        fetch(`/api/sysadmin/users?search=${search}`)
            .then(r => r.json())
            .then(setUsers);
    };

    useEffect(() => { fetchUsers(); }, []);

    const updateRole = async (userId: string, role: string) => {
        if (!confirm(`Change this user's role to ${role}?`)) return;
        await fetch('/api/sysadmin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role })
        });
        fetchUsers();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                <input 
                    className="form-input" 
                    placeholder="Search username or email..." 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                />
                <button className="deck-button" onClick={fetchUsers}>Search</button>
            </div>

            <div style={{ overflowX: 'auto', background: '#21252b', borderRadius: '8px', border: '1px solid #333' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', background: '#181a1f', color: '#777' }}>
                            <th style={{ padding: '1rem' }}>User</th>
                            <th style={{ padding: '1rem' }}>Joined</th>
                            <th style={{ padding: '1rem' }}>Storage</th>
                            <th style={{ padding: '1rem' }}>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u: any) => {
                            const mbUsed = ((u.storageUsage || 0) / 1024 / 1024).toFixed(2);
                            const roles = u.roles || [];
                            let currentRole = 'scribe';
                            if (roles.includes('owner')) currentRole = 'owner';
                            else if (roles.includes('admin')) currentRole = 'admin';
                            else if (roles.includes('archivist')) currentRole = 'archivist';
                            else if (roles.includes('premium')) currentRole = 'illuminator';

                            return (
                                <tr key={u._id} style={{ borderTop: '1px solid #333' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{u.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#777' }}>{u.email}</div>
                                        {u.emailVerified && <span style={{fontSize:'0.7rem', color:'var(--success-color)'}}>✓ Verified</span>}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#ccc' }}>
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#ccc' }}>{mbUsed} MB</td>
                                    <td style={{ padding: '1rem' }}>
                                        <select 
                                            className="form-select"
                                            value={currentRole}
                                            onChange={(e) => updateRole(u._id, e.target.value)}
                                            style={{ padding: '0.3rem', fontSize: '0.85rem' }}
                                            disabled={currentRole === 'owner'}
                                        >
                                            <option value="scribe">Scribe</option>
                                            <option value="illuminator">Illuminator</option>
                                            <option value="archivist">Archivist</option>
                                            <option value="admin">Admin</option>
                                            <option value="owner" disabled>Owner</option>
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}