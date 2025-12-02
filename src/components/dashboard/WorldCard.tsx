'use client'

import Link from 'next/link';

interface WorldCardProps {
    w: any;
    isOwner: boolean;
    isGuest?: boolean; // <--- ADD THIS (Optional)
}

export default function WorldCard({ w, isOwner, isGuest = false }: WorldCardProps) {
    const theme = w.settings?.visualTheme || 'default';

    return (
        <div 
            className="card theme-wrapper" 
            data-theme={theme} // <--- This applies the CSS variables
            style={{ 
                overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)', 
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                transition: 'transform 0.2s',
            }}
        >
            {/* COVER IMAGE */}
            <div style={{ height: '150px', background: '#000', position: 'relative', borderBottom: '1px solid var(--border-color)' }}>
                {w.coverImage ? (
                    <img src={w.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={w.title} />
                ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, var(--bg-panel), var(--accent-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '3rem', fontWeight: 'bold' }}>
                        {w.title.charAt(0)}
                    </div>
                )}
                
                {/* COLLAB BADGE */}
                {isOwner && w.ownerId && w.currentUserId && w.ownerId !== w.currentUserId && (
                    <div style={{ position: 'absolute', top: 10, right: 10, background: '#f1c40f', color: 'black', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        COLLABORATOR
                    </div>
                )}
            </div>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{w.title}</h3>
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

                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', flex: 1, marginBottom: '1rem' }}>
                    {w.summary || "No summary provided."}
                </p>
                
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                    <Link href={`/play/${w.worldId}`} className="continue-button" style={{ flex: 1, textDecoration: 'none', padding: '0.5rem', textAlign: 'center' }}>
                        Play
                    </Link>
                    
                    {/* EDIT BUTTON - Only shows if isOwner (canEdit) is true */}
                    {isOwner && (
                        <Link href={`/create/${w.worldId}/settings`} className="return-button" style={{ flex: 1, textDecoration: 'none', padding: '0.5rem', textAlign: 'center' }}>
                            Edit
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}