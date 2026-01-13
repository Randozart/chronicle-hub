'use client';
import React, { useState } from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
    isTransitioning?: boolean;
    hasRightColumn?: boolean;
}

export default function NexusLayout({ sidebarContent, mainContent, settings, isTransitioning, hasRightColumn }: NexusLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const isCentered = settings.nexusCenteredLayout === true;

    const containerClass = `
        layout-grid-nexus 
        ${isCentered ? 'mode-centered' : ''}
        ${isCentered && hasRightColumn ? 'mode-wide' : ''}
    `;

    return (
        <div className={containerClass.trim()}>
            <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                 <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                {sidebarContent}
            </div>
            
            <div 
                className="layout-column content-area"
                style={{ 
                    opacity: isTransitioning ? 0 : 1, 
                    transition: 'opacity 0.2s ease-in-out',
                    transform: isTransitioning ? 'translateY(10px)' : 'none'
                }}
            >
                {mainContent}
            </div>
            
            <button 
                className="mobile-sidebar-toggle"
                onClick={() => setMobileSidebarOpen(true)}
            >
                Character Sheet
            </button>
        </div>
    );
}