'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
    
    // NEW: Zoom Controls
    zoom: number; // Percentage (e.g. 100, 90, 110)
    setZoom: (zoom: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    
    const [theme, setThemeState] = useState<Theme>('dark');
    const [zoom, setZoomState] = useState<number>(100); // Default 100%
    
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
    const [mounted, setMounted] = useState(false);

    // 1. Initialize from LocalStorage
    useEffect(() => {
        // Theme
        const storedTheme = localStorage.getItem('chronicle-theme') as Theme;
        if (storedTheme) setThemeState(storedTheme);
        
        // Zoom
        const storedZoom = localStorage.getItem('chronicle-zoom');
        if (storedZoom) {
            const z = parseInt(storedZoom);
            if (!isNaN(z)) setZoomState(z);
        }

        setMounted(true);
    }, []);

    // 2. Apply Theme & Zoom
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        
        // --- APPLY ZOOM ---
        // 16px is standard browser default. 
        // 80% = 12.8px (Small), 100% = 16px (Normal), 120% = 19.2px (Large)
        // Since we use 'rem' for almost everything, this scales the whole app.
        root.style.fontSize = `${(zoom / 100) * 16}px`;

        // --- APPLY THEME ---
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = () => {
            let currentTheme = theme;
            if (currentTheme === 'system') {
                currentTheme = mediaQuery.matches ? 'dark' : 'light';
            }
            setResolvedTheme(currentTheme as 'light' | 'dark');
            root.setAttribute('data-global-theme', currentTheme);
        };

        applyTheme();
        mediaQuery.addEventListener('change', applyTheme);
        return () => mediaQuery.removeEventListener('change', applyTheme);
    }, [theme, zoom, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('chronicle-theme', newTheme);
        if (session) {
            // Optional: Sync to DB
            fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferredTheme: newTheme })
            }).catch(console.error);
        }
    };

    const setZoom = (newZoom: number) => {
        // Clamp between 50% and 150%
        const clamped = Math.min(Math.max(newZoom, 50), 150);
        setZoomState(clamped);
        localStorage.setItem('chronicle-zoom', String(clamped));
    };

    if (!mounted) return null;

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, zoom, setZoom }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};