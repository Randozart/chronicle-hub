'use client';

import { ImageDefinition, LocationDefinition } from "@/engine/models";
import GameImage from "./GameImage";

interface LocationHeaderProps {
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    onOpenMap: () => void; 
    onOpenMarket?: () => void;
    // NEW: Accept the style setting
    styleMode?: 'standard' | 'banner' | 'square' | 'circle' | 'hidden'; 
}

export default function LocationHeader({ 
    location, 
    imageLibrary, 
    onOpenMap, 
    onOpenMarket,
    styleMode = 'standard' // Default to standard
}: LocationHeaderProps) {
    if (!location) return null;

    // @ts-ignore
    const imageCode = location.image;
    const canTravel = !!location.regionId;

    // LOGIC: When to show the icon?
    // 1. Image code must exist.
    // 2. styleMode must NOT be 'hidden'.
    // 3. styleMode must NOT be 'banner' (because the banner is handled by the wrapper in GameHub).
    const showIcon = imageCode && styleMode !== 'hidden' && styleMode !== 'banner';

    // CSS Class for specific shapes (square vs circle)
    // If standard, default to circle.
    const shapeClass = styleMode === 'square' ? 'square' : 'circle';

    return (
        <div className={`location-header mode-${styleMode}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                
                {showIcon && (
                    <div className={`location-image-container ${shapeClass}`}>
                        <GameImage 
                            code={imageCode} 
                            imageLibrary={imageLibrary} 
                            type="location"
                            alt={location.name}
                            className="location-image"
                        />
                    </div>
                )}
                
                <div className="location-text">
                    <h2>You are in...</h2>
                    <h1>{location.name}</h1>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>    
                {onOpenMarket && (
                    <button 
                        onClick={onOpenMarket}
                        className="market-btn hover:bg-[rgba(241,196,15,0.1)] transition"
                        style={{
                            background: 'var(--bg-item)', 
                            border: '1px solid var(--accent-highlight)',
                            color: 'var(--accent-highlight)',
                            padding: '0.75rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold', cursor: 'pointer',
                            fontSize: '1rem', height: 'fit-content',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        Market
                    </button>
                )}

                {canTravel && (
                    <button 
                        onClick={onOpenMap}
                        className="travel-btn hover:bg-[var(--accent-hover)] transition"
                        style={{
                            background: 'var(--accent-primary)', color: 'white', border: 'none',
                            padding: '0.75rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold', cursor: 'pointer',
                            fontSize: '1rem', height: 'fit-content'
                        }}
                    >
                        Travel
                    </button>
                )}
            </div>
        </div>
    );
}