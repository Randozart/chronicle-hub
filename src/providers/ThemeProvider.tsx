'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'soft-light' | 'dark' | 'soft-dark' | 'classic' | 'classic-light' | 'system' | 'terminal' | 'terminal-light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark'; // Still useful for binary logic if needed
    zoom: number;
    setZoom: (zoom: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    
    // Default to 'soft-dark' as the middle ground you wanted
    const [theme, setThemeState] = useState<Theme>('soft-dark'); 
    
    const [zoom, setZoomState] = useState<number>(100);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem('chronicle-theme') as Theme;
        if (storedTheme) setThemeState(storedTheme);
        
        const storedZoom = localStorage.getItem('chronicle-zoom');
        if (storedZoom) {
            const z = parseInt(storedZoom);
            if (!isNaN(z)) setZoomState(z);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;

        // Apply Zoom
        root.style.fontSize = `${(zoom / 100) * 16}px`;

        // Apply Theme
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        let target = theme;
        
        if (theme === 'system') {
            target = mediaQuery.matches ? 'soft-dark' : 'soft-light'; // System defaults to soft versions
        }

        // Determine if it counts as "Dark" or "Light" for high-level checks
        const isDark = target === 'dark' || target === 'soft-dark';
        setResolvedTheme(isDark ? 'dark' : 'light');
        
        // Apply the specific data attribute
        root.setAttribute('data-global-theme', target);

    }, [theme, zoom, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('chronicle-theme', newTheme);
        if (session) {
            fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferredTheme: newTheme })
            }).catch(console.error);
        }
    };

    const setZoom = (newZoom: number) => {
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