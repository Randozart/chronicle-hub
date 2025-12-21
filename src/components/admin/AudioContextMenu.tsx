'use client';
import { useEffect, useRef } from 'react';

interface Props {
    x: number;
    y: number;
    options: { label: string; action: () => void; danger?: boolean }[];
    onClose: () => void;
}

export default function AudioContextMenu({ x, y, options, onClose }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Use mousedown to catch clicks before they trigger other logic
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div 
            ref={ref}
            style={{
                position: 'fixed', 
                top: y, 
                left: x, 
                zIndex: 9999,
                background: '#1e2127', 
                border: '1px solid #444', 
                borderRadius: '4px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                minWidth: '180px', 
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={(e) => { 
                        e.stopPropagation(); // Prevent triggering underlying elements
                        opt.action(); 
                        onClose(); 
                    }}
                    style={{
                        display: 'block', 
                        width: '100%', 
                        textAlign: 'left',
                        padding: '8px 12px', 
                        background: 'transparent', 
                        border: 'none',
                        borderBottom: i < options.length - 1 ? '1px solid #2a2e36' : 'none',
                        color: opt.danger ? '#e06c75' : '#ccc', 
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#2c313a'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}