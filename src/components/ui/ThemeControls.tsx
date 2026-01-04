'use client';

import { useTheme } from '@/providers/ThemeProvider';

export default function ThemeControls({ vertical = false }: { vertical?: boolean }) {
    const { theme, setTheme, resolvedTheme, zoom, setZoom } = useTheme();

    const btnStyle = {
        background: 'transparent',
        border: '1px solid var(--border-light)',
        color: 'var(--text-secondary)',
        borderRadius: '4px',
        width: '32px', height: '32px',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.9rem',
        padding: 0
    };

    const cycleTheme = () => {
        // Dark Block
        if (theme === 'dark') setTheme('soft-dark');
        else if (theme === 'soft-dark') setTheme('storynexus');
        
        // Transition to Light Block
        else if (theme === 'storynexus') setTheme('storynexus-light');
        
        // Light Block
        else if (theme === 'storynexus-light') setTheme('soft-light');
        else if (theme === 'soft-light') setTheme('light');
        
        // Loop back to start
        else setTheme('dark');
    };

    const getThemeIcon = () => {
        switch(theme) {
            case 'dark': return '☾';         // Moon
            case 'soft-dark': return '☁';    // Cloud (Soft)
            case 'storynexus': return '⚙️';   // Gear (Industrial/Classic)
            
            case 'storynexus-light': return '🏛️'; // Column (Classic/Fog)
            case 'soft-light': return '☕';       // Coffee (Sepia/Paper)
            case 'light': return '☀';             // Sun (Bright)
            
            default: return 'B'; 
        }
    };

    const currentName = theme.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

     return (
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '0.5rem', alignItems: 'center' }}>
            
            {/* ADD className to this wrapper div */}
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


            {/* THEME TOGGLE */}
            <button 
                onClick={cycleTheme}
                style={{ ...btnStyle, borderRadius: '50%', fontSize: '1rem' }}
                className="hover:text-emphasis hover:border-emphasis transition"
                title={`Current Theme: ${currentName}`}
            >
                {getThemeIcon()}
            </button>
        </div>
    );
}