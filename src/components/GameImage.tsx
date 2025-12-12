'use client';

import { ImageDefinition } from "@/engine/models";
import { CSSProperties } from "react";

interface GameImageProps {
    code?: string; 
    alt?: string;
    className?: string;
    imageLibrary: Record<string, ImageDefinition>;
    style?: CSSProperties;
    // The 'type' prop is no longer needed for pathing, but we keep it for potential future styling hooks.
    type?: string; 
}

export default function GameImage({ code, alt, className, imageLibrary, style }: GameImageProps) {
    if (!code) return null;

    let src = '';
    let finalAlt = alt || '';

    // --- 1. PRIMARY PATH: Look in the Image Library ---
    const def = imageLibrary[code];
    if (def && def.url) {
        // The converter now provides the full, correct path.
        src = def.url; 
        if (!finalAlt) finalAlt = def.alt || code;
    } 
    // --- 2. SECONDARY PATH: Handle external URLs ---
    else if (code.toLowerCase().startsWith('http')) {
        src = code;
    } 
    // --- 3. SIMPLIFIED FALLBACK: If not in library, build a path to the single /uploads/ folder ---
    else {
        // We assume the 'code' is the filename without extension.
        // We start with .png and let onError find the correct extension.
        src = `/images/uploads/${code}.png`;
    }

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const currentSrc = e.currentTarget.src;
        // Prevent infinite loops if no image is ever found
        if (e.currentTarget.dataset.tried) return;

        let nextSrc = '';

        // Chain-load common extensions
        if (currentSrc.endsWith('.png')) {
            nextSrc = currentSrc.replace('.png', '.jpg');
        } else if (currentSrc.endsWith('.jpg')) {
            nextSrc = currentSrc.replace('.jpg', '.jpeg');
        } else if (currentSrc.endsWith('.jpeg')) {
            nextSrc = currentSrc.replace('.jpeg', '.gif');
        }

        if (nextSrc) {
            e.currentTarget.src = nextSrc;
        } else {
            // If we've tried all extensions, hide the element.
            e.currentTarget.style.display = 'none'; 
        }
    };

    return (
        <img 
            src={src} 
            alt={finalAlt} 
            className={className}
            style={style}
            onError={handleImageError}
        />
    );
}