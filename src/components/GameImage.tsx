import { ImageDefinition } from '@/engine/models';
import React, { useMemo } from 'react';

interface GameImageProps {
    code: string;
    imageLibrary: Record<string, ImageDefinition>;
    alt?: string;
    type?:  'icon' | 'banner' | 'background' | 'portrait' | 'map' | 'storylet' | 'cover' | 'location' | 'uncategorized';

    className?: string;
    priority?: boolean;
    style?: React.CSSProperties;
    evaluateText?: (text: string) => string;
}

export default function GameImage({ code, imageLibrary, alt, type, className, priority, style, evaluateText }: GameImageProps) {
        const resolvedCode = useMemo(() => {
        if (evaluateText && code && code.includes('{')) {
            return evaluateText(code);
        }
        return code;
    }, [code, evaluateText]);


    const def = imageLibrary[resolvedCode];
    
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
                    ...style 
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
                ...style 
            }}
        >
            <img
                key={resolvedCode} // Re-renders if the resolved code changes
                src={def.url}
                alt={alt || def.alt || resolvedCode}
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