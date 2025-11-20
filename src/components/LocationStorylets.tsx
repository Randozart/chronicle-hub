// src/components/LocationStorylets.tsx
'use client';

import { Storylet, PlayerQualities, WorldContent } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";

// --- UPDATE THE PROPS INTERFACE ---
interface LocationStoryletsProps {
    storylets: Storylet[];
    onStoryletClick: (storyletId: string) => void;
    qualities: PlayerQualities;
}

export default function LocationStorylets({ storylets, onStoryletClick, qualities }: LocationStoryletsProps) {
    if (storylets.length === 0) return null;

    return (
        <div className="location-storylets">
            <h2>Actions</h2>
            <div className="storylet-list-container">
                {storylets.map(storylet => (
                    <button 
                        key={storylet.id} 
                        className="option-button"
                        onClick={() => onStoryletClick(storylet.id)}
                    >
                        <div className="option-content-wrapper">
                            {storylet.image_code && (
                                <div className="option-image-container">
                                    <img 
                                        src={`/images/storylets/${storylet.image_code}.png`} 
                                        alt=""
                                        className="option-image"
                                    />
                                </div>
                            )}
                             <div className="option-text-wrapper">
                                {/* --- FIX THE CALLS TO evaluateText --- */}
                                <h3>{evaluateText(storylet.name, qualities)}</h3>
                                {storylet.short && <p className="option-short-desc">{evaluateText(storylet.short, qualities)}</p>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}