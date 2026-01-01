'use client';

import React, { useState } from 'react';
import { WorldSettings, LocationDefinition, ImageDefinition } from '@/engine/models';
import GameImage from '../GameImage';

interface LondonLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    onExit: () => void;
    onOpenMap: () => void;
    onOpenMarket: () => void;
    currentMarketId?: string;
}

export default function LondonLayout({ 
    sidebarContent, 
    mainContent, 
    location, 
    imageLibrary, 
    onExit, 
    onOpenMap, 
    onOpenMarket, 
    currentMarketId 
}: LondonLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="layout-column" style={{ height: '100vh' }}>
            
            {/* --- BANNER --- */}
            <div className="layout-banner">
                <div className="banner-image-container">
                    <GameImage code={location.image} imageLibrary={imageLibrary} type="location" alt="" className="banner-bg-image" />
                </div>
                <div className="banner-gradient-overlay" />
                
                <div className="banner-top-controls">
                    <button onClick={onExit} className="switch-char-btn-transparent">
                        Switch Character
                    </button>
                </div>

                <div className="banner-content">
                    <h1 className="banner-title">{location.name}</h1>
                    
                    <div className="banner-actions">
                         {currentMarketId && (
                            <button onClick={onOpenMarket} className="banner-btn-market">Market</button>
                        )}
                        <button onClick={onOpenMap} className="banner-btn-travel">Travel</button>
                    </div>
                </div>
            </div>

            {/* --- MAIN AREA --- */}
            <div className="content-area">
                <div className="layout-main-grid">
                    {/* Sidebar */}
                    <div className={`layout-sidebar-col layout-column ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                        <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                        {sidebarContent}
                    </div>
                    
                    {/* Content */}
                    <div className="layout-content-col layout-column">
                        {mainContent}
                        
                        <button 
                            className="mobile-sidebar-toggle"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            View Character
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}