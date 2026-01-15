'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            router.push('/login?registered=true');
        } else {
            const data = await res.json();
            setError(data.message || 'Registration failed');
            setIsSubmitting(false);
        }
    } catch (err) {
        setError('An unexpected error occurred.');
        setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
        minHeight: '100vh', 
        background: '#121212', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'var(--font-main)' 
    }}>
      <form onSubmit={handleSubmit} style={{ 
          background: '#1e1e1e', 
          padding: '2.5rem', 
          borderRadius: '12px', 
          border: '1px solid #333', 
          width: '100%', 
          maxWidth: '400px', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)' 
      }}>
        <h1 style={{ marginTop: 0, color: '#fff', textAlign: 'center', fontSize: '1.8rem' }}>Join the Chronicle</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>Create your account</p>
        
        {error && (
            <div style={{ 
                background: 'rgba(231, 76, 60, 0.15)', 
                border: '1px solid #e74c3c', 
                color: '#ff6b6b', 
                padding: '0.75rem', 
                borderRadius: '6px', 
                marginBottom: '1.5rem', 
                fontSize: '0.9rem', 
                textAlign: 'center' 
            }}>
                {error}
            </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Username</label>
          <input 
            name="username"
            placeholder="Drifter"
            value={form.username}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: '#252525', 
                border: '1px solid #333', borderRadius: '6px', 
                color: 'white', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = '#61afef'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
          <input 
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: '#252525', 
                border: '1px solid #333', borderRadius: '6px', 
                color: 'white', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = '#61afef'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Password</label>
          <input 
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: '#252525', 
                border: '1px solid #333', borderRadius: '6px', 
                color: 'white', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = '#61afef'}
            onBlur={(e) => e.target.style.borderColor = '#333'}
          />
        </div>

        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
            Must contain: 8+ chars, Uppercase, Lowercase, Number.
        </div>

        <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
                width: '100%', padding: '0.8rem', 
                background: isSubmitting ? '#444' : '#2e7d32',
                color: 'white', border: 'none', borderRadius: '6px', 
                fontWeight: 'bold', cursor: isSubmitting ? 'wait' : 'pointer', 
                fontSize: '1rem', transition: 'background 0.2s' 
            }}
            onMouseOver={(e) => !isSubmitting && (e.currentTarget.style.background = '#388e3c')}
            onMouseOut={(e) => !isSubmitting && (e.currentTarget.style.background = '#2e7d32')}
        >
          {isSubmitting ? 'Creating Account...' : 'Register'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
            Already have an account? <Link href="/login" style={{ color: '#61afef', textDecoration: 'none' }}>Login</Link>
        </p>
      </form>
    </div>
  );
}