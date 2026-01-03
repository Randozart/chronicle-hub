'use client';

import React, { useState, useEffect } from 'react';
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
    
    // NEW: State to track if we're on a mobile device
    const [isMobile, setIsMobile] = useState(false);

    // NEW: Client-side effect to check screen width
    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth <= 900);
        };
        // Check on mount
        checkDevice();
        // Check on resize
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);


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

    // THE FIX: Conditionally choose the correct class name
    const sidebarClassName = isMobile ? 'sidebar-panel' : 'elysium-sidebar';

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

            {/* --- SIDEBAR --- */}
            {/* Uses the dynamic class name. On mobile, it becomes .sidebar-panel */}
            <div className={`${sidebarClassName} ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
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

            {/* --- CLOSE BUTTON (as sibling) --- */}
            {/* This will now work because .sidebar-panel has the correct mobile styles */}
            {mobileSidebarOpen && (
                <button 
                    className="mobile-close-btn" 
                    onClick={() => setMobileSidebarOpen(false)}
                    type="button"
                >
                    × Close
                </button>
            )}
        </div>
    );
}