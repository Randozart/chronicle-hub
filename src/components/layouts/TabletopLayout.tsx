'use client';

import React, { useState } from 'react';
import { WorldSettings, LocationDefinition, ImageDefinition } from '@/engine/models';
import GameImage from '../GameImage';

interface TabletopLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    onOpenMap: () => void;
    onOpenMarket: () => void;
    currentMarketId?: string;
    onExit: () => void;
}

export default function TabletopLayout({ 
    sidebarContent, 
    mainContent, 
    location, 
    imageLibrary, 
    settings,
    onOpenMap,
    onOpenMarket,
    currentMarketId,
    onExit
}: TabletopLayoutProps) {
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    // Parallax Logic
    const parallaxEnabled = settings.enableParallax !== false;
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!parallaxEnabled) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
    };
    
    // Subtle movement for tabletop
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * -15 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * -15 : 0;

    return (
        <div className="layout-grid-tabletop" onMouseMove={handleMouseMove} style={{ display: 'grid', gridTemplateColumns: '280px minmax(300px, 35%) 1fr', height: '100vh', overflow: 'hidden', backgroundColor: '#121212', color: '#ccc' }}>
            
            {/* COLUMN 1: SIDEBAR */}
            <div className="sidebar-panel" style={{ backgroundColor: '#181a1f', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                {sidebarContent}
            </div>

            {/* COLUMN 2: VISUAL & NAV (Center Column) */}
            <div className="tabletop-visual-col" style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid #333', background: '#000', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.8)', zIndex: 1 }}>
                <div style={{ position: 'absolute', top: '-20px', bottom: '-20px', left: '-20px', right: '-20px', transform: `translate3d(${moveX}px, ${moveY}px, 0)`, transition: 'transform 0.1s ease-out' }}>
                    <GameImage code={location.image} imageLibrary={imageLibrary} type="location" alt="" className="w-full h-full object-cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="tabletop-visual-overlay" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 40%, #000 120%)', pointerEvents: 'none' }} />
                
                {/* Navigation Buttons Floating at Bottom */}
                <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '10px', zIndex: 10 }}>
                    <button 
                        onClick={onOpenMap}
                        style={{ background: '#000', border: '1px solid var(--accent-highlight)', color: 'var(--accent-highlight)', padding: '0.6rem 1.5rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', boxShadow: '0 0 15px rgba(0,0,0,0.8)' }}
                        className="hover:bg-[var(--accent-highlight)] hover:text-black transition"
                    >
                        Travel
                    </button>
                    {currentMarketId && (
                        <button 
                            onClick={onOpenMarket}
                            style={{ background: '#000', border: '1px solid #f1c40f', color: '#f1c40f', padding: '0.6rem 1.5rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}
                            className="hover:bg-[#f1c40f] hover:text-black transition"
                        >
                            Market
                        </button>
                    )}
                </div>
            </div>

            {/* COLUMN 3: MAIN CONTENT */}
            <div className="layout-column" style={{ background: '#1e1e1e', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
                <div className="content-area" style={{ padding: '3rem 4rem', flex: 1, overflowY: 'auto' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        {mainContent}
                    </div>
                </div>
            </div>
        </div>
    );
}