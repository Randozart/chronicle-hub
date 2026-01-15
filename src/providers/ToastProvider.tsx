// src/providers/ToastProvider.tsx
'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
    showToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<{ msg: string, type: ToastType } | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((msg: string, type: ToastType = 'success') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        setToast({ msg, type });
        
        timerRef.current = setTimeout(() => {
            setToast(null);
        }, 3000);
    }, []);

    const getStyles = (type: ToastType): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'fixed', 
            bottom: '40px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            color: '#fff', 
            padding: '10px 20px', 
            borderRadius: '4px', 
            zIndex: 99999,
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)', 
            fontWeight: 'bold', 
            fontSize: '0.9rem',
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-out'
        };

        switch (type) {
            case 'success': return { ...base, background: '#2ecc71' };
            case 'error': return { ...base, background: '#e74c3c' };
            default: return { ...base, background: '#3498db' };
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div style={getStyles(toast.type)}>
                    {toast.msg}
                </div>
            )}
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translate(-50%, 20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
            `}</style>
        </ToastContext.Provider>
    );
}