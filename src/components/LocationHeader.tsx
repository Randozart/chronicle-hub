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

    return (
        <div className="location-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {location.image && (
                    <div className="location-image-container">
                        <GameImage 
                            code={location.image} 
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
                        <span>⚖️</span> Market
                    </button>
                )}

            {/* TRAVEL BUTTON */}
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
            </div>
        </div>
    );
}