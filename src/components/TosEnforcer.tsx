'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function TosEnforcer() {
    const { data: session, update, status } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [termsContent, setTermsContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            const hasAgreed = (session?.user as any)?.hasAgreedToTos;
            
            if (!hasAgreed) {
                fetch('/api/legal/tos')
                    .then(r => r.json())
                    .then(data => {
                        const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hermeticbard@gmail.com";
                        setTermsContent(data.content.replace('[EMAIL_VAR]', email));
                        setIsOpen(true);
                    });
            }
        }
    }, [status, session]);

    const handleAgree = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/user/agree-tos', { method: 'POST' });
            if (res.ok) {
                await update({ 
                    ...session, 
                    user: { ...session?.user, hasAgreedToTos: true } 
                });
                setIsOpen(false);
            }
        } catch (e) {
            console.error(e);
            alert("Network error. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-overlay)', backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                background: 'var(--bg-panel)',
                width: '90%', maxWidth: '800px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                borderRadius: 'var(--border-radius)', border: '1px solid var(--accent-highlight)',
                boxShadow: 'var(--shadow-modal)',
                color: 'var(--text-primary)'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--accent-highlight)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Terms of Service Update
                    </h2>
                    <p style={{ margin: '10px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Please review and accept our Terms of Service to continue using ChronicleHub.
                    </p>
                </div>

                <div className="terms-content" style={{ 
                    padding: '2rem', overflowY: 'auto', lineHeight: '1.6', 
                    color: 'var(--text-primary)', background: 'var(--bg-main)' 
                }}>
                    <ReactMarkdown>{termsContent}</ReactMarkdown>
                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-panel)' }}>
                    <button 
                        onClick={handleAgree}
                        disabled={isSubmitting}
                        className="option-button"
                        style={{ 
                            width: 'auto', padding: '0.8rem 2rem', 
                            fontSize: '1rem', fontWeight: 'bold',
                            border: '1px solid var(--success-color)',
                            background: 'var(--success-bg)',
                            color: 'var(--success-color)',
                            cursor: isSubmitting ? 'wait' : 'pointer',
                        }}
                    >
                        {isSubmitting ? "Updating..." : "I Agree to these Terms"}
                    </button>
                </div>
            </div>
            <style jsx global>{`
                .terms-content h1, .terms-content h2 { color: var(--text-header); margin-top: 1.5rem; font-size: 1.2rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
                .terms-content ul { padding-left: 1.5rem; }
                .terms-content li { margin-bottom: 0.5rem; }
                .terms-content strong { color: var(--accent-highlight); font-weight: bold; }
                .terms-content a { color: var(--accent-primary); text-decoration: underline; }
                .terms-content em { color: var(--warning-color); }
            `}</style>
        </div>
    );
}