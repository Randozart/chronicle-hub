'use client'

import Link from 'next/link';
import { useState } from 'react';
import { useTheme } from '@/providers/ThemeProvider';
import GameModal from '@/components/GameModal';
import { useRouter } from 'next/navigation';

interface WorldCardProps {
    w: any;
    isOwner: boolean;
    isGuest?: boolean;
}

export default function WorldCard({ w, isOwner, isGuest = false }: WorldCardProps) {
    const router = useRouter();

    const settings = w.settings || {}; 
    const worldTheme = settings.visualTheme || 'default';
    const { theme: globalTheme } = useTheme();
    const [activeView, setActiveView] = useState<'creators' | 'ai' | null>(null);

    const hasAI = !!settings.aiDisclaimer;
    const hasAttributions = !!settings.attributions;
    const collaborators = w.collaborators || [];
    const hasTeam = collaborators.length > 0;
    
    // Content Ratings
    const [showWarning, setShowWarning] = useState(false);
    const content = w.contentConfig || {};
    const isMature = content.mature;
    const hasTriggers = content.triggers;

    // Lifecycle Status
    const pubStatus = settings.publicationStatus || (w.published ? 'published' : 'private');
    const isInProgress = pubStatus === 'in_progress';
    const deletionDate = settings.deletionScheduledAt;

    // Open Source toggle
    const isOpenSource = settings.isOpenSource === true;

    const closePanel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveView(null);
    };

    const getTagsArray = (tags: any): string[] => {
        if (Array.isArray(tags)) return tags;
        if (tags && typeof tags === 'object') return Object.values(tags).filter(val => typeof val === 'string') as string[];
        return [];
    };

    const tags = getTagsArray(w.tags);
    const getGlobalFontStack = () => {
        switch (globalTheme) {
            case 'classic': 
            case 'classic-light':
            case 'soft-light':
                return 'var(--font-garamond), "Georgia", "Times New Roman", serif';
            case 'terminal':
                return 'var(--font-jetbrains), "Courier New", monospace';
            case 'dark':
            case 'light':
            case 'soft-dark':
            default:
                return 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        }
    };
    
    const handlePlayClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isMature || hasTriggers) {
            setShowWarning(true);
        } else {
            router.push(`/play/${w.worldId}`);
        }
    };

    const confirmPlay = () => {
        setShowWarning(false);
        router.push(`/play/${w.worldId}`);
    };

    return (
        <>
            <GameModal 
                isOpen={showWarning}
                title="Content Warning"
                message={
                    <div>
                        <p>This world contains content that may not be suitable for all audiences.</p>
                        
                        {isMature && (
                            <div style={{ margin: '1rem 0', padding: '0.5rem', borderLeft: '3px solid var(--warning-color)', background: 'rgba(255, 200, 0, 0.1)', textAlign: 'left' }}>
                                <strong>Mature (16+)</strong><br/>
                                <span style={{ fontSize: '0.9rem' }}>{content.matureDetails || "Contains mature themes."}</span>
                            </div>
                        )}
                        
                        {hasTriggers && (
                            <div style={{ margin: '1rem 0', padding: '0.5rem', borderLeft: '3px solid var(--danger-color)', background: 'rgba(255, 0, 0, 0.1)', textAlign: 'left' }}>
                                <strong>Trigger Warnings</strong><br/>
                                <span style={{ fontSize: '0.9rem' }}>{content.triggerDetails || "Specific triggers not listed."}</span>
                            </div>
                        )}
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>By continuing, you confirm you are of appropriate age and consent to view this content.</p>
                    </div>
                }
                onClose={() => setShowWarning(false)}
                onConfirm={confirmPlay}
                confirmLabel="I Understand & Wish to Play"
                type="danger" 
            />

            <div 
                className="card theme-wrapper" 
                data-theme={worldTheme}
                style={{ 
                    overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', 
                    border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)', fontFamily: 'var(--font-main)', transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; setActiveView(null); }}
            >
                {deletionDate && (
                    <div style={{ 
                        position: 'absolute', top: 0, left: 0, right: 0, 
                        background: 'var(--danger-color)', color: '#fff', 
                        padding: '4px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 60 
                    }}>
                        SCHEDULED FOR DELETION
                    </div>
                )}

                <div 
                    onClick={closePanel}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(15, 15, 20, 0.97)', zIndex: 50,
                        padding: '2rem', display: 'flex', flexDirection: 'column',
                        color: '#fff', backdropFilter: 'blur(5px)',
                        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        opacity: activeView ? 1 : 0, transform: activeView ? 'translateY(0)' : 'translateY(100%)', pointerEvents: activeView ? 'auto' : 'none',
                        fontFamily: getGlobalFontStack() 
                    }} 
                >
                    <h4 style={{ 
                        margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '1px', 
                        color: activeView === 'ai' ? 'var(--docs-accent-gold)' : 'var(--info-color)',
                        borderBottom: `1px solid ${activeView === 'ai' ? 'var(--docs-accent-gold)' : 'var(--info-color)'}`,
                        paddingBottom: '0.5rem', fontSize: '1rem',
                        fontFamily: 'inherit' 
                    }}>
                        {activeView === 'ai' ? 'AI Generated Content' : 'Credits & Team'}
                    </h4>
                    
                    <div style={{ flex: 1, overflowY: 'auto', textAlign: 'left', fontSize: '0.9rem', lineHeight: '1.6', color: '#ddd' }}>
                        {activeView === 'ai' ? (
                            <div style={{ whiteSpace: 'pre-wrap' }}>{settings.aiDisclaimer}</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <h5 style={{ color: '#aaa', margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase' }}>Created By</h5>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                                            {w.ownerImage ? <img src={w.ownerImage} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : null}
                                        </div>
                                        <span style={{ fontWeight: 'bold' }}>{w.ownerName}</span>
                                        <span style={{ fontSize: '0.7rem', background: 'var(--info-color)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>OWNER</span>
                                    </div>
                                    {collaborators.map((c: any) => (
                                        <div key={c.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '0.5rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', background: '#333', flexShrink: 0 }}>
                                                {c.image ? <img src={c.image} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : null}
                                            </div>
                                            <span style={{ fontWeight: 'bold' }}>{c.username}</span>
                                            <span style={{ fontSize: '0.7rem', border: '1px solid #555', color: '#aaa', padding: '2px 6px', borderRadius: '4px', textTransform:'uppercase' }}>{c.role}</span>
                                        </div>
                                    ))}
                                </div>
                                {hasAttributions && (
                                    <div>
                                        <h5 style={{ color: '#aaa', margin: '0 0 0.5rem 0', fontSize: '0.8rem', textTransform: 'uppercase' }}>Attributions</h5>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{settings.attributions}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase' }}>(Click to close)</div>
                </div>
                <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', position: 'relative', borderBottom: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    {w.coverImage ? (
                        <img src={w.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} alt={w.title} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--bg-panel) 0%, var(--bg-main) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', opacity: 0.7 }}>
                            <span style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'serif' }}>{(w.title || '?').charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    
                    {isInProgress && (
                        <div style={{ 
                            position: 'absolute', top: 10, left: 10, 
                            background: 'var(--tool-accent)', color: 'black', 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 20 
                        }}>
                            🚧 IN DEVELOPMENT
                        </div>
                    )}

                    {isOwner && w.ownerId && w.currentUserId && w.ownerId !== w.currentUserId && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: 'var(--success-color)', color: 'black', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 20 }}>COLLABORATOR</div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '34px', background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0))', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', zIndex: 10 }}>
                        
                        {(hasTeam || hasAttributions) && (
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('creators'); }}
                                style={{ background: 'rgba(52, 152, 219, 0.25)', border: '1px solid var(--info-color)', color: 'var(--info-color)', borderRadius: '3px', fontSize: '0.85rem', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', backdropFilter: 'blur(2px)', transition: 'all 0.2s' }}
                                title="View Creators"
                            >
                                Creators
                            </button>
                        )}

                        {hasAI && (
                            <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveView('ai'); }}
                                style={{ background: 'rgba(243, 156, 18, 0.25)', border: '1px solid var(--docs-accent-gold)', color: 'var(--docs-accent-gold)', borderRadius: '3px', fontSize: '0.85rem', padding: '2px 8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', backdropFilter: 'blur(2px)', transition: 'all 0.2s' }}
                                title="Contains AI Content"
                            >
                                AI Info
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: '1.4', fontWeight: '600' }}>{w.title}</h3>
                    </div>

                    {tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            {tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} style={{ fontSize: '0.65rem', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{tag}</span>
                            ))}
                        </div>
                    )}
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1.5rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {w.summary || "No summary provided."}
                    </p>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                        <button 
                            onClick={handlePlayClick}
                            className="continue-button" 
                            style={{ flex: 1, textDecoration: 'none', padding: '0.6rem', textAlign: 'center', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', border: 'none' }}
                        >
                            Play
                        </button>
                        {isOwner ? (
                            <Link href={`/create/${w.worldId}/settings`} className="return-button" style={{ flex: 1, textDecoration: 'none', padding: '0.6rem', textAlign: 'center', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500' }}>Edit</Link>
                        ) : (
                            isOpenSource && (
                                <Link 
                                    href={`/create/${w.worldId}/settings`} 
                                    className="return-button" 
                                    style={{ 
                                        flex: 1, textDecoration: 'none', padding: '0.6rem', textAlign: 'center', 
                                        borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500',
                                        background: 'var(--bg-subtle)', color: 'var(--text-secondary)'
                                    }}
                                    title="View Source (Read-Only)"
                                >
                                    Source
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}