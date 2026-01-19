'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
    const [terms, setTerms] = useState("Loading terms...");

    useEffect(() => {
        if (isOpen) {
            fetch('/api/legal/tos')
                .then(res => res.json())
                .then(data => {
                    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "admin@chroniclehub.com";
                    const cleanText = data.content.replace('[EMAIL_VAR]', email);
                    setTerms(cleanText);
                })
                .catch(() => setTerms("Failed to load Terms of Service."));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: 'var(--bg-panel)',
                width: '90%', maxWidth: '800px',
                maxHeight: '85vh',
                display: 'flex', flexDirection: 'column',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Terms of Service</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>
                
                <div className="terms-content" style={{ padding: '2rem', overflowY: 'auto', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                    <ReactMarkdown>{terms}</ReactMarkdown>
                </div>
                
                <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border-color)', textAlign: 'right' }}>
                    <button 
                        onClick={onClose}
                        className="option-button" 
                        style={{ width: 'auto', padding: '0.6rem 2rem' }}
                    >
                        Close
                    </button>
                </div>
            </div>
            
            <style jsx global>{`
                .terms-content h1, .terms-content h2 { color: var(--accent-highlight); margin-top: 1.5rem; }
                .terms-content h1 { border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem; }
                .terms-content ul { padding-left: 1.5rem; }
                .terms-content li { margin-bottom: 0.5rem; }
                .terms-content strong { color: var(--text-primary); }
            `}</style>
        </div>
    );
}