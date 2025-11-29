import Link from 'next/link';

export default function WorldCard({ w, isOwner }: { w: any, isOwner: boolean }) {
    // Default to 'default' if undefined
    const theme = w.settings?.visualTheme || 'default';

    return (
        // APPLY THEME HERE
        <div 
            className="card theme-wrapper" // Add theme-wrapper class to ensure font/color inheritance
            data-theme={theme} 
            style={{ 
                overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)', 
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-primary)', // Explicitly set text color for this scope
                fontFamily: 'var(--font-main)'
            }}
        >
            {/* COVER IMAGE */}
            <div style={{ height: '150px', background: '#000', position: 'relative' }}>
                {w.coverImage ? (
                    <img src={w.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={w.title} />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, var(--bg-panel), var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '3rem', fontWeight: 'bold' }}>
                        {w.title.charAt(0)}
                    </div>
                )}
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{w.title}</h3>
                    
                    {/* CHARACTER NAME BADGE */}
                    {w.characterName && (
                         <span style={{ fontSize: '0.75rem', color: 'var(--accent-highlight)', fontWeight: 'bold' }}>
                            {w.characterName}
                         </span>
                    )}
                </div>

                {/* TAGS */}
                {w.tags && w.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {w.tags.map((tag: string) => (
                            <span key={tag} style={{ fontSize: '0.7rem', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                
                
                <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                    <Link href={`/play/${w.worldId}`} className="continue-button" style={{ flex: 1, textDecoration: 'none', padding: '0.5rem' }}>
                        Play
                    </Link>
                    {isOwner && (
                        <Link href={`/create/${w.worldId}/settings`} className="return-button" style={{ flex: 1, textDecoration: 'none', padding: '0.5rem' }}>
                            Edit
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}