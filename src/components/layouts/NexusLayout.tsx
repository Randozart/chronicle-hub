'use client';

import React, { useState } from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
    isTransitioning?: boolean; // Added Prop
}

export default function NexusLayout({ sidebarContent, mainContent, settings, isTransitioning }: NexusLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="layout-grid-nexus">
            {/* LEFT SIDEBAR - Stable, no fade */}
            <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                 <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                {sidebarContent}
            </div>
            
            {/* MAIN CONTENT - Fades on transition */}
            <div 
                className="layout-column content-area"
                style={{ 
                    opacity: isTransitioning ? 0 : 1, 
                    transition: 'opacity 0.2s ease-in-out',
                    transform: isTransitioning ? 'translateY(10px)' : 'none' // Subtle slide up effect
                }}
            >
                {mainContent}
                
                <button 
                    className="mobile-sidebar-toggle"
                    onClick={() => setMobileSidebarOpen(true)}
                >
                    Character Info
                </button>
            </div>
        </div>
    );
}