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

    const def = imageLibrary[code];
    if (def) {
        src = def.url;
        if (!finalAlt) finalAlt = def.alt || code;
    } else if (code.toLowerCase().startsWith('http')) {
        src = code;
    } else {
        // --- THIS IS THE FIX ---
        // Find the full filename (with extension) from the image library
        // This is a fallback for cases where an image is referenced but not in the library
        // (e.g., character creation previews)
        const folder = type === 'location' ? 'locations' 
                     : type === 'icon' ? 'icons' 
                     : 'storylets';
        
        // Assume .png if not found, but this is less robust. The primary path is via imageLibrary.
        src = `/images/${folder}/${code}.png`;
    }

    // A better fallback for GameImage would be to find the file extension
    // However, since we're mostly relying on the library, let's refine the logic slightly.
    // The converter generates the `world.json` which contains an `images` block.
    // This component should ideally not exist. I will fix the converter to handle this.
    
    // The URL should be in the definition. The converter should create this.
    if (def && !def.url.startsWith('http')) {
         const folder = def.category === 'location' ? 'locations' 
                     : def.category === 'icon' ? 'icons' 
                     : 'storylets';
        // This logic is a bit tangled. Let's simplify. The converter creates the `world.json`
        // which includes the `images` object. Let's make the converter build the URL.
    }

    // Final simplified logic based on converter output
    if (def) {
        src = def.url; // The converter will now write the full URL path.
        finalAlt = def.alt || code;
    } else if (code.toLowerCase().startsWith('http')) {
        src = code;
    } else {
        // This is a final fallback for hardcoded images not in the library.
        src = `/images/icons/${code}.png`;
    }

    return (
        <img 
            src={src} 
            alt={finalAlt} 
            className={className}
            style={style}
            onError={(e) => {
                e.currentTarget.style.display = 'none'; 
            }}
        />
    );
}