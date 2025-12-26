import { ImageDefinition } from '@/engine/models';
import React from 'react';

interface GameImageProps {
    code: string;
    imageLibrary: Record<string, ImageDefinition>;
    alt?: string;
    type?:  'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'cover' | 'location' | 'uncategorized';

    className?: string;
    priority?: boolean;
    style?: React.CSSProperties; // <--- ADDED THIS
}

export default function GameImage({ code, imageLibrary, alt, type, className, priority, style }: GameImageProps) {
    const def = imageLibrary[code];
    
    // Fallback for missing images
    if (!def || !def.url) {
        return (
            <div 
                className={`game-image-placeholder ${className || ''}`} 
                style={{ 
                    background: '#222', 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    ...style // <--- SPREAD HERE
                }}
            >
                <span style={{ fontSize: '2rem', color: '#333' }}>?</span>
            </div>
        );
    }

    // Calculate Object Position based on Focus
    const objectPosition = def.focus 
        ? `${def.focus.x}% ${def.focus.y}%` 
        : 'center';

    return (
        <div 
            className={`game-image-wrapper ${className || ''}`} 
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden',
                ...style // <--- SPREAD HERE
            }}
        >
            <img
                src={def.url}
                alt={alt || def.alt || code}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: objectPosition,
                }}
            />
        </div>
    );
}