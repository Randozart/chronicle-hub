import { ImageDefinition } from '@/engine/models';
import Image from 'next/image';

interface GameImageProps {
    code: string;
    imageLibrary: Record<string, ImageDefinition>;
    alt?: string;
    type?: string; // Context hint
    className?: string;
    priority?: boolean;
}

export default function GameImage({ code, imageLibrary, alt, type, className, priority }: GameImageProps) {
    const def = imageLibrary[code];
    
    // Fallback for missing images
    if (!def || !def.url) {
        return (
            <div className={`game-image-placeholder ${className || ''}`} style={{ background: '#222', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2rem', color: '#333' }}>?</span>
            </div>
        );
    }

    // Calculate Object Position based on Focus
    // Default is 'center' (50% 50%)
    const objectPosition = def.focus 
        ? `${def.focus.x}% ${def.focus.y}%` 
        : 'center';

    return (
        <div className={`game-image-wrapper ${className || ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <img
                src={def.url}
                alt={alt || def.alt || code}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover', // Required for filling container
                    objectPosition: objectPosition, // <--- THE MAGIC
                }}
                // We use standard <img> for now because Next/Image requires whitelist configuration 
                // for every external domain, which might be tricky with user uploads.
                // If using Next/Image, add: style={{ objectFit: 'cover', objectPosition }}
            />
        </div>
    );
}