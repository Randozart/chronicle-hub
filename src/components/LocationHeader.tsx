// src/components/LocationHeader.tsx
'use client';

import { ImageDefinition, LocationDefinition } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";
import GameImage from "./GameImage";

interface LocationHeaderProps {
    location: LocationDefinition;
    imageLibrary: Record<string, ImageDefinition>; // Add type
}

export default function LocationHeader({ location, imageLibrary }: LocationHeaderProps) {
    if (!location) return null;

    return (
        <div className="location-header">
            {location.image && (
                 <div className="location-image-container">
                    <GameImage 
                        code={location.image} 
                        imageLibrary={imageLibrary} 
                        type="location" // or "icon" depending on component
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