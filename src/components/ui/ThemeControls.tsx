'use client';

import { useTheme } from '@/providers/ThemeProvider';

export default function ThemeControls({ vertical = false }: { vertical?: boolean }) {
    const { theme, setTheme, zoom, setZoom } = useTheme();

    const btnStyle = {
        background: 'transparent',
        border: '1px solid var(--border-light)',
        color: 'var(--text-secondary)',
        borderRadius: '4px',
        width: '32px', height: '32px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
        transition: 'all 0.2s ease'
    };

    const cycleTheme = () => {
        const order = ['dark', 'soft-dark', 'classic', 'classic-light', 'soft-light', 'light', 'terminal', 'terminal-light'];
        const idx = order.indexOf(theme);
        const next = order[(idx + 1) % order.length];
        setTheme(next as any);
    };

    const currentName = theme.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const Icons = {
        Moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
        Cloud: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>,
        Flame: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.115.385-2.256 1-3.222 2.071 3.204 3.142 5.352 1.5 5.722z"></path></svg>,
        Gaslamp: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v5" /><path d="M6 7h12l-2 13H8L6 7z" /><line x1="12" y1="10" x2="12" y2="16" /></svg>,
        Sunset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="9" x2="12" y2="2"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="16 5 12 9 8 5"></polyline></svg>,
        Quill: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>,
        Sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
        Prompt: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
    };

    const getThemeIcon = () => {
        switch(theme) {
            case 'dark': return Icons.Moon;
            case 'soft-dark': return Icons.Cloud;
            case 'classic': return Icons.Gaslamp;
            case 'classic-light': return Icons.Sunset;
            case 'soft-light': return Icons.Quill;
            case 'light': return Icons.Sun;
            case 'terminal': return Icons.Prompt;
            case 'terminal-light': return Icons.Prompt;
            default: return Icons.Moon;
        }
    };

     return (
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '0.5rem', alignItems: 'center' }}>
            
            <div className="theme-zoom-controls" style={{ display: 'flex', gap: '2px', background: 'var(--bg-item)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button 
                    onClick={() => setZoom(zoom - 10)}
                    style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                    title="Zoom Out"
                    className="hover:text-emphasis"
                >
                    −
                </button>
                
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0 4px', minWidth: '35px', justifyContent: 'center', userSelect: 'none' }}>
                    {zoom}%
                </div>

                <button 
                    onClick={() => setZoom(zoom + 10)}
                    style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                    title="Zoom In"
                    className="hover:text-emphasis"
                >
                    +
                </button>
            </div>
            <button 
                onClick={cycleTheme}
                style={{ ...btnStyle, borderRadius: '50%' }}
                className="hover:text-emphasis hover:border-emphasis transition"
                title={`Current Theme: ${currentName}`}
            >
                {getThemeIcon()}
            </button>
        </div>
    );
}