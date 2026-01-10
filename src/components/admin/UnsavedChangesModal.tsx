'use client';
import React from 'react';

interface Props {
    isOpen: boolean;
    onSaveAndContinue: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export default function UnsavedChangesModal({ isOpen, onSaveAndContinue, onDiscard, onCancel }: Props) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-overlay, rgba(0,0,0,0.85))',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'var(--tool-bg-header)',
                border: '1px solid var(--tool-border)',
                borderRadius: 'var(--border-radius)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                width: '90%', maxWidth: '450px',
                padding: '1.5rem',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                color: 'var(--tool-text-main)',
                animation: 'fadeIn 0.15s ease-out'
            }}>
                <h3 style={{ margin: 0, color: 'var(--warning-color)' }}>Unsaved Changes</h3>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>
                    You have unsaved changes. What would you like to do?
                </p>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                    <button 
                        onClick={onCancel}
                        style={{ padding: '0.5rem 1rem', background: 'transparent', border: 'none', color: 'var(--tool-text-dim)', cursor: 'pointer' }}
                        className="hover:text-white"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onDiscard}
                        style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Discard
                    </button>
                    <button 
                        onClick={onSaveAndContinue}
                        style={{ padding: '0.5rem 1rem', background: 'var(--tool-accent)', color: 'var(--tool-key-black)', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Save & Switch
                    </button>
                </div>
            </div>
            <style jsx>{`@keyframes fadeIn { from { opacity:0; transform:scale(0.98); } to { opacity:1; transform:scale(1); } }`}</style>
        </div>
    );
}