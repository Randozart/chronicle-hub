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
        console.log("Client: Verify Page Loaded. Token present:", !!token);
        
        if (!token) {
            console.error("Client: No token found in URL search params.");
            setStatus('error');
            return;
        }

        // Call the API to verify
        console.log("Client: Calling /api/auth/verify...");
        fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
        .then(async res => {
            console.log("Client: API Response Status:", res.status);
            const data = await res.json();
            if (data.success) {
                console.log("Client: Verification Successful!");
                setStatus('success');
                setTimeout(() => router.push('/login?verified=true'), 3000);
            } else {
                console.error("Client: Verification API returned error:", data.error);
                setStatus('error');
            }
        })
        .catch(err => {
            console.error("Client: Fetch error:", err);
            setStatus('error');
        });
    }, [token, router]);

    return (
        <div style={{ textAlign: 'center', background: '#1e1e1e', padding: '3rem', borderRadius: '12px', border: '1px solid #333', maxWidth: '400px', width: '100%' }}>
            <h1 style={{ marginTop: 0, color: '#fff', fontSize: '1.5rem' }}>Account Verification</h1>
            
            {status === 'loading' && (
                <div>
                    <p style={{ color: '#ccc' }}>Checking your credentials...</p>
                    <div className="loading-spinner" style={{ border: '3px solid #333', borderTop: '3px solid #61afef', borderRadius: '50%', width: '30px', height: '30px', margin: '1rem auto', animation: 'spin 1s linear infinite' }}></div>
                </div>
            )}
            
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
                    <p>The token may be invalid, expired, or the server could not be reached.</p>
                    <Link href="/login" style={{ display: 'inline-block', marginTop: '1rem', color: '#61afef', textDecoration: 'underline' }}>
                        Back to Login
                    </Link>
                </div>
            )}
            
            <style jsx>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
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