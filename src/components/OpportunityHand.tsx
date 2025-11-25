// src/components/OpportunityHand.tsx

'use client';
import { Opportunity, PlayerQualities, WorldContent, QualityDefinition, ImageDefinition } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";
//import { repositories } from "@/engine/repositories";
import { useEffect } from "react";
import GameImage from "./GameImage";

interface OpportunityHandProps {
    hand: Opportunity[];
    onCardClick: (opportunityId: string) => void;
    qualities: PlayerQualities;
    onDrawClick: () => void;
    isLoading: boolean;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>; 
}

export default function OpportunityHand({ hand, onCardClick, qualities, onDrawClick, isLoading, qualityDefs, imageLibrary }: OpportunityHandProps) {
    
    return (
        <div className="opportunity-hand">
            <h2>Opportunities</h2>
            <div className="card-container">
                {hand.length > 0 ? (
                    hand.map(card => (
                        <button 
                            key={card.id} 
                            className="card" 
                            onClick={() => onCardClick(card.id)}
                        >
                            {card.image_code && (
                                <GameImage 
                                    code={card.image_code} 
                                    imageLibrary={imageLibrary} 
                                    type="storylet" // or "icon" depending on component
                                    alt={card.name}
                                    className="card-image"
                                />
                            )}
                            <div className="card-text">
                                <h3>{evaluateText(card.name, qualities, qualityDefs)}</h3>
                                {card.short && <p>{evaluateText(card.short, qualities, qualityDefs)}</p>}
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="no-cards-text">Your hand is empty. Try drawing a card.</p>
                )}
            </div>
            <div className="deck-actions">
            <button className="deck-button" onClick={onDrawClick} disabled={isLoading}>
                {isLoading ? 'Drawing...' : 'Draw a Card'}
            </button>
        </div>
        </div>
    );
}