/* src/components/ui/ThemeControls.tsx */
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

    return (
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: '0.5rem', alignItems: 'center' }}>
            
            {/* ZOOM CONTROLS */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-item)', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-color)' }}>
                <button 
                    onClick={() => setZoom(zoom - 10)}
                    style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                    title="Zoom Out"
                    className="hover:text-white"
                >
                    −
                </button>
                
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '0 4px', minWidth: '35px', justifyContent: 'center' }}>
                    {zoom}%
                </div>

                <button 
                    onClick={() => setZoom(zoom + 10)}
                    style={{ ...btnStyle, border: 'none', width: '24px', fontSize: '1rem' }}
                    title="Zoom In"
                    className="hover:text-white"
                >
                    +
                </button>
            </div>

            {/* THEME TOGGLE */}
            <button 
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                style={{ ...btnStyle, borderRadius: '50%' }}
                className="hover:text-white hover:border-white transition"
                title="Toggle Theme"
            >
                {resolvedTheme === 'dark' ? '☀' : '☾'}
            </button>
        </div>
    );
}