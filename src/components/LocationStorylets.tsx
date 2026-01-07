'use client';

import { Storylet, PlayerQualities, QualityDefinition, ImageDefinition, WorldSettings } from "@/engine/models";
import { evaluateText, evaluateCondition } from "@/engine/textProcessor";
import GameImage from "./GameImage";

interface LocationStoryletsProps {
    storylets: Storylet[];
    onStoryletClick: (storyletId: string) => void;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings; 
}

export default function LocationStorylets({ storylets, onStoryletClick, qualities, qualityDefs, imageLibrary, settings }: LocationStoryletsProps) {
    const visibleStorylets = storylets.filter(s => evaluateCondition(s.visible_if, qualities, qualityDefs, null, 0));

    if (visibleStorylets.length === 0) return null;

    // Config extraction
    const cfg = settings.componentConfig || {};
    const layoutStyle = cfg.storyletListStyle || 'rows';
    const widthConstraint = cfg.storyletWidth || 'full';
    const imageStyle = cfg.storyletImageStyle || 'default';

    // Container Styles
    const isGrid = layoutStyle === 'cards';
    
    // CHANGED: Removed 'storylet-container' to remove the visual box/border.
    // Kept mode-* and list-constraint-* classes for spacing/layout helpers if needed by CSS.
    const containerClass = `storylet-list mode-${layoutStyle} list-constraint-${widthConstraint}`;
    
    // Grid Override
    const gridStyle: React.CSSProperties = isGrid 
        ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }
        : { display: 'flex', flexDirection: 'column', gap: '1rem' };

    return (
        <div className="location-storylets">
            <h2 className={widthConstraint === 'narrow' ? 'list-constraint-narrow' : ''}>Actions</h2>
            
            <div className={containerClass} style={gridStyle}>
                {visibleStorylets.map(storylet => (
                    <button 
                        key={storylet.id}
                        className={`option-button ${isGrid ? 'card-mode' : ''}`}
                        onClick={() => onStoryletClick(storylet.id)}
                        // Grid Mode: Stack vertically. Row Mode: Flex Row.
                        style={isGrid ? { display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' } : {}}
                    >
                        <div 
                            className="option-content-wrapper" 
                            style={isGrid ? { flexDirection: 'column', padding: 0 } : {}}
                        >
                            {storylet.image_code && (
                                <div 
                                    className={`option-image-container img-style-${imageStyle}`}
                                    style={isGrid ? { width: '100%', height: '160px', marginBottom: '0.5rem', marginRight: 0 } : {}}
                                >
                                    <GameImage 
                                        code={storylet.image_code} 
                                        imageLibrary={imageLibrary} 
                                        type="storylet"
                                        alt={storylet.name}
                                        className="option-image"
                                        settings={settings}
                                        // If using specific styles like circle/square-small, pass specific override to GameImage to ensure radius calculations
                                        shapeOverride={imageStyle === 'circle' ? 'circle' : undefined}
                                        // Fix for React Style Error: Explicitly handle corners if needed, or let CSS handle it.
                                        // For grid cards, we often want flat bottoms on images.
                                        style={isGrid ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}
                                    />
                                </div>
                            )}
                             <div className="option-text-wrapper" style={isGrid ? { padding: '1rem', paddingTop: 0 } : {}}>
                                <h3 style={{ fontSize: '1.1rem' }}>{evaluateText(storylet.name, qualities, qualityDefs, null, 0)}</h3>
                                {storylet.short && <p className="option-short-desc">{evaluateText(storylet.short, qualities, qualityDefs, null, 0)}</p>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}