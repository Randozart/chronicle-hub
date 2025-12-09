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

    // 1. Check Library First (ID lookup)
    const def = imageLibrary[code];
    if (def) {
        src = def.url;
        if (!finalAlt) finalAlt = def.alt || code;
    } 
    // 2. Check for Direct External Link
    else if (code.toLowerCase().startsWith('http')) {
        src = code;
    } 
    // 3. Fallback to Local Folder structure
    else {
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
            style={style}
            onError={(e) => {
                // If the image fails to load, hide it to prevent ugly broken link icons
                e.currentTarget.style.display = 'none'; 
            }}
        />
    );
}