'use client';

import React, { useState } from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
}

export default function NexusLayout({ sidebarContent, mainContent, settings }: NexusLayoutProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="layout-grid-nexus">
            {/* LEFT SIDEBAR */}
            <div className={`sidebar-panel ${mobileSidebarOpen ? 'mobile-visible' : ''}`}>
                 <div className="mobile-close-btn" onClick={() => setMobileSidebarOpen(false)}>× Close</div>
                {sidebarContent}
            </div>
            
            {/* MAIN CONTENT */}
            <div className="layout-column content-area">
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