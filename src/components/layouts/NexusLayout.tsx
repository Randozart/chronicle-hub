'use client';

import React, { useState } from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
    isTransitioning?: boolean;
}

export default function NexusLayout({ sidebarContent, mainContent, settings, isTransitioning }: NexusLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    const isCentered = settings.nexusCenteredLayout === true;

    return (
        <div className={`layout-grid-nexus ${isCentered ? 'mode-centered' : ''}`}>
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