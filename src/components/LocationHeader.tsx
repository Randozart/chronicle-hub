'use client';

import { ImageDefinition, LocationDefinition } from "@/engine/models";
import GameImage from "./GameImage";

interface LocationHeaderProps {
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    onOpenMap: () => void; 
    onOpenMarket?: () => void;
}

export default function LocationHeader({ location, imageLibrary, onOpenMap, onOpenMarket }: LocationHeaderProps) {
    if (!location) return null;

    // FIX: Check for both 'imageId' (standard in your models) and 'image' (legacy)
    // This ensures we get the code regardless of which property name the database uses.
    // @ts-ignore - Ignoring TS error if one property doesn't exist on the specific type definition
    const imageCode = location.image;
    const canTravel = !!location.regionId;

    return (
        <div className="location-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                
                {/* 
                   NOTE: In 'Black Crown Banner Mode', the CSS hides this specific container 
                   (.location-image-container) because the image is shown as a massive 
                   background by GameHub instead.
                   
                   In 'Standard Mode', this will display the circle icon.
                */}
                {imageCode && (
                    <div className="location-image-container">
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
                    {/* The h2/h1 styling is handled by CSS based on theme */}
                    <h2>You are in...</h2>
                    <h1>{location.name}</h1>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>    
                {onOpenMarket && (
                    <button 
                        onClick={onOpenMarket}
                        style={{
                            background: 'var(--bg-item)', 
                            border: '1px solid var(--accent-highlight)',
                            color: 'var(--accent-highlight)',
                            padding: '0.75rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold', cursor: 'pointer',
                            fontSize: '1rem', height: 'fit-content',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                        className="hover:bg-[rgba(241,196,15,0.1)] transition"
                    >
                        Market
                    </button>
                )}

                {/* TRAVEL BUTTON */}
                {canTravel && (
                    <button 
                        onClick={onOpenMap}
                        style={{
                            background: 'var(--accent-primary)', color: 'white', border: 'none',
                            padding: '0.75rem 1.5rem', borderRadius: '4px',
                            fontWeight: 'bold', cursor: 'pointer',
                            fontSize: '1rem', height: 'fit-content'
                        }}
                        className="hover:bg-[var(--accent-hover)] transition"
                    >
                        Travel
                    </button>
                )}
            </div>
        </div>
    );
}