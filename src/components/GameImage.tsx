'use client';

import { ImageCategory, ImageDefinition } from "@/engine/models";

interface GameImageProps {
    code?: string; 
    alt?: string;
    type?: ImageCategory; // Use the shared type instead of a hardcoded union
    className?: string;
    imageLibrary: Record<string, ImageDefinition>;
    style?: React.CSSProperties; // <--- ADD THIS
}

export default function GameImage({ code, alt, type, className, imageLibrary, style }: GameImageProps) {
    if (!code) return null;

    let src = '';
    let finalAlt = alt || '';

    const def = imageLibrary[code];
    if (def) {
        src = def.url;
        if (!finalAlt) finalAlt = def.alt || code;
    } else if (code.startsWith('http')) {
        src = code;
    } else {
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
            style={style} // <--- PASS IT DOWN
            onError={(e) => {
                e.currentTarget.style.display = 'none'; 
            }}
        />
    );
}