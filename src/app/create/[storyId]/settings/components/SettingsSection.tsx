'use client';
import { useState, useEffect, ReactNode } from 'react';

interface Props {
    title: string;
    children: ReactNode;
    color?: string; // Theme color for this section
    defaultOpen?: boolean;
    forceState?: 'open' | 'closed' | null; // For "Expand All"
}

export default function SettingsSection({ 
    title, children, color = 'var(--tool-border)', defaultOpen = false, forceState = null 
}: Props) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    useEffect(() => {
        if (forceState === 'open') setIsOpen(true);
        if (forceState === 'closed') setIsOpen(false);
    }, [forceState]);

    return (
        <div style={{ 
            marginBottom: '1rem', 
            border: `1px solid ${color}`, 
            borderRadius: 'var(--border-radius)', 
            overflow: 'hidden',
            background: 'var(--tool-bg-dark)'
        }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%', textAlign: 'left', padding: '1rem 1.5rem',
                    background: `linear-gradient(90deg, ${color}22 0%, var(--tool-bg-header) 100%)`, 
                    border: 'none', 
                    borderBottom: isOpen ? `1px solid ${color}44` : 'none',
                    color: 'var(--tool-text-header)', 
                    fontWeight: 'bold', fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderLeft: `4px solid ${color}`
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {title}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--tool-text-dim)' }}>
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>
            {isOpen && (
                <div style={{ padding: '1.5rem', borderTop: `1px solid ${color}22` }}>
                    {children}
                </div>
            )}
        </div>
    );
}