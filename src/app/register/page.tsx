'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TermsModal from '@/components/TermsModal';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!agreed) {
        setError("You must agree to the Terms of Service.");
        return;
    }

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
        background: 'var(--bg-main)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'var(--font-main)' 
    }}>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      
      <form onSubmit={handleSubmit} style={{ 
          background: 'var(--bg-panel)', 
          padding: '2.5rem', 
          borderRadius: 'var(--border-radius)', 
          border: '1px solid var(--border-color)', 
          width: '100%', 
          maxWidth: '400px', 
          boxShadow: 'var(--shadow-modal)' 
      }}>
        <h1 style={{ marginTop: 0, color: 'var(--text-primary)', textAlign: 'center', fontSize: '1.8rem' }}>Join the Chronicle</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '2rem' }}>Create your account</p>
        
        {error && (
            <div style={{ 
                background: 'var(--danger-bg)', 
                border: '1px solid var(--danger-color)', 
                color: 'var(--danger-color)', 
                padding: '0.75rem', 
                borderRadius: '4px', 
                marginBottom: '1.5rem', 
                fontSize: '0.9rem', 
                textAlign: 'center' 
            }}>
                {error}
            </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Username</label>
          <input 
            name="username"
            placeholder="Drifter"
            value={form.username}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: 'var(--bg-item)', 
                border: '1px solid var(--border-color)', borderRadius: '4px', 
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-highlight)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</label>
          <input 
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: 'var(--bg-item)', 
                border: '1px solid var(--border-color)', borderRadius: '4px', 
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-highlight)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Password</label>
          <input 
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            required 
            style={{ 
                width: '100%', padding: '0.75rem', background: 'var(--bg-item)', 
                border: '1px solid var(--border-color)', borderRadius: '4px', 
                color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' 
            }} 
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-highlight)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
        
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input 
                type="checkbox" 
                id="tos-agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: '3px' }}
            />
            <label htmlFor="tos-agree" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                I have read and agree to the <span onClick={(e) => { e.preventDefault(); setShowTerms(true); }} style={{ color: 'var(--accent-highlight)', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>.
            </label>
        </div>

        <button 
            type="submit" 
            disabled={isSubmitting || !agreed}
            style={{ 
                width: '100%', padding: '0.8rem', 
                background: (isSubmitting || !agreed) ? 'var(--border-color)' : 'var(--success-color)', 
                color: '#fff', border: 'none', borderRadius: '4px', 
                fontWeight: 'bold', cursor: (isSubmitting || !agreed) ? 'not-allowed' : 'pointer', 
                fontSize: '1rem', transition: 'background 0.2s' 
            }}
        >
          {isSubmitting ? 'Creating Account...' : 'Register'}
        </button>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--accent-highlight)', textDecoration: 'none' }}>Login</Link>
        </p>
      </form>
    </div>
  );
}