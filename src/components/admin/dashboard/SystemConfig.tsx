'use client';

import { useState, useEffect } from 'react';
import SmartArea from '@/components/admin/SmartArea';

export default function SystemConfig() {
    const [announcementForm, setAnnouncementForm] = useState({
        id: '', title: '', content: '', severity: 'info', enabled: false
    });
    
    const [tosContent, setTosContent] = useState('');

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
                    setAnnouncementForm({
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

        // Fetch ToS
        fetch('/api/legal/tos')
            .then(res => res.json())
            .then(data => setTosContent(data.content))
            .catch(console.error);
    }, []);

    const handleSaveAnnouncement = async () => {
        setStatus('Saving Announcement...');
        try {
            const res = await fetch('/api/sysadmin/announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementForm)
            });
            if (res.ok) setStatus('Announcement Published');
            else setStatus('Error Saving Announcement');
        } catch (e) { console.error(e); setStatus('Network Error'); }
    };

    const handleSaveTos = async () => {
        setStatus('Saving ToS...');
        try {
            const res = await fetch('/api/sysadmin/tos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: tosContent })
            });
            if (res.ok) setStatus('ToS Updated');
            else setStatus('Error Saving ToS');
        } catch (e) { console.error(e); setStatus('Network Error'); }
    };

    if (isLoading) return <div style={{padding:'2rem', color:'#ccc'}}>Checking configuration...</div>;
    if (status === 'Unauthorized') return <div style={{padding:'2rem', color:'var(--danger-color)'}}>ACCESS DENIED.</div>;

    return (
        <div>
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: '#fff', borderLeft: '4px solid #c678dd', paddingLeft: '10px', margin: 0 }}>Platform Announcement</h3>
                    <span style={{ color: status.includes('Error') ? '#e06c75' : '#98c379', fontWeight: 'bold', fontSize: '0.9rem' }}>{status}</span>
                </div>
                
                <p style={{ fontSize: '0.9rem', color: '#777', marginBottom: '1.5rem' }}>
                    This message appears on the Dashboard for ALL users.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label className="form-label">Message ID (Version)</label>
                        <input 
                            className="form-input" 
                            value={announcementForm.id} 
                            onChange={e => setAnnouncementForm({ ...announcementForm, id: e.target.value })} 
                            placeholder="e.g. patch-2.0"
                        />
                    </div>
                    <div>
                        <label className="form-label">Severity</label>
                        <select 
                            className="form-select" 
                            value={announcementForm.severity} 
                            onChange={e => setAnnouncementForm({ ...announcementForm, severity: e.target.value })}
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
                        value={announcementForm.title} 
                        onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} 
                    />
                </div>

                <div className="form-group">
                    <SmartArea 
                        label="Content" 
                        value={announcementForm.content} 
                        onChange={v => setAnnouncementForm({ ...announcementForm, content: v })} 
                        storyId="sysadmin"
                        minHeight="100px"
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                    <label className="toggle-label" style={{ fontSize: '1rem' }}>
                        <input 
                            type="checkbox" 
                            checked={announcementForm.enabled} 
                            onChange={e => setAnnouncementForm({ ...announcementForm, enabled: e.target.checked })} 
                        />
                        Announcement Active
                    </label>
                    <button onClick={handleSaveAnnouncement} className="save-btn">Publish Announcement</button>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #333', paddingTop: '2rem' }}>
                <h3 style={{ color: '#fff', borderLeft: '4px solid #e5c07b', paddingLeft: '10px' }}>Legal: Terms of Service</h3>
                <p style={{ fontSize: '0.9rem', color: '#777', marginBottom: '1.5rem' }}>
                    This text is displayed in the Registration modal. Use Markdown.
                </p>
                
                <div className="form-group">
                    <textarea 
                        className="form-textarea" 
                        value={tosContent}
                        onChange={(e) => setTosContent(e.target.value)}
                        rows={15}
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.4' }}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button onClick={handleSaveTos} className="save-btn" style={{ backgroundColor: '#e5c07b', color: '#000' }}>
                        Update Terms
                    </button>
                </div>
            </div>
        </div>
    );
}