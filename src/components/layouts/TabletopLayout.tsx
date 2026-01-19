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
    onOpenMap?: () => void;
    onOpenMarket: () => void;
    currentMarketId?: string;
    onExit: () => void;
    isTransitioning?: boolean;
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
    isTransitioning
}: TabletopLayoutProps) {
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const parallaxEnabled = settings.enableParallax !== false;
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!parallaxEnabled) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
    };
    
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * -15 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * -15 : 0;

    return (
        <div className="layout-grid-tabletop" onMouseMove={handleMouseMove}>
            
            {mobileSidebarOpen && (
                <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
            )}

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
            <div className="tabletop-visual-col">
                <div className="visual-parallax-layer" style={{ transform: `translate3d(${moveX}px, ${moveY}px, 0)` }}>
                    <GameImage 
                        code={location.image} 
                        imageLibrary={imageLibrary} 
                        type="location" 
                        alt="" 
                        className="w-full h-full object-cover" 
                    />
                </div>
                <div className="tabletop-visual-overlay" />
                <div className="visual-nav-buttons">
                    <button onClick={onOpenMap} className="nav-btn-primary">Travel</button>
                    {currentMarketId && (
                        <button onClick={onOpenMarket} className="nav-btn-gold">Market</button>
                    )}
                </div>
            </div>
            <div className="layout-column content-column">
                <div 
                    className="content-area"
                    style={{ 
                        opacity: isTransitioning ? 0 : 1, 
                        transition: 'opacity 0.2s ease-in-out' 
                    }}
                >
                    {mainContent}
                </div>
                <button 
                    className="mobile-sidebar-toggle"
                    onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                    Character Sheet
                </button>
            </div>
        </div>
    );
}