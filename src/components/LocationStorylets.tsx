// src/components/LocationStorylets.tsx
'use client';

import { Storylet, PlayerQualities, QualityDefinition, ImageDefinition } from "@/engine/models";
import { evaluateText, evaluateCondition } from "@/engine/textProcessor";
import GameImage from "./GameImage";

interface LocationStoryletsProps {
    storylets: Storylet[];
    onStoryletClick: (storyletId: string) => void;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
}

export default function LocationStorylets({ storylets, onStoryletClick, qualities, qualityDefs, imageLibrary }: LocationStoryletsProps) {
    // Filter storylets based on visibility condition
    const visibleStorylets = storylets.filter(s => {
        // If no condition, it's visible. If condition exists, evaluate it against current qualities.
        // We pass empty objects for aliases/self as they aren't used in top-level visibility.
        return evaluateCondition(s.visible_if, qualities, qualityDefs, {}, null, 0);
    });

    if (visibleStorylets.length === 0) return null;

    return (
        <div className="location-storylets">
            <h2>Actions</h2>
            <div className="storylet-list-container">
                {visibleStorylets.map(storylet => (
                    <button 
                        key={storylet.id}
                        className="option-button"
                        onClick={() => onStoryletClick(storylet.id)}
                    >
                        <div className="option-content-wrapper">
                            {storylet.image_code && (
                                <div className="option-image-container">
                                    <GameImage 
                                        code={storylet.image_code} 
                                        imageLibrary={imageLibrary} 
                                        type="storylet"
                                        alt={storylet.name}
                                        className="option-image"
                                    />
                                </div>
                            )}
                             <div className="option-text-wrapper">
                                <h3>{evaluateText(storylet.name, qualities, qualityDefs, null, 0)}</h3>
                                {storylet.short && <p className="option-short-desc">{evaluateText(storylet.short, qualities, qualityDefs, null, 0)}</p>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}