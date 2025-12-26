'use client'

import Link from 'next/link';

interface WorldCardProps {
    w: any;
    isOwner: boolean;
    isGuest?: boolean;
}

export default function WorldCard({ w, isOwner, isGuest = false }: WorldCardProps) {
    // Default to the theme or a safe fallback
    const theme = w.settings?.visualTheme || 'default';

    return (
        <div 
            className="card theme-wrapper" 
            data-theme={theme}
            style={{ 
                overflow: 'hidden', 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                position: 'relative', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius)', 
                backgroundColor: 'var(--bg-panel)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
        >
            {/* COVER IMAGE CONTAINER */}
            <div style={{ 
                width: '100%', 
                aspectRatio: '16/9', // Forces standard video/cover shape
                background: '#000', 
                position: 'relative', 
                borderBottom: '1px solid var(--border-color)',
                overflow: 'hidden'
            }}>
                {w.coverImage ? (
                    <img 
                        src={w.coverImage} 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'cover', // Ensures no stretching
                            objectPosition: 'center' 
                        }} 
                        alt={w.title} 
                    />
                ) : (
                    // Placeholder Pattern
                    <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--accent-primary)',
                        opacity: 0.5
                    }}>
                        <span style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'serif' }}>
                            {w.title.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                
                {/* COLLAB BADGE */}
                {isOwner && w.ownerId && w.currentUserId && w.ownerId !== w.currentUserId && (
                    <div style={{ 
                        position: 'absolute', top: 10, right: 10, 
                        background: '#f1c40f', color: 'black', 
                        padding: '4px 8px', borderRadius: '4px', 
                        fontSize: '0.65rem', fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}>
                        COLLABORATOR
                    </div>
                )}
            </div>

            {/* CARD BODY */}
            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                    <h3 style={{ 
                        margin: 0, 
                        fontSize: '1.1rem', 
                        color: 'var(--text-primary)',
                        lineHeight: '1.4',
                        fontWeight: '600'
                    }}>
                        {w.title}
                    </h3>
                </div>

                {/* TAGS */}
                {w.tags && w.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {w.tags.slice(0, 3).map((tag: string) => ( // Limit tags to 3 to prevent bloat
                            <span key={tag} style={{ 
                                fontSize: '0.65rem', 
                                background: 'var(--bg-subtle)', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                color: 'var(--text-secondary)', 
                                border: '1px solid var(--border-light)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-muted)', 
                    flex: 1, 
                    marginBottom: '1.5rem',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 3, // Limit to 3 lines
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {w.summary || "No summary provided."}
                </p>
                
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                    <Link href={`/play/${w.worldId}`} className="continue-button" style={{ 
                        flex: 1, textDecoration: 'none', padding: '0.6rem', textAlign: 'center', 
                        borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500'
                    }}>
                        Play
                    </Link>
                    
                    {isOwner && (
                        <Link href={`/create/${w.worldId}/settings`} className="return-button" style={{ 
                            flex: 1, textDecoration: 'none', padding: '0.6rem', textAlign: 'center',
                            borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500'
                        }}>
                            Edit
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}