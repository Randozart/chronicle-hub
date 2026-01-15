'use client';
import React, { useEffect } from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = 'info',
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter') onConfirm();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onConfirm, onCancel]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0.85))',
            backdropFilter: 'blur(4px)'
        }} onClick={onCancel}>
            <div 
                onClick={e => e.stopPropagation()} 
                style={{
                    backgroundColor: 'var(--tool-bg-header)',
                    border: `1px solid ${isDanger ? 'var(--danger-color)' : 'var(--tool-border)'}`,
                    borderRadius: 'var(--border-radius)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                    width: '90%', maxWidth: '400px',
                    padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    color: 'var(--tool-text-main)',
                    animation: 'fadeIn 0.15s ease-out'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isDanger && <span style={{ fontSize: '1.5rem' }}>⚠️</span>}
                    <h3 style={{ margin: 0, color: isDanger ? 'var(--danger-color)' : 'var(--tool-text-header)' }}>
                        {title}
                    </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: 'var(--tool-text-main)' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                        onClick={onCancel}
                        style={{
                            background: 'transparent', border: 'none', 
                            color: 'var(--tool-text-dim)', cursor: 'pointer',
                            padding: '0.5rem 1rem', borderRadius: '4px'
                        }}
                        className="hover:bg-[var(--tool-bg-dark)]"
                    >
                        {cancelLabel}
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{
                            backgroundColor: isDanger ? 'var(--danger-color)' : 'var(--tool-accent)', 
                            color: isDanger ? '#fff' : 'var(--tool-key-black)',
                            border: 'none', cursor: 'pointer',
                            padding: '0.5rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}