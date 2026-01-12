'use client';

import React, { useState, useEffect } from 'react';
import { WorldSettings, LocationDefinition, ImageDefinition } from '@/engine/models';
import GameImage from '../GameImage';

interface LondonLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    onExit: () => void;
    onOpenMap?: () => void;
    onOpenMarket: () => void;
    currentMarketId?: string;
    isTransitioning?: boolean;
}

export default function LondonLayout({ 
    sidebarContent, 
    mainContent, 
    location, 
    imageLibrary, 
    onExit, 
    onOpenMap, 
    onOpenMarket, 
    currentMarketId,
    isTransitioning
}: LondonLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    
    return (
        // THE ONLY CHANGE IS ON THIS LINE
        <div className="layout-column london-layout-container" style={{ minHeight: '100vh' }}>
            
            <div className="content-area" style={{ padding: 0 }}>
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
                            <button 
                                onClick={onOpenMap} 
                                className="banner-btn-travel"
                                disabled={!onOpenMap} 
                                style={!onOpenMap ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                                Travel
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID */}
                <div className="layout-main-grid">
                    
                    {/* SIDEBAR - Uses common .sidebar-panel class for mobile drawer behavior */}
                    <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                        <button className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</button>
                        {sidebarContent}
                    </div>
                    
                    {/* CONTENT COLUMN */}
                    <div 
                        className="layout-content-col layout-column"
                        style={{ 
                            opacity: isTransitioning ? 0 : 1, 
                            transition: 'opacity 0.2s ease-in-out',
                            width: '100%', 
                            height: '100%'
                        }}
                    >
                        {mainContent}
                        
              
                    </div>
                </div>
                          {/* MOBILE FAB */}
                        <button 
                            className="mobile-sidebar-toggle"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            Character Sheet
                        </button>
            </div>
        </div>
    );
}