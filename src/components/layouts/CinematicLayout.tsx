'use client';
import React from 'react';
import { LocationDefinition, WorldSettings, ImageDefinition } from '@/engine/models';

interface CinematicLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    isTransitioning?: boolean;
    hasRightColumn?: boolean;
}

/**
 * Cinematic layout: a full-bleed location banner across the top (the location's
 * wide image, title overlaid on a gradient fade), with the standard sidebar +
 * content columns below. The banner is the scene; the game continues under it.
 */
export default function CinematicLayout({
    sidebarContent,
    mainContent,
    location,
    imageLibrary,
    isTransitioning,
}: CinematicLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

    const img: ImageDefinition | undefined = location?.image ? imageLibrary?.[location.image] : undefined;
    const bannerUrl = img?.url;
    const locName = location?.name ?? '';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
            {mobileSidebarOpen && (
                <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
            )}

            {/* ======== the banner ======== */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: 'min(38vh, 380px)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-panel)',
                    borderBottom: '1px solid var(--border-color)',
                }}
            >
                {bannerUrl && (
                    <img
                        src={bannerUrl}
                        alt={img?.alt || locName}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center 45%',
                            display: 'block',
                            opacity: isTransitioning ? 0.35 : 1,
                            transition: 'opacity 0.3s ease-in-out',
                        }}
                    />
                )}
                {/* fade to the room */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(180deg, rgba(10,14,20,0.3) 0%, rgba(10,14,20,0) 42%, rgba(10,14,20,0.94) 100%)',
                    }}
                />
                {/* title block */}
                <div style={{ position: 'absolute', left: 'clamp(1rem, 4vw, 3rem)', bottom: '1.2rem' }}>
                    <div
                        style={{
                            width: '3.2rem',
                            height: '2px',
                            backgroundColor: 'var(--accent-highlight)',
                            marginBottom: '0.55rem',
                        }}
                    />
                    <h1
                        style={{
                            margin: 0,
                            fontFamily: 'var(--font-header)',
                            fontSize: 'clamp(1.2rem, 3vw, 2.1rem)',
                            letterSpacing: '0.32em',
                            textTransform: 'uppercase',
                            color: 'var(--text-primary)',
                            textShadow: '0 2px 14px rgba(0,0,0,0.85)',
                            fontWeight: 'normal',
                        }}
                    >
                        {locName}
                    </h1>
                </div>
            </div>

            {/* ======== body: sidebar + content ======== */}
            <div className="layout-grid-nexus">
                <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                    <div
                        className="mobile-drawer-toggle"
                        onClick={() => setMobileSidebarOpen(false)}
                        title="Close Sidebar"
                    >
                        ◀
                    </div>
                    {sidebarContent}
                </div>

                <div
                    className="layout-column content-area"
                    style={{
                        opacity: isTransitioning ? 0 : 1,
                        transition: 'opacity 0.2s ease-in-out',
                        transform: isTransitioning ? 'translateY(10px)' : 'none',
                        overflowY: 'auto',
                        height: '100%',
                    }}
                >
                    {mainContent}
                </div>

                <button className="mobile-sidebar-toggle" onClick={() => setMobileSidebarOpen(true)}>
                    Character Sheet
                </button>
            </div>
        </div>
    );
}
