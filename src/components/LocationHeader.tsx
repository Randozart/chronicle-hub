'use client';

import { ImageDefinition, LocationDefinition } from "@/engine/models";
import GameImage from "./GameImage";
import FormattedText from "./FormattedText";

interface LocationHeaderProps {
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    onOpenMap?: () => void; 
    onOpenMarket?: () => void;
    styleMode?: 'standard' | 'banner' | 'square' | 'circle' | 'title-card' | 'hidden'; 
}

export default function LocationHeader({ 
    location, 
    imageLibrary, 
    onOpenMap, 
    onOpenMarket,
    styleMode = 'standard'
}: LocationHeaderProps) {
    if (!location) return null;
    const imageCode = location.image;
    const canTravel = !!location.regionId;
    const showIcon = imageCode && 
        styleMode !== 'hidden' && 
        styleMode !== 'banner' && 
        styleMode !== 'title-card';
    
    const shapeClass = styleMode === 'square' ? 'shape-square' : (styleMode === 'circle' ? 'shape-circle' : 'shape-standard');

    return (
        <div className={`location-header mode-${styleMode}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                
                {showIcon && (
                    <div className={`location-image-container ${shapeClass}`}>
                        <GameImage 
                            code={imageCode} 
                            imageLibrary={imageLibrary} 
                            type="location"
                            alt={location.name}
                            className="location-image"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                )}
                
                <div className="location-text">
                    {/* Need to modify the logic for this one at a later point. */}
                    {/* <h2>You are in...</h2> */}
                    <h1><FormattedText text={location.name} /></h1>
                    {location.description && (
                        <div className="location-description" style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '60ch' }}>
                            <FormattedText text={location.description} />
                        </div>
                    )}
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