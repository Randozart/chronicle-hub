// src/components/SystemMessageBanner.tsx
'use client';

import { useState } from 'react';
import { SystemMessage } from '@/engine/models';
import FormattedText from './FormattedText';

interface Props {
    message: SystemMessage;
    onDismiss: () => void; // Parent handles API call
    type: 'world' | 'platform';
}

export default function SystemMessageBanner({ message, onDismiss, type }: Props) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false); // Optimistic UI update
        onDismiss();
    };

    // Style based on severity
    let bgColor = '#2a3e5c'; // Info (Blue)
    let borderColor = '#61afef';
    
    if (message.severity === 'warning') {
        bgColor = '#4a3b18'; // Yellow/Brown
        borderColor = '#f1c40f';
    } else if (message.severity === 'critical') {
        bgColor = '#3e1a1a'; // Red
        borderColor = '#e06c75';
    }

    return (
        <div style={{ 
            background: bgColor, 
            borderBottom: `2px solid ${borderColor}`,
            padding: '1rem 2rem',
            position: 'relative',
            zIndex: 100,
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                        <span style={{ 
                            fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 'bold', 
                            background: borderColor, color: '#000', padding: '2px 6px', borderRadius: '4px' 
                        }}>
                            {type === 'platform' ? 'SYSTEM' : 'ANNOUNCEMENT'}
                        </span>
                        <strong style={{ color: '#fff', fontSize: '1rem' }}>{message.title}</strong>
                    </div>
                    <div style={{ color: '#e0e0e0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                         <FormattedText text={message.content} />
                    </div>
                </div>
                <button 
                    onClick={handleDismiss}
                    style={{ 
                        background: 'transparent', border: 'none', color: '#aaa', 
                        cursor: 'pointer', fontSize: '1.5rem', padding: '0 0.5rem',
                        lineHeight: 1
                    }}
                    title="Dismiss"
                >
                    ×
                </button>
            </div>
        </div>
    );
}