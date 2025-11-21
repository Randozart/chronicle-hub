// src/components/OpportunityHand.tsx

'use client';
import { Opportunity, PlayerQualities, WorldContent } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";
import { repositories } from "@/engine/repositories";
import { useEffect } from "react";

interface OpportunityHandProps {
    hand: Opportunity[];
    onCardClick: (opportunityId: string) => void;
    qualities: PlayerQualities;
    onDrawClick: () => void;
    isLoading: boolean;
    gameData: WorldContent; 
}

export default function OpportunityHand({ hand, onCardClick, qualities, onDrawClick, isLoading, gameData }: OpportunityHandProps) {
    
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
                                <img src={`/images/storylets/${card.image_code}.png`} alt="" className="card-image" />
                            )}
                            <div className="card-text">
                                <h3>{evaluateText(card.name, qualities)}</h3>
                                {card.short && <p>{evaluateText(card.short, qualities)}</p>}
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