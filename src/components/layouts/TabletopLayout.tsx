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
    isTransitioning?: boolean; // Added Prop
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

    // Parallax Logic
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
            
            {/* COLUMN 1: SIDEBAR (Hidden on Mobile unless toggled) */}
            <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                {sidebarContent}
            </div>

            {/* COLUMN 2: VISUAL & NAV (Top on mobile) */}
            <div className="tabletop-visual-col">
                <div className="visual-parallax-layer" style={{ transform: `translate3d(${moveX}px, ${moveY}px, 0)` }}>
                    {/* GameImage handles key-based fade */}
                    <GameImage 
                        code={location.image} 
                        imageLibrary={imageLibrary} 
                        type="location" 
                        alt="" 
                        className="w-full h-full object-cover" 
                    />
                </div>
                <div className="tabletop-visual-overlay" />
                
                {/* Navigation Buttons */}
                <div className="visual-nav-buttons">
                    <button onClick={onOpenMap} className="nav-btn-primary">Travel</button>
                    {currentMarketId && (
                        <button onClick={onOpenMarket} className="nav-btn-gold">Market</button>
                    )}
                </div>
            </div>

            {/* COLUMN 3: MAIN CONTENT */}
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
                
                {/* Mobile FAB to toggle Sidebar */}
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