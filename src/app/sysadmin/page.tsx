'use client';

import { useState, useEffect } from 'react';
import SmartArea from '@/components/admin/SmartArea';

export default function SysAdminPage() {
    const [form, setForm] = useState({
        id: '',
        title: '',
        content: '',
        severity: 'info',
        enabled: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetch('/api/sysadmin/announcement')
            .then(res => {
                if (res.status === 403) throw new Error("Unauthorized");
                return res.json();
            })
            .then(data => {
                if (data && !data.error) {
                    setForm({
                        id: data.real_id || '',
                        title: data.title || '',
                        content: data.content || '',
                        severity: data.severity || 'info',
                        enabled: !!data.enabled
                    });
                }
            })
            .catch(e => setStatus(e.message))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setStatus('Saving...');
        try {
            const res = await fetch('/api/sysadmin/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) setStatus('Published Successfully');
            else setStatus('Error Saving');
        } catch (e) { console.error(e); setStatus('Network Error'); }
    };

    if (isLoading) return <div style={{padding:'2rem', color:'#ccc'}}>Checking credentials...</div>;
    if (status === 'Unauthorized') return <div style={{padding:'2rem', color:'red'}}>ACCESS DENIED. You are not the SysAdmin.</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '2rem', background: '#181a1f', border: '1px solid #333', borderRadius: '8px', color: '#ccc' }}>
            <h1 style={{ marginTop: 0, color: '#61afef', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>SysAdmin Console</h1>
            
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ color: '#fff' }}>Platform Announcement</h3>
                <p style={{ fontSize: '0.9rem', color: '#777', marginBottom: '1.5rem' }}>
                    This message appears on the Dashboard for ALL users.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="form-label">Message ID (Version)</label>
                        <input 
                            className="form-input" 
                            value={form.id} 
                            onChange={e => setForm({ ...form, id: e.target.value })} 
                            placeholder="e.g. patch-2.0"
                        />
                        <p style={{ fontSize: '0.75rem', color: '#e06c75', marginTop: '5px' }}>
                            Changing this ID forces the message to re-appear for everyone who dismissed it.
                        </p>
                    </div>
                    <div>
                        <label className="form-label">Severity</label>
                        <select 
                            className="form-select" 
                            value={form.severity} 
                            onChange={e => setForm({ ...form, severity: e.target.value })}
                        >
                            <option value="info">Info (Blue)</option>
                            <option value="warning">Warning (Yellow)</option>
                            <option value="critical">Critical (Red)</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Title</label>
                    <input 
                        className="form-input" 
                        value={form.title} 
                        onChange={e => setForm({ ...form, title: e.target.value })} 
                    />
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Content" 
                        value={form.content} 
                        onChange={v => setForm({ ...form, content: v })} 
                        storyId="sysadmin" // Dummy ID
                        minHeight="100px"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
                    <label className="toggle-label" style={{ fontSize: '1.1rem' }}>
                        <input 
                            type="checkbox" 
                            checked={form.enabled} 
                            onChange={e => setForm({ ...form, enabled: e.target.checked })} 
                        />
                        Is Active
                    </label>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>{status}</span>
                        <button onClick={handleSave} className="save-btn">Publish</button>
                    </div>
                </div>
            </div>
        </div>
    );
}