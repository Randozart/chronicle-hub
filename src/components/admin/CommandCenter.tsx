'use client';
import React from 'react';

interface Props {
    isDirty: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
    onSave: () => void;
    onRevert: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    itemType: string;
}

export default function CommandCenter({ 
    isDirty, isSaving, lastSaved, onSave, onRevert, onDuplicate, onDelete, itemType 
}: Props) {
    
    return (
        <div style={{
            position: 'fixed', // Fixed to viewport
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)', // Center horizontally
            width: '90%',
            maxWidth: '800px',
            
            // Theme Styles
            backgroundColor: 'var(--tool-bg-header)',
            border: '1px solid var(--tool-border)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--shadow-modal)',
            color: 'var(--tool-text-main)',
            
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1000,
            backdropFilter: 'blur(10px)', 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: isDirty ? 'var(--warning-color)' : 'var(--success-color)',
                    boxShadow: isDirty ? '0 0 8px var(--warning-color)' : 'none',
                    transition: 'background 0.3s'
                }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isDirty ? 'var(--warning-color)' : 'var(--tool-text-header)' }}>
                        {isDirty ? 'Unsaved Changes' : `${itemType} Saved`}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--tool-text-dim)' }}>
                        {lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : 'Ready'}
                    </span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {isDirty && (
                    <button 
                        onClick={onRevert}
                        disabled={isSaving}
                        className="hover:text-white"
                        style={{ 
                            background: 'transparent', border: 'none', color: 'var(--tool-text-dim)', 
                            cursor: 'pointer', fontSize: '0.8rem', marginRight: '10px' 
                        }}
                    >
                        Revert
                    </button>
                )}
                
                {onDuplicate && (
                    <button 
                        onClick={onDuplicate}
                        className="option-button" 
                        style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.8rem',
                            background: 'transparent',
                            border: '1px solid var(--tool-border)',
                            color: 'var(--tool-text-main)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        title="Duplicate (Create Copy)"
                    >
                        Duplicate
                    </button>
                )}

                {onDelete && (
                    <button 
                        onClick={onDelete}
                        style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.8rem', 
                            background: 'transparent',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--danger-color)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Delete
                    </button>
                )}

                <div style={{ width: '1px', height: '24px', background: 'var(--tool-border)', margin: '0 0.5rem' }} />

                <button 
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    style={{ 
                        padding: '0.5rem 1.5rem', 
                        opacity: (!isDirty && !isSaving) ? 0.5 : 1,
                        cursor: (!isDirty && !isSaving) ? 'default' : 'pointer',
                        minWidth: '100px',
                        background: 'var(--tool-accent)',
                        color: 'var(--tool-key-black)',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 'bold'
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}