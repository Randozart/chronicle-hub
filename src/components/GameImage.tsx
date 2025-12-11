// src/components/GameImage.tsx
'use client';

import { ImageCategory, ImageDefinition } from "@/engine/models";
import { CSSProperties } from "react";

interface GameImageProps {
    code?: string; 
    alt?: string;
    type?: ImageCategory;
    className?: string;
    imageLibrary: Record<string, ImageDefinition>;
    style?: CSSProperties;
}

export default function GameImage({ code, alt, type, className, imageLibrary, style }: GameImageProps) {
    if (!code) return null;

    let src = '';
    let finalAlt = alt || '';

    // --- 1. PRIMARY PATH: Look in the Image Library ---
    // This is the ideal and most robust way.
    const def = imageLibrary[code];
    if (def) {
        src = def.url; // The data converter should provide the full path, e.g., /images/storylets/pig.png
        if (!finalAlt) finalAlt = def.alt || code;
    } 
    // --- 2. SECONDARY PATH: Handle external URLs ---
    else if (code.toLowerCase().startsWith('http')) {
        src = code;
    } 
    // --- 3. ROBUST FALLBACK: If not in library, build the path dynamically ---
    // This will correctly handle "1" and other simple codes.
    else {
        // Correctly determine the folder based on the component's 'type' prop.
        const folder = type === 'location' ? 'locations' 
                     : type === 'icon' ? 'icons' 
                     : 'storylets'; // Default to 'storylets'
        
        // We don't know the extension, so we'll start with .png and let onError handle the rest.
        src = `/images/${folder}/${code}.png`;
    }

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const currentSrc = e.currentTarget.src;
        let nextSrc = '';

        // Chain-load extensions: If .png fails, try .jpg. If .jpg fails, try .jpeg.
        if (currentSrc.endsWith('.png')) {
            nextSrc = currentSrc.replace('.png', '.jpg');
        } else if (currentSrc.endsWith('.jpg')) {
            nextSrc = currentSrc.replace('.jpg', '.jpeg');
        }

        // If we have a new source to try, set it. Otherwise, hide the element.
        if (nextSrc && e.currentTarget.src !== nextSrc) {
            e.currentTarget.src = nextSrc;
        } else {
            e.currentTarget.style.display = 'none'; // Final fallback: hide broken image
        }
    };

    return (
        <img 
            src={src} 
            alt={finalAlt} 
            className={className}
            style={style}
            // The onError handler makes the component smart about file extensions.
            onError={handleImageError}
        />
    );
}