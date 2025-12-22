'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

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
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((msg: string, type: ToastType = 'success') => {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        setToast({ msg, type });
        
        timerRef.current = setTimeout(() => {
            setToast(null);
        }, 3000);
    }, []);

    // Styles based on type
    const getBgColor = (type: ToastType) => {
        switch (type) {
            case 'success': return '#2ecc71'; // Green
            case 'error': return '#e74c3c';   // Red
            default: return '#3498db';        // Blue
        }
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div style={{
                    position: 'fixed', 
                    bottom: 40, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    background: getBgColor(toast.type),
                    color: '#fff', 
                    padding: '10px 20px', 
                    borderRadius: '4px', 
                    zIndex: 99999,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem',
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
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