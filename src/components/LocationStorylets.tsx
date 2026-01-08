'use client';

import { Storylet, PlayerQualities, QualityDefinition, ImageDefinition, WorldSettings } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor"; // BUG FIX: Removed unused/harmful evaluateCondition import
import GameImage from "./GameImage";
import FormattedText from "./FormattedText";

interface LocationStoryletsProps {
    storylets: Storylet[];
    onStoryletClick: (storyletId: string) => void;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings; 
}

export default function LocationStorylets({ storylets, onStoryletClick, qualities, qualityDefs, imageLibrary, settings }: LocationStoryletsProps) {
    // BUG FIX: Removed the redundant .filter() here. 
    // GameHub has already filtered the storylets using the authoritative GameEngine (which has access to dynamic qualities).
    // Re-filtering here with the raw `evaluateCondition` often fails because it lacks the full context of the Engine.
    const visibleStorylets = storylets; 

    if (visibleStorylets.length === 0) return null;

    const cfg = settings.componentConfig || {};
    const layoutStyle = cfg.storyletListStyle || 'rows';

    const useCardStructure = ['cards', 'polaroid', 'images-only', 'tarot', 'scrolling'].includes(layoutStyle);
    const containerClass = useCardStructure ? `card-container mode-${layoutStyle}` : `storylet-list-container mode-${layoutStyle}`;

    return (
        <div className="location-storylets">
            <h2>Actions</h2>
            <div className={containerClass}>
                {visibleStorylets.map(storylet => {
                    const evaluatedName = evaluateText(storylet.name, qualities, qualityDefs, null, 0);
                    const evaluatedShort = storylet.short ? evaluateText(storylet.short, qualities, qualityDefs, null, 0) : "";

                    if (layoutStyle === 'polaroid') {
                        return (
                            <button
                                key={storylet.id}
                                className="option-button card-mode"
                                onClick={() => onStoryletClick(storylet.id)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    alignItems: 'stretch'
                                }}
                            >
                                <div
                                    className="option-content-wrapper"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: 1,
                                        padding: 0
                                    }}
                                >
                                    {storylet.image_code && (
                                        <div
                                            className="option-image-container"
                                            style={{
                                                width: '100%',
                                                height: '160px',
                                                marginBottom: '0.5rem',
                                                marginRight: 0
                                            }}
                                        >
                                            <GameImage
                                                code={storylet.image_code}
                                                imageLibrary={imageLibrary}
                                                type="storylet"
                                                alt={evaluatedName}
                                                className="option-image"
                                                settings={settings}
                                                style={{
                                                    borderBottomLeftRadius: 0,
                                                    borderBottomRightRadius: 0
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div
                                        className="option-text-wrapper"
                                        style={{ padding: '0 1rem 1rem' }}
                                    >
                                        <h3>{evaluatedName}</h3>
                                        {evaluatedShort && (
                                            <div className="option-short-desc">{evaluatedShort}</div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    }

                    if (layoutStyle === 'rows' || layoutStyle === 'compact') {
                         return (
                            <button key={storylet.id} className="option-button" onClick={() => onStoryletClick(storylet.id)}>
                                <div className="option-content-wrapper">
                                    {storylet.image_code && (
                                        <div className="option-image-container">
                                            <GameImage code={storylet.image_code} imageLibrary={imageLibrary} type="storylet" alt={evaluatedName} className="option-image" settings={settings}/>
                                        </div>
                                    )}
                                    <div className="option-text-wrapper">
                                        <h3><FormattedText text={evaluatedName} /></h3>
                                        {evaluatedShort && layoutStyle !== 'compact' && <div className="option-short-desc"><FormattedText text={evaluatedShort} /></div>}
                                    </div>
                                </div>
                            </button>
                        );
                    }
                    
                    return (
                         <div key={storylet.id} className="card" title={layoutStyle === 'images-only' ? evaluatedName : undefined}>
                                <button className="card-content-btn" onClick={() => onStoryletClick(storylet.id)}>
                                 {storylet.image_code && (
                                     <GameImage 
                                        code={storylet.image_code} 
                                        imageLibrary={imageLibrary} 
                                        type="storylet" 
                                        alt={evaluatedName} 
                                        className="card-image" 
                                        settings={settings}
                                    />
                                 )}                                 
                                 <div className="card-text">
                                     <h3><FormattedText text={evaluatedName} /></h3>
                                     {evaluatedShort && layoutStyle !== 'tarot' && <div><FormattedText text={evaluatedShort} /></div>}
                                 </div>
                                 {layoutStyle === 'images-only' && <div className="image-only-overlay"><FormattedText text={evaluatedName} /></div>}
                             </button>
                         </div>
                    );
                })}
            </div>
        </div>
    );
}