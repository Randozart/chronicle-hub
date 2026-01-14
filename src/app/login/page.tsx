'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  const registered = searchParams.get('registered');
  const verified = searchParams.get('verified');
  const reset = searchParams.get('reset');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl: "/" });
    
    if (res?.error) {
        if (res.error.includes("Email not verified")) {
            setError("Email not verified.");
        } else {
            setError('Invalid email or password.');
        }
    } else {
        router.push('/');
    }
  };

  const handleResend = async () => {
      if (!email) return;
      setIsResending(true);
      try {
          const res = await fetch('/api/auth/resend', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
          });
          setResendStatus("Email sent!");
      } catch (e) {
          setResendStatus("Error sending.");
      } finally {
          setIsResending(false);
      }
  };

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
        <h1 style={{ marginTop: 0, color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.8rem' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Enter the Chronicle</p>
        
        {/* SUCCESS MESSAGES */}
        {registered && <div style={{ background: 'var(--success-bg)', color: 'var(--success-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid var(--success-color)' }}>Account created! Check your email.</div>}
        {verified && <div style={{ background: 'var(--success-bg)', color: 'var(--success-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid var(--success-color)' }}>Email Verified! Please log in.</div>}
        {reset && <div style={{ background: 'var(--success-bg)', color: 'var(--success-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', border: '1px solid var(--success-color)' }}>Password reset successful.</div>}

        {/* ERROR MESSAGES */}
        {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
                {error}
                {error === "Email not verified." && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <button 
                            type="button" 
                            onClick={handleResend} 
                            disabled={isResending}
                            style={{ background: 'transparent', border: '1px solid var(--danger-color)', color: 'inherit', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginTop: '5px' }}
                        >
                            {isResending ? "Sending..." : "Resend Verification Link"}
                        </button>
                        {resendStatus && <div style={{ marginTop: '5px', color: 'var(--text-primary)' }}>{resendStatus}</div>}
                    </div>
                )}
            </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Password</label>
            <Link href="/forgot-password" style={{ color: 'var(--accent-highlight)', fontSize: '0.8rem', textDecoration: 'none' }}>Forgot?</Link>
          </div>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
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

        <button type="submit" style={{ width: '100%', padding: '0.8rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'opacity 0.2s' }}>
          Login
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Need an account? <Link href="/register" style={{ color: 'var(--accent-highlight)', textDecoration: 'none' }}>Register</Link>
        </p>
      </form>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
      <Suspense fallback={<div style={{color:'var(--text-muted)'}}>Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}