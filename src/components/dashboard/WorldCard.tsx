'use client'

import Link from 'next/link';
import { useState } from 'react';

interface WorldCardProps {
    w: any;
    isOwner: boolean;
    isGuest?: boolean;
}

export default function WorldCard({ w, isOwner, isGuest = false }: WorldCardProps) {
    // FIX: Safely access settings
    const settings = w.settings || {}; 
    const theme = settings.visualTheme || 'default';
    
    // View state for the slide-up panel
    const [activeView, setActiveView] = useState<'credits' | 'ai' | null>(null);

    const hasAI = !!settings.aiDisclaimer;
    const hasCredits = !!settings.attributions;
    const hasInfo = hasAI || hasCredits;

    // Helper to close panel
    const closePanel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveView(null);
    };

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
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                setActiveView(null); // Close panel on mouse leave
            }}
        >
            {/* === SLIDE-UP INFO PANEL === */}
            <div 
                onClick={closePanel}
                style={{
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 15, 20, 0.97)', 
                    zIndex: 50,
                    padding: '2rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    color: '#fff', 
                    backdropFilter: 'blur(5px)',
                    // Animation: Slide up from bottom
                    transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    opacity: activeView ? 1 : 0,
                    transform: activeView ? 'translateY(0)' : 'translateY(100%)', 
                    pointerEvents: activeView ? 'auto' : 'none',
                }} 
            >
                <h4 style={{ 
                    margin: '0 0 1rem 0', 
                    textTransform: 'uppercase', 
                    letterSpacing: '1px', 
                    color: activeView === 'ai' ? '#f39c12' : '#3498db',
                    borderBottom: `1px solid ${activeView === 'ai' ? '#f39c12' : '#3498db'}`,
                    paddingBottom: '0.5rem',
                    fontSize: '1rem'
                }}>
                    {activeView === 'ai' ? 'AI Generated Content' : 'Credits & Attributions'}
                </h4>
                
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    textAlign: 'left', 
                    whiteSpace: 'pre-wrap', 
                    fontSize: '0.9rem', 
                    lineHeight: '1.6',
                    color: '#ddd' 
                }}>
                    {activeView === 'ai' ? settings.aiDisclaimer : settings.attributions}
                </div>
                
                <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>
                    (Click anywhere to close)
                </div>
            </div>

            {/* === IMAGE SECTION === */}
            <div style={{ 
                width: '100%', 
                aspectRatio: '16/9', 
                background: '#000', 
                position: 'relative', 
                borderBottom: '1px solid var(--border-color)',
                overflow: 'hidden'
            }}>
                {w.coverImage ? (
                    <img 
                        src={w.coverImage} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} 
                        alt={w.title} 
                    />
                ) : (
                    // RESTORED: Placeholder Letter
                    <div style={{ 
                        width: '100%', height: '100%', 
                        background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: 'var(--accent-primary)', opacity: 0.7
                    }}>
                        <span style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'serif' }}>
                            {(w.title || '?').charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
                
                {/* RESTORED: Collab Badge */}
                {isOwner && w.ownerId && w.currentUserId && w.ownerId !== w.currentUserId && (
                    <div style={{ 
                        position: 'absolute', top: 10, right: 10, 
                        background: '#f1c40f', color: 'black', 
                        padding: '4px 8px', borderRadius: '4px', 
                        fontSize: '0.65rem', fontWeight: 'bold',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        zIndex: 20
                    }}>
                        COLLABORATOR
                    </div>
                )}

                {/* INFO BUTTON BAR */}
                {hasInfo && (
                    <div style={{ 
                        position: 'absolute', bottom: 0, left: 0, right: 0, 
                        height: '34px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0))',
                        display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px',
                        zIndex: 10
                    }}>
                        {hasAI && (
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('ai'); }}
                                style={{ 
                                    background: 'rgba(243, 156, 18, 0.25)', 
                                    border: '1px solid rgba(243, 156, 18, 0.5)', 
                                    color: '#f39c12',
                                    borderRadius: '3px', fontSize: '0.85rem', padding: '2px 8px', 
                                    cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase',
                                    backdropFilter: 'blur(2px)', transition: 'all 0.2s'
                                }}
                                title="Contains AI Content"
                            >
                                AI Disclaimer
                            </button>
                        )}
                        {hasCredits && (
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('credits'); }}
                                style={{ 
                                    background: 'rgba(52, 152, 219, 0.25)', 
                                    border: '1px solid rgba(52, 152, 219, 0.5)', 
                                    color: '#3498db',
                                    borderRadius: '3px', fontSize: '0.85rem', padding: '2px 8px', 
                                    cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase',
                                    backdropFilter: 'blur(2px)', transition: 'all 0.2s'
                                }}
                                title="View Attributions"
                            >
                                Credits
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* === CARD BODY === */}
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

                {w.tags && w.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {w.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} style={{ 
                                fontSize: '0.65rem', background: 'var(--bg-subtle)', padding: '2px 8px', 
                                borderRadius: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border-light)',
                                textTransform: 'uppercase', letterSpacing: '0.5px'
                            }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <p style={{ 
                    fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1.5rem',
                    lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
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