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

    // Parallax Logic
    const parallaxEnabled = settings.enableParallax !== false;
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!parallaxEnabled) return;
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        setMousePos({ x, y });
    };
    
    // Parallax intensity
    const moveX = parallaxEnabled ? (mousePos.x - 0.5) * 40 : 0;
    const moveY = parallaxEnabled ? (mousePos.y - 0.5) * 40 : 0;

    const bgDef = imageLibrary[location.image];
    const bgSrc = bgDef ? bgDef.url : `/images/locations/${location.image}.png`;

    return (
        <div onMouseMove={handleMouseMove} style={{ height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative', color: '#eee', background: '#000' }}>
            
            {/* BACKGROUND LAYER (Parallax) */}
            <div style={{ position: 'absolute', top: '-50px', left: '-50px', right: '-50px', bottom: '-50px', zIndex: 0, transition: 'transform 0.1s ease-out', transform: `translate3d(${-moveX}px, ${-moveY}px, 0)` }}>
                <img 
                    src={bgSrc} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5)' }} 
                    onError={(e) => e.currentTarget.style.display = 'none'} 
                />
                {/* Vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.8) 100%)' }} />
            </div>

            {/* --- LEFT SIDEBAR (Glass HUD) --- */}
            <div style={{ 
                width: '400px', 
                borderRight: '1px solid rgba(255,255,255,0.1)', 
                background: 'rgba(10, 10, 15, 0.6)', 
                backdropFilter: 'blur(20px)', 
                display: 'flex', flexDirection: 'column', 
                zIndex: 10, 
                boxShadow: '5px 0 20px rgba(0,0,0,0.5)',
                flexShrink: 0
            }}>
                {sidebarContent}
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 5 }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 2rem', minHeight: '100%' }}>
                    {/* Inject Main Content */}
                    <div className="elysium-content-wrapper">
                        {mainContent}
                    </div>
                </div>
            </div>
        </div>
    );
}