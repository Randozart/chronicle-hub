'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
    const [mounted, setMounted] = useState(false);

    // This effect runs once on the client to get the stored theme
    useEffect(() => {
        const stored = localStorage.getItem('chronicle-theme') as Theme;
        if (stored) {
            setThemeState(stored);
        }
        setMounted(true);
    }, []);

    // THIS IS THE CRITICAL LOGIC MOVED FROM THE OLD 'ThemeApplicator'
    // It applies the theme directly to the <html> tag.
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
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
    }, [theme, mounted]);

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

    if (!mounted) {
        // To prevent flash of unstyled content, we can render nothing or a loader
        // until the theme is determined on the client.
        return null; 
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
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