'use client';

import React, { useState } from 'react';
import { WorldSettings, LocationDefinition, ImageDefinition } from '@/engine/models';

interface ElysiumLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
}

export default function ElysiumLayout({ 
    sidebarContent, 
    mainContent, 
    location, 
    imageLibrary, 
    settings 
}: ElysiumLayoutProps) {
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
    
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * 40 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * 40 : 0;

    const bgDef = imageLibrary[location.image];
    const bgSrc = bgDef ? bgDef.url : `/images/locations/${location.image}.png`;

    return (
        <div className="elysium-wrapper" onMouseMove={handleMouseMove}>
            
            {/* BACKGROUND LAYER (Parallax) */}
            <div className="elysium-bg-layer" style={{ transform: `translate3d(${-moveX}px, ${-moveY}px, 0)` }}>
                <img 
                    src={bgSrc} 
                    alt="" 
                    className="elysium-bg-img"
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                />
                <div className="elysium-vignette" />
            </div>

            {/* --- LEFT SIDEBAR (Glass HUD) --- */}
            <div className={`elysium-sidebar ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                {sidebarContent}
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="elysium-content">
                <div className="elysium-container">
                    <div className="elysium-content-wrapper">
                        {mainContent}
                    </div>
                    
                    <button 
                        className="mobile-sidebar-toggle"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        Open HUD
                    </button>
                </div>
            </div>
        </div>
    );
}