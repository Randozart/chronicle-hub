'use client';

import { ImageDefinition, WorldSettings } from '@/engine/models';
import React, { useMemo } from 'react';

interface GameImageProps {
    code: string;
    imageLibrary: Record<string, ImageDefinition>;
    alt?: string;
    type?: 'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'cover' | 'location' | 'uncategorized';
    className?: string;
    style?: React.CSSProperties;
    evaluateText?: (text: string) => string;
    
    // New Props for Configuration
    settings?: WorldSettings; 
    shapeOverride?: string; // Allow specific components to override global settings
}

export default function GameImage({ code, imageLibrary, alt, type, className, style, evaluateText, settings, shapeOverride }: GameImageProps) {
    
    // 1. Resolve ScribeScript
    const resolvedCode = useMemo(() => {
        if (evaluateText && code && (code.includes('{') || code.includes('$'))) {
            return evaluateText(code);
        }
        return code;
    }, [code, evaluateText]);

    // 2. Determine Source
    const def = imageLibrary[resolvedCode];
    let initialSrc = '';
    
    if (def && def.url) {
        initialSrc = def.url;
    } else if (resolvedCode?.toLowerCase().startsWith('http')) {
        initialSrc = resolvedCode;
    } else if (resolvedCode) {
        initialSrc = `/images/uploads/${resolvedCode}.png`;
    }

    // 3. Fallback Chain
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const img = e.currentTarget;
        const currentSrc = img.src;
        
        if (img.dataset.tried === 'true') {
            img.style.display = 'none'; // Give up
            return;
        }

        // Try common extensions if PNG fails
        let nextSrc = '';
        if (currentSrc.endsWith('.png')) nextSrc = currentSrc.replace('.png', '.jpg');
        else if (currentSrc.endsWith('.jpg')) nextSrc = currentSrc.replace('.jpg', '.jpeg');
        else if (currentSrc.endsWith('.jpeg')) nextSrc = currentSrc.replace('.jpeg', '.gif');
        else if (currentSrc.endsWith('.gif')) nextSrc = currentSrc.replace('.gif', '.webp');

        if (nextSrc) {
            img.src = nextSrc;
        } else {
            img.dataset.tried = 'true'; // Mark failure
            img.style.display = 'none';
        }
    };

    if (!resolvedCode) {
        return <div className={`game-image-placeholder ${className || ''}`} style={{ background: '#222', ...style }}><span style={{color:'#444'}}>?</span></div>;
    }

    // 4. Shape Logic
    // Priority: Override > Settings > Default
    let shape = shapeOverride;
    
    if (!shape || shape === 'default') {
        const configKey = type || 'uncategorized';
        // @ts-ignore
        shape = settings?.imageConfig?.[configKey] || 'default';
    }

    const shapeStyles: React.CSSProperties = {};

    switch (shape) {
        case 'circle': 
            shapeStyles.borderRadius = '50%'; 
            shapeStyles.aspectRatio = '1 / 1';
            break;
        case 'rounded': 
            shapeStyles.borderRadius = '12px'; 
            break;
        case 'square': 
            shapeStyles.aspectRatio = '1 / 1'; 
            shapeStyles.borderRadius = 'var(--border-radius)';
            break;
        case 'rect':
        case 'portrait': 
            shapeStyles.aspectRatio = '3 / 4'; 
            shapeStyles.borderRadius = 'var(--border-radius)';
            break;
        case 'landscape': 
            shapeStyles.aspectRatio = '4 / 3'; 
            shapeStyles.borderRadius = 'var(--border-radius)';
            break;
        case 'wide': 
            shapeStyles.aspectRatio = '16 / 9'; 
            shapeStyles.borderRadius = 'var(--border-radius)';
            break;
        default:
            // Defaults per type if 'default' is selected
            if (type === 'icon') shapeStyles.borderRadius = '4px';
            if (type === 'portrait') shapeStyles.borderRadius = '50%';
            break;
    }

    const objectPosition = def?.focus ? `${def.focus.x}% ${def.focus.y}%` : 'center';

    return (
        <div 
            className={`game-image-wrapper ${className || ''}`} 
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden',
                ...shapeStyles, 
                ...style 
            }}
        >
            <img
                key={resolvedCode} 
                src={initialSrc}
                alt={alt || def?.alt || resolvedCode}
                onError={handleImageError}
                className="fade-in-image"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: objectPosition,
                    animation: 'fadeIn 0.5s ease-out'
                }}

            />
        </div>
    );
}