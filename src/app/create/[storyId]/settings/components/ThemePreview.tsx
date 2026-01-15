'use client';

interface Props {
    theme: string;
}

export default function ThemePreview({ theme }: Props) {
    return (
        <div 
            data-theme={theme} 
            className="theme-wrapper preview-card"
            style={{ 
                padding: '1.5rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                maxWidth: '400px',
                margin: '0 auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                position: 'relative',
                minHeight: 'auto'
            }}
        >
            <h3 style={{ margin: '0 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Preview: {theme}
            </h3>
            <div className="storylet-container" style={{ marginBottom: '1rem' }}>
                <h4 style={{ marginTop: 0, color: 'var(--text-primary)' }}>A Strange Encounter</h4>
                <p className="storylet-text" style={{ fontSize: '0.9rem' }}>
                    The fog swirls around you. A figure approaches from the shadows.
                    <span className="metatext" style={{ display: 'block', marginTop: '0.5rem' }}>This looks dangerous.</span>
                </p>
            </div>
            <div className="option-button" style={{ padding: '0.75rem' }}>
                <h5 style={{ margin: 0, color: 'var(--text-primary)' }}>Stand your ground</h5>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Requires: <span style={{ color: 'var(--danger-color)' }}>Mettle 5</span>
                </p>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Health</span>
                <div className="quality-bar-background" style={{ flex: 1, height: '8px' }}>
                    <div className="quality-bar-fill" style={{ width: '70%' }} />
                </div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button className="continue-button" style={{ padding: '0.5rem 1rem', width: 'auto' }}>
                    Continue
                </button>
            </div>
        </div>
    );
}