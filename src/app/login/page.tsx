'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl: "/" });
    if (res?.error) setError('Invalid email or password.');
    else router.push('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1e1e1e', padding: '2.5rem', borderRadius: '12px', border: '1px solid #333', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <h1 style={{ marginTop: 0, color: '#fff', textAlign: 'center', fontSize: '1.8rem' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>Enter the Chronicle</p>
        
        {error && <div style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff6b6b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#252525', border: '1px solid #333', borderRadius: '6px', color: 'white', fontSize: '1rem' }} />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '0.75rem', background: '#252525', border: '1px solid #333', borderRadius: '6px', color: 'white', fontSize: '1rem' }} />
        </div>

        <button type="submit" style={{ width: '100%', padding: '0.8rem', background: '#61afef', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', transition: 'background 0.2s' }}>
          Login
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
            Need an account? <Link href="/register" style={{ color: '#61afef', textDecoration: 'none' }}>Register</Link>
        </p>
      </form>
    </div>
  );
}