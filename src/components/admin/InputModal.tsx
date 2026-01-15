'use client';
import React, { useState, useEffect, useRef } from 'react';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    label?: string;
    defaultValue?: string;
    confirmLabel?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
    placeholder?: string;
}

export default function InputModal({
    isOpen,
    title,
    description,
    label = "Value",
    defaultValue = "",
    confirmLabel = "Confirm",
    onClose,
    onSubmit,
    placeholder
}: InputModalProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, defaultValue]);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter') handleSubmit();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, value]);

    const handleSubmit = () => {
        if (!value.trim()) return;
        onSubmit(value);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0.8))',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div 
                onClick={e => e.stopPropagation()} 
                style={{
                    backgroundColor: 'var(--tool-bg-header)',
                    border: '1px solid var(--tool-border)',
                    borderRadius: 'var(--border-radius)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    width: '90%', maxWidth: '450px',
                    padding: '1.5rem',
                    display: 'flex', flexDirection: 'column', gap: '1rem',
                    color: 'var(--tool-text-main)',
                    animation: 'fadeIn 0.2s ease-out'
                }}
            >
                <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--tool-text-header)' }}>{title}</h3>
                    {description && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--tool-text-dim)' }}>{description}</p>}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--tool-text-dim)', textTransform: 'uppercase' }}>
                        {label}
                    </label>
                    <input
                        ref={inputRef}
                        className="form-input"
                        style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={placeholder}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', 
                            color: 'var(--tool-text-dim)', cursor: 'pointer',
                            padding: '0.5rem 1rem', borderRadius: '4px'
                        }}
                        className="hover:bg-[var(--tool-bg-dark)]"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        style={{
                            backgroundColor: 'var(--tool-accent)', 
                            color: 'var(--tool-key-black)',
                            border: 'none', cursor: 'pointer',
                            padding: '0.5rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold'
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}