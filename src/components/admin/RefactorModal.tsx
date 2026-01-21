'use client';

import React, { useState, useEffect, useRef } from 'react';
import RefactorTool from './assets/RefactorTool';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    storyId: string;
    currentId: string;
    onSuccess: (newId: string) => void;
    type?: 'quality' | 'standard'; 
}

export default function RefactorModal({ isOpen, onClose, storyId, currentId, onSuccess, type = 'standard' }: Props) {
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            setPos({
                x: e.clientX - dragOffset.current.x,
                y: e.clientY - dragOffset.current.y
            });
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };

        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isOpen]);

    const startDrag = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') return;
        
        isDragging.current = true;
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
        }}>
            <div 
                style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--accent-highlight)', 
                    borderRadius: 'var(--border-radius)',
                    padding: '0', 
                    width: '90%', maxWidth: '800px',
                    maxHeight: '90vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px var(--tool-bg-dark)',
                    pointerEvents: 'auto',
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div 
                    onMouseDown={startDrag}
                    style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border-color)', 
                        cursor: 'grab', 
                        userSelect: 'none',
                        background: 'var(--tool-bg-header)',
                        borderRadius: 'var(--border-radius) var(--border-radius) 0 0'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ margin: 0, color: 'var(--tool-text-header)', fontSize: '1.2rem', pointerEvents: 'none' }}>
                            Refactor ID
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ background: 'none', border: 'none', color: 'var(--tool-text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 10px' }}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    <RefactorTool 
                        storyId={storyId}
                        initialOldId={currentId}
                        initialType={type}
                        onSuccess={onSuccess}
                        onCancel={onClose}
                        embedded={true}
                    />
                </div>
            </div>
        </div>
    );
}