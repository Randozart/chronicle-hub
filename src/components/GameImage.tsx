'use client';

import { ImageCategory, ImageDefinition } from "@/engine/models";

interface GameImageProps {
    code?: string; 
    alt?: string;
    type?: ImageCategory; // Use the shared type instead of a hardcoded union
    className?: string;
    imageLibrary: Record<string, ImageDefinition>;
}

export default function GameImage({ code, alt, type, className, imageLibrary }: GameImageProps) {
    if (!code) return null;

    let src = '';
    let finalAlt = alt || '';

    // 1. Check the Central Library first
    const def = imageLibrary[code];
    if (def) {
        src = def.url;
        if (!finalAlt) finalAlt = def.alt || code;
    } 
    // 2. Fallback: Check if it's a raw URL (quick prototyping)
    else if (code.startsWith('http')) {
        src = code;
    }
    // 3. Fallback: Legacy Local System
    else {
        // If the code is not in the library, assume it's a local file name
        const folder = type === 'location' ? 'locations' 
                     : type === 'icon' ? 'icons' 
                     : 'storylets';
        src = `/images/${folder}/${code}.png`;
    }

    return (
        <img 
            src={src} 
            alt={finalAlt} 
            className={className}
            onError={(e) => {
                e.currentTarget.style.display = 'none'; // Hide broken images? or show placeholder
                // e.currentTarget.src = '/images/placeholder.png';
            }}
        />
    );
}