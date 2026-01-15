'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirm) {
            setStatus('error');
            setMessage("Passwords do not match.");
            return;
        }

        if (!token) {
            setStatus('error');
            setMessage("Invalid or missing token.");
            return;
        }

        setStatus('submitting');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            if (res.ok) {
                router.push('/login?reset=true');
            } else {
                const data = await res.json();
                setStatus('error');
                setMessage(data.error || 'Failed to reset password.');
            }
        } catch (e) {
            setStatus('error');
            setMessage('Network error.');
        }
    };

    if (!token) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--danger-color)' }}>
                <p>Invalid link. Please check your email again.</p>
                <Link href="/login" style={{ color: 'var(--accent-highlight)' }}>Return to Login</Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ 
            background: 'var(--bg-panel)', 
            padding: '2.5rem', 
            borderRadius: 'var(--border-radius)', 
            border: '1px solid var(--border-color)', 
            width: '100%', 
            maxWidth: '400px', 
            boxShadow: 'var(--shadow-modal)' 
        }}>
            <h1 style={{ marginTop: 0, color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.8rem' }}>Reset Password</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Enter your new password below.</p>

            {status === 'error' && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                    {message}
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>New Password</label>
                <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    placeholder="New Password"
                    style={{ 
                        width: '100%', padding: '0.75rem', 
                        background: 'var(--bg-item)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '4px', 
                        color: 'var(--text-primary)', 
                        fontSize: '1rem' 
                    }} 
                />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Confirm Password</label>
                <input 
                    type="password" 
                    value={confirm} 
                    onChange={(e) => setConfirm(e.target.value)} 
                    required 
                    placeholder="Confirm Password"
                    style={{ 
                        width: '100%', padding: '0.75rem', 
                        background: 'var(--bg-item)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '4px', 
                        color: 'var(--text-primary)', 
                        fontSize: '1rem' 
                    }} 
                />
            </div>

            <button 
                type="submit" 
                disabled={status === 'submitting'}
                style={{ 
                    width: '100%', padding: '0.8rem', 
                    background: status === 'submitting' ? 'var(--border-color)' : 'var(--accent-primary)', 
                    color: '#fff', border: 'none', borderRadius: '4px', 
                    fontWeight: 'bold', cursor: status === 'submitting' ? 'wait' : 'pointer', 
                    fontSize: '1rem', transition: 'opacity 0.2s' 
                }}
            >
                {status === 'submitting' ? 'Updating...' : 'Set New Password'}
            </button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
            <Suspense fallback={<div style={{color:'var(--text-muted)'}}>Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}