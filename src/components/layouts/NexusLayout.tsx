'use client';

import React from 'react';
import { WorldSettings } from '@/engine/models';

interface NexusLayoutProps {
    sidebarContent: React.ReactNode;
    mainContent: React.ReactNode;
    settings: WorldSettings;
}

export default function NexusLayout({ sidebarContent, mainContent, settings }: NexusLayoutProps) {
    return (
        /* 
           We remove any inline styles here. 
           We rely 100% on the CSS grid to handle width and scrolling.
        */
        <div className="layout-grid-nexus">
            {/* LEFT SIDEBAR - The fixed column */}
            <div className="sidebar-panel">
                {sidebarContent}
            </div>
            
            {/* MAIN CONTENT - The fluid column */}
            <div className="layout-column content-area">
                {mainContent}
            </div>
        </div>
    );
}