'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Add useSearchParams
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  // Check for URL messages (e.g. from registration redirect)
  const registered = searchParams.get('registered');
  const verified = searchParams.get('verified');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl: "/" });
    
    if (res?.error) {
        // Detect the specific error string from auth.ts
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
    <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1e1e1e', padding: '2.5rem', borderRadius: '12px', border: '1px solid #333', width: '100%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <h1 style={{ marginTop: 0, color: '#fff', textAlign: 'center', fontSize: '1.8rem' }}>Welcome Back</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>Enter the Chronicle</p>
        
        {/* SUCCESS MESSAGES */}
        {registered && <div style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>Account created! Check your email.</div>}
        {verified && <div style={{ background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>Email Verified! Please log in.</div>}

        {/* ERROR MESSAGES */}
        {error && (
            <div style={{ background: 'rgba(231, 76, 60, 0.2)', color: '#ff6b6b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>
                {error}
                {/* RESEND BUTTON inside error */}
                {error === "Email not verified." && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <button 
                            type="button" 
                            onClick={handleResend} 
                            disabled={isResending}
                            style={{ background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                            {isResending ? "Sending..." : "Resend Verification Link"}
                        </button>
                        {resendStatus && <div style={{ marginTop: '5px', color: '#fff' }}>{resendStatus}</div>}
                    </div>
                )}
            </div>
        )}

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