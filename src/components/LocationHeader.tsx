'use client';

import { ImageDefinition, LocationDefinition } from "@/engine/models";
import GameImage from "./GameImage";

interface LocationHeaderProps {
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>;
    onOpenMap: () => void; // <--- ADD THIS
}

export default function LocationHeader({ location, imageLibrary, onOpenMap }: LocationHeaderProps) {
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

            {/* TRAVEL BUTTON */}
            <button 
                onClick={onOpenMap}
                style={{
                    background: '#2a3e5c', color: 'white', border: 'none',
                    padding: '0.75rem 1.5rem', borderRadius: '4px',
                    fontWeight: 'bold', cursor: 'pointer',
                    fontSize: '1rem', height: 'fit-content'
                }}
                className="hover:bg-[#3e5a8a] transition"
            >
                Travel
            </button>
        </div>
    );
}