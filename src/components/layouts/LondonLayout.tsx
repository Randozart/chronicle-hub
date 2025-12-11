'use client';

import React from 'react';
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
    return (
        <div className="layout-column" style={{ height: '100vh' }}>
            
            {/* --- BANNER --- */}
            <div className="layout-banner" style={{ position: 'relative', height: '250px', flexShrink: 0, overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'absolute', inset: 0 }}>
                    <GameImage code={location.image} imageLibrary={imageLibrary} type="location" alt="" className="banner-bg-image" />
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-main), transparent)' }} />
                
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
                    <button onClick={onExit} className="switch-char-btn" style={{ background: 'rgba(0,0,0,0.6)', color: 'white', width: 'auto', border: '1px solid rgba(255,255,255,0.3)' }}>
                        Switch Character
                    </button>
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', padding: '2rem', textAlign: 'center', width: '100%', maxWidth: '1200px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 2px 10px rgba(0,0,0,0.9)', color: 'var(--accent-highlight)' }}>
                        {location.name}
                    </h1>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                         {currentMarketId && (
                            <button onClick={onOpenMarket} style={{ background: 'rgba(241, 196, 15, 0.2)', border: '1px solid #f1c40f', color: '#f1c40f', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>
                                Market
                            </button>
                        )}
                        <button onClick={onOpenMap} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid var(--text-primary)', color: 'var(--text-primary)', padding: '0.5rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', backdropFilter: 'blur(5px)' }}>
                            Travel
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN AREA --- */}
            <div className="content-area">
                <div className="layout-main-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                    <div className="layout-sidebar-col layout-column" style={{ gap: '1rem' }}>
                        {sidebarContent}
                    </div>
                    <div className="layout-content-col layout-column">
                        {mainContent}
                    </div>
                </div>
            </div>
        </div>
    );
}