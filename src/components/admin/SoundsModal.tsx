'use client';

import { useState } from 'react';

interface SoundsModalProps {
    children: React.ReactNode;
    label?: string;
    hasContent?: boolean;
}

/**
 * SoundsModal — a small trigger button that opens a modal for sound/music overrides.
 * Place sound field components as children.
 */
export default function SoundsModal({ children, label = 'Sounds', hasContent }: SoundsModalProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                    background: hasContent ? 'var(--tool-accent-fade)' : 'var(--tool-bg)',
                    border: `1px solid ${hasContent ? 'var(--tool-accent)' : 'var(--tool-border)'}`,
                    color: hasContent ? 'var(--tool-accent)' : 'var(--tool-text-dim)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: hasContent ? 'bold' : 'normal',
                    transition: 'all 0.1s',
                    whiteSpace: 'nowrap',
                }}
                title="Configure sound overrides"
            >
                {label}
            </button>

            {open && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}
                >
                    <div
                        style={{
                            background: 'var(--tool-bg-sidebar)',
                            border: '1px solid var(--tool-border)',
                            borderRadius: '6px',
                            width: '540px',
                            maxWidth: '95vw',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                borderBottom: '1px solid var(--tool-border)',
                                flexShrink: 0,
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--tool-text-header)', fontWeight: 'bold' }}>
                                {label}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--tool-text-dim)',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    lineHeight: 1,
                                    padding: '2px 6px',
                                }}
                                title="Close"
                            >
                                x
                            </button>
                        </div>
                        <div
                            style={{
                                padding: '1rem',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                            }}
                        >
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
