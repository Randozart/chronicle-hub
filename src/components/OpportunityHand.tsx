'use client';

import { Opportunity, PlayerQualities, QualityDefinition, ImageDefinition, CharacterDocument, DeckDefinition, WorldSettings } from "@/engine/models";
import { evaluateText, evaluateCondition } from "@/engine/textProcessor";
import GameImage from "./GameImage";
import DeckTimer from "./DeckTimer";
import FormattedText from "./FormattedText";
import { GameEngine } from "@/engine/gameEngine";

interface OpportunityHandProps {
    hand: Opportunity[];
    onCardClick: (opportunityId: string) => void;
    qualities: PlayerQualities;
    onDrawClick: () => void;
    onDiscard?: (cardId: string) => void;
    isLoading: boolean;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    character: CharacterDocument;
    locationDeckId: string;
    deckDefs: Record<string, DeckDefinition>;
    settings: WorldSettings;
    currentDeckStats?: { handSize: number, deckSize: number };
    engine: GameEngine; 
}

export default function OpportunityHand({ 
    hand, onCardClick, qualities, onDrawClick, onDiscard, isLoading, 
    qualityDefs, imageLibrary, 
    character, locationDeckId, deckDefs, settings, currentDeckStats,
    engine 
}: OpportunityHandProps) {
    
    const deckDef = deckDefs[locationDeckId];
    const deckSize = currentDeckStats?.deckSize ?? 0;
    const handSize = currentDeckStats?.handSize ?? 3;
    
    const currentCharges = character.deckCharges?.[locationDeckId] ?? deckSize;
    const lastUpdate = character.lastDeckUpdate?.[locationDeckId] || new Date();
    
    const isHandFull = hand.length >= handSize;
    const isFinite = deckSize > 0;
    const isEmpty = isFinite && currentCharges <= 0;
    const isDisabled = isLoading || isHandFull || isEmpty;
    
    let buttonText = "Draw a Card";
    if (isLoading) buttonText = "Drawing...";
    else if (isHandFull) buttonText = `Hand Full (${hand.length}/${handSize})`;
    else if (isEmpty) buttonText = "Deck Empty";

    const handleDiscardClick = (cardId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDiscard && confirm("Discard this card?")) {
            onDiscard(cardId);
        }
    };

    return (
        <div className="opportunity-hand">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                {deckDef && isFinite && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)' }}>
                        <span style={{ fontWeight: 'bold' }}>{currentCharges}</span> / {deckSize} Cards
                        {currentCharges < deckSize && (
                            <DeckTimer 
                                deck={deckDef} 
                                settings={settings} 
                                lastUpdate={lastUpdate} 
                                currentCharges={currentCharges} 
                                maxCharges={deckSize} 
                                onRegen={() => { /* Consider local state update instead of reload */ }} 
                            />
                        )}
                    </div>
                )}
            </div>
            <div className="card-container">
                {hand.length > 0 ? (
                    hand.map(card => {
                        const evaluatedName = engine.evaluateText(card.name, { qid: card.id, state: qualities[card.id] });
                        const evaluatedShort = card.short ? engine.evaluateText(card.short, { qid: card.id, state: qualities[card.id] }) : "";

                        const isValid = evaluateCondition(card.draw_condition, qualities, qualityDefs, null, 0);
                        const isTransient = !card.keep_if_invalid;
                        
                        if (isTransient && !isValid) return null; 

                        return (
                            <div key={card.id} className="card" style={{ position: 'relative' }}>
                                <button className="card-content-btn" onClick={() => onCardClick(card.id)}>
                                    {card.image_code && (
                                        <GameImage 
                                            code={card.image_code} 
                                            imageLibrary={imageLibrary} 
                                            type="storylet" 
                                            alt={evaluatedName} 
                                            className="card-image"
                                            evaluateText={(text) => engine.evaluateText(text, { qid: card.id, state: qualities[card.id] })}
                                        />
                                    )}
                                    <div className="card-text">
                                        <h3><FormattedText text={evaluatedName} /></h3>
                                        {evaluatedShort && <p><FormattedText text={evaluatedShort} /></p>}
                                    </div>
                                </button>
                                
                                {card.can_discard !== false && onDiscard && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if (confirm("Discard?")) onDiscard(card.id); }}
                                        style={{
                                            position: 'absolute', top: 5, right: 5,
                                            background: 'rgba(0,0,0,0.6)', color: 'var(--text-primary)',
                                            border: '1px solid #aaa', borderRadius: '50%',
                                            width: '24px', height: '24px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem', zIndex: 10
                                        }}
                                        title="Discard"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="no-cards-text">Your hand is empty. Draw a card to see what happens.</p>
                )}
            </div>
            <div className="deck-actions">
                <button className="deck-button" onClick={onDrawClick} disabled={isDisabled} style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', background: '#444' } : {}}>
                    {buttonText}
                </button>
            </div>
        </div>
    );
}