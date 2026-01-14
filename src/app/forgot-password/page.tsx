'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message);
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong.');
            }
        } catch (e) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
            <div style={{ 
                background: 'var(--bg-panel)', 
                padding: '2.5rem', 
                borderRadius: 'var(--border-radius)', 
                border: '1px solid var(--border-color)', 
                width: '100%', 
                maxWidth: '400px', 
                boxShadow: 'var(--shadow-modal)' 
            }}>
                <h1 style={{ marginTop: 0, color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.8rem' }}>Forgot Password</h1>
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Enter your email to receive a reset link.
                </p>

                {status === 'success' ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ background: 'var(--success-bg)', color: 'var(--success-color)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid var(--success-color)' }}>
                            {message}
                        </div>
                        <Link href="/login" style={{ color: 'var(--accent-highlight)', textDecoration: 'none', fontWeight: 'bold' }}>
                            ← Back to Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {status === 'error' && (
                            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                                {message}
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                disabled={status === 'submitting'}
                                placeholder="you@example.com"
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
                            {status === 'submitting' ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <Link href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
                                Cancel
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}