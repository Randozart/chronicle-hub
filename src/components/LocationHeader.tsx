// src/components/LocationHeader.tsx
'use client';

import { LocationDefinition } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";

interface LocationHeaderProps {
    location: LocationDefinition;
}

export default function LocationHeader({ location }: LocationHeaderProps) {
    if (!location) return null;

    return (
        <div className="location-header">
            {location.image && (
                 <div className="location-image-container">
                    <img 
                        src={`/images/locations/${location.image}.png`} 
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
    );
}