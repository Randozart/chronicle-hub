'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/providers/ToastProvider';
import ImagePickerModal from '@/components/dashboard/ImagePickerModal';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function ProfilePage() {
    const { data: session, update: updateSession } = useSession();
    const { showToast } = useToast();
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [username, setUsername] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [password, setPassword] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    
    const [showPicker, setShowPicker] = useState(false);

    const [dob, setDob] = useState("");

    useEffect(() => {
        fetch('/api/user/profile')
            .then(res => res.json())
            .then(data => {
                if (data.username) setUsername(data.username);
                if (data.image) setImage(data.image);
                if (data.dob) setDob(data.dob.split('T')[0]);
            })
            .catch(() => showToast("Failed to load profile", "error"))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        if (password && password !== confirmPass) {
            showToast("Passwords do not match", "error");
            return;
        }
        
        setIsSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    image, 
                    password: password || undefined, 
                    dob: dob || null 
                })
            });

            if (res.ok) {
                showToast("Profile updated!", "success");
                setPassword("");
                setConfirmPass("");
                await updateSession({ user: { name: username, image } });
            } else {
                const err = await res.json();
                showToast(err.error || "Update failed", "error");
            }
        } catch (e) {
            showToast("Network error", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="loading-container">Loading Profile...</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'var(--font-main)' }}>
            <DashboardHeader activePage="profile" />

            <div className="dashboard-content">
                <div className="dashboard-container" style={{ maxWidth: '800px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                        <div className="action-box" style={{ textAlign: 'center', height: 'fit-content' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Public Identity</h3>
                            
                            <div 
                                style={{ 
                                    width: '150px', height: '150px', margin: '0 auto 1.5rem auto',
                                    borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--accent-primary)',
                                    cursor: 'pointer', position: 'relative', background: '#000'
                                }}
                                onClick={() => setShowPicker(true)}
                                className="group"
                            >
                                {image ? (
                                    <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#555' }}>?</div>
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: 'white', fontWeight: 'bold' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0'}>
                                    Change
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Display Name</label>
                                <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} style={{ textAlign: 'center', fontWeight: 'bold' }} />
                            </div>
                            
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>This is visible to collaborators and in credits.</p>
                        </div>

                        
                        <div className="storylet-container" style={{ margin: 0 }}>
                            <div className="form-group">
                                <label className="form-label">Date of Birth</label>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={dob} 
                                    onChange={e => setDob(e.target.value)} 
                                    style={{ textAlign: 'center' }} 
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required for Mature (16+) content.</p>
                            </div>
                            <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Account Security</h2>
                            
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input className="form-input" value={session?.user?.email || ""} disabled style={{ color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0', paddingTop: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Change Password</h3>
                                
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input type="password" className="form-input" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm new password" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                                <button onClick={handleSave} disabled={isSaving} className="deck-button" style={{ width: 'auto', padding: '0.8rem 2rem' }}>
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {showPicker && <ImagePickerModal onSelect={setImage} onClose={() => setShowPicker(false)} />}
        </div>
    );
}