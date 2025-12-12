'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }

        // Call the API to verify
        fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                setStatus('success');
                // Redirect to login after 3 seconds
                setTimeout(() => router.push('/login?verified=true'), 3000);
            } else {
                setStatus('error');
            }
        })
        .catch(() => setStatus('error'));
    }, [token, router]);

    return (
        <div style={{ textAlign: 'center', background: '#1e1e1e', padding: '3rem', borderRadius: '12px', border: '1px solid #333', maxWidth: '400px', width: '100%' }}>
            <h1 style={{ marginTop: 0, color: '#fff', fontSize: '1.5rem' }}>Verifying...</h1>
            
            {status === 'loading' && <p style={{ color: '#ccc' }}>Checking your credentials...</p>}
            
            {status === 'success' && (
                <div style={{ color: '#2ecc71' }}>
                    <h2 style={{ fontSize: '1.2rem' }}>Success!</h2>
                    <p>Your email has been verified.</p>
                    <p style={{ fontSize: '0.9rem', color: '#888' }}>Redirecting to login...</p>
                    <Link href="/login" style={{ display: 'inline-block', marginTop: '1rem', color: '#61afef', textDecoration: 'underline' }}>
                        Go to Login now
                    </Link>
                </div>
            )}

            {status === 'error' && (
                <div style={{ color: '#e74c3c' }}>
                    <h2 style={{ fontSize: '1.2rem' }}>Verification Failed</h2>
                    <p>The token may be invalid or expired.</p>
                    <Link href="/login" style={{ display: 'inline-block', marginTop: '1rem', color: '#61afef', textDecoration: 'underline' }}>
                        Back to Login
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-main)' }}>
            <Suspense fallback={<div style={{color:'#ccc'}}>Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}