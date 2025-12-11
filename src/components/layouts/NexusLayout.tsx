'use client';

import React from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
}

export default function NexusLayout({ sidebarContent, mainContent, settings }: NexusLayoutProps) {
    // Dynamic grid style: 360px sidebar for Black Crown, 320px default
    const gridStyle = settings.visualTheme === 'black-crown' 
        ? { gridTemplateColumns: '360px 1fr' } 
        : { gridTemplateColumns: '320px 1fr' };

    return (
        <div className="layout-grid-nexus" style={gridStyle}>
            {/* LEFT SIDEBAR */}
            <div className="sidebar-panel">
                {sidebarContent}
            </div>
            
            {/* MAIN CONTENT */}
            <div className="layout-column" style={{ overflow: 'hidden' }}>
                {mainContent}
            </div>
        </div>
    );
}