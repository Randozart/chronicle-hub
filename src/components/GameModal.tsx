'use client';

import { useEffect, useState, useRef } from 'react';
import FormattedText from './FormattedText';

export type ModalType = 'alert' | 'confirm' | 'prompt' | 'danger';

interface GameModalProps {
    isOpen: boolean;
    type?: ModalType;
    title: string;
    message?: string; // Supports formatting
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (inputValue?: string) => void;
    onClose: () => void;
    placeholder?: string; // For prompts
    defaultValue?: string; // For prompts
}

export default function GameModal({
    isOpen,
    type = 'alert',
    title,
    message,
    confirmLabel = "OK",
    cancelLabel = "Cancel",
    onConfirm,
    onClose,
    placeholder = "",
    defaultValue = ""
}: GameModalProps) {
    const [inputValue, setInputValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && type === 'prompt') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        setInputValue(defaultValue);
    }, [isOpen, type, defaultValue]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(inputValue);
    };

    const isDanger = type === 'danger';
    const showCancel = type === 'confirm' || type === 'prompt' || type === 'danger';

    return (
        <div 
            style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
                animation: 'fadeIn 0.2s ease-out'
            }} 
            onClick={onClose}
        >
            <div 
                style={{
                    background: 'var(--bg-panel)',
                    border: `1px solid ${isDanger ? 'var(--danger-color)' : 'var(--accent-highlight)'}`,
                    borderRadius: 'var(--border-radius)',
                    padding: '2rem',
                    maxWidth: '450px',
                    width: '90%',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }} 
                onClick={e => e.stopPropagation()}
            >
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ 
                        margin: 0, 
                        color: isDanger ? 'var(--danger-color)' : 'var(--text-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '1.2rem'
                    }}>
                        {title}
                    </h3>
                    {message && (
                        <div style={{ marginTop: '1rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            <FormattedText text={message} />
                        </div>
                    )}
                </div>

                {type === 'prompt' && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        className="form-input"
                        style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    />
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    {showCancel && (
                        <button 
                            onClick={onClose}
                            className="option-button" 
                            style={{ 
                                flex: 1, 
                                background: 'transparent', 
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-muted)' 
                            }}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button 
                        onClick={handleConfirm}
                        className="option-button" 
                        style={{ 
                            flex: 1,
                            borderColor: isDanger ? 'var(--danger-color)' : 'var(--accent-highlight)',
                            color: isDanger ? 'var(--danger-color)' : 'var(--text-primary)'
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
            <style jsx>{`@keyframes fadeIn { from { opacity:0; transform: scale(0.95); } to { opacity:1; transform: scale(1); } }`}</style>
        </div>
    );
}