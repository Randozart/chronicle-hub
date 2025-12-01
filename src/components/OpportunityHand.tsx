'use client';

import { Opportunity, PlayerQualities, QualityDefinition, ImageDefinition, CharacterDocument, DeckDefinition, WorldSettings } from "@/engine/models";
import { evaluateText } from "@/engine/textProcessor";
import GameImage from "./GameImage";
import DeckTimer from "./DeckTimer";

interface OpportunityHandProps {
    hand: Opportunity[];
    onCardClick: (opportunityId: string) => void;
    qualities: PlayerQualities;
    onDrawClick: () => void;
    isLoading: boolean;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    
    // NEW PROPS
    character: CharacterDocument;
    locationDeckId: string;
    deckDefs: Record<string, DeckDefinition>;
    settings: WorldSettings;
    currentDeckStats?: { handSize: number, deckSize: number };
}

export default function OpportunityHand({ 
    hand, onCardClick, qualities, onDrawClick, isLoading, 
    qualityDefs, imageLibrary, 
    character, locationDeckId, deckDefs, settings, currentDeckStats,
}: OpportunityHandProps) {
    
    const deckDef = deckDefs[locationDeckId];

    // 1. Use Calculated Stats (or fallback)
    const deckSize = currentDeckStats?.deckSize ?? 0;
    const handSize = currentDeckStats?.handSize ?? 3;

    const currentCharges = character.deckCharges?.[locationDeckId] ?? 0;
    const lastUpdate = character.lastDeckUpdate?.[locationDeckId] || new Date();
    
    // 2. Determine Disable State
    const isHandFull = hand.length >= handSize;
    
    // Note: If deckSize is 0, it means Unlimited, so never empty.
    const isEmpty = deckSize > 0 && currentCharges <= 0;
    
    const isDisabled = isLoading || isHandFull || isEmpty;

    // 3. Button Text
    let buttonText = "Draw a Card";
    if (isLoading) buttonText = "Drawing...";
    else if (isHandFull) buttonText = `Hand Full (${hand.length}/${handSize})`;
    else if (isEmpty) buttonText = "Deck Empty";
    
    console.log("Deck Debug:", {
        deckId: locationDeckId,
        stats: currentDeckStats,
        calcDeckSize: deckSize,
        currentCharges,
        hasDef: !!deckDef,
        shouldShow: deckDef && deckSize > 0
    });

    return (
        <div className="opportunity-hand">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', border: 'none', padding: 0 }}>Opportunities</h2>
                
                {/* STATUS DISPLAY */}
                {/* Only show if deckSize > 0 (Limited Deck) */}
                {deckDef && deckSize > 0 && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)' }}>
                        <span style={{ fontWeight: 'bold' }}>{currentCharges}</span> / {deckSize} Cards
                        
                        {/* Show timer if missing a charge */}
                        {currentCharges < deckSize && (
                            <DeckTimer 
                                deck={deckDef}
                                settings={settings}
                                lastUpdate={lastUpdate}
                                currentCharges={currentCharges}
                                maxCharges={deckSize}
                                onRegen={() => window.location.reload()} // Simple refresh
                            />
                        )}
                    </div>
                )}
            </div>

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
                                    type="storylet" 
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
                    <p className="no-cards-text">Your hand is empty. Draw a card to see what happens.</p>
                )}
            </div>

            <div className="deck-actions">
                <button 
                    className="deck-button" 
                    onClick={onDrawClick} 
                    disabled={isDisabled}
                    style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', background: '#444' } : {}}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}