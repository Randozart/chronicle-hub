// src/components/OpportunityHand.tsx
'use client';

import { Opportunity, PlayerQualities, QualityDefinition, ImageDefinition, CharacterDocument, DeckDefinition, WorldSettings } from "@/engine/models";
import { evaluateText, evaluateCondition } from "@/engine/textProcessor";
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
    const deckSize = currentDeckStats?.deckSize ?? 0;
    const handSize = currentDeckStats?.handSize ?? 3;
    const currentCharges = character.deckCharges?.[locationDeckId] ?? 0;
    const lastUpdate = character.lastDeckUpdate?.[locationDeckId] || new Date();
    
    const isHandFull = hand.length >= handSize;
    const isEmpty = deckSize > 0 && currentCharges <= 0;
    const isDisabled = isLoading || isHandFull || isEmpty;
    
    let buttonText = "Draw a Card";
    if (isLoading) buttonText = "Drawing...";
    else if (isHandFull) buttonText = `Hand Full (${hand.length}/${handSize})`;
    else if (isEmpty) buttonText = "Deck Empty";

    // --- NEW: DISCARD HANDLER ---
    // We need an API route for this, but for now let's assume we pass a handler or 
    // we can just use onCardClick with a special flag? 
    // Actually, we don't have a prop for onDiscard. 
    // We should probably add one to LayoutProps, but to fix it right now without touching parents:
    // We can allow clicking the 'X' to trigger a discard via a separate fetch here.
    
     const handleDiscard = async (cardId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Discard this card?")) return;
        
        try {
            const res = await fetch('/api/deck/draw', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    storyId: character.storyId, // You might need to pass storyId prop or get from context. 
                                               // Actually, 'character' has storyId.
                    characterId: character.characterId, 
                    cardId, 
                    deckId: locationDeckId 
                })
            });
            
            if (res.ok) {
                // Optimistically remove from UI or reload
                window.location.reload(); 
            } else {
                console.error("Failed to discard");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="opportunity-hand">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', border: 'none', padding: 0 }}>Opportunities</h2>
                {deckDef && deckSize > 0 && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)' }}>
                        <span style={{ fontWeight: 'bold' }}>{currentCharges}</span> / {deckSize} Cards
                        {currentCharges < deckSize && (
                            <DeckTimer deck={deckDef} settings={settings} lastUpdate={lastUpdate} currentCharges={currentCharges} maxCharges={deckSize} onRegen={() => window.location.reload()} />
                        )}
                    </div>
                )}
            </div>
            <div className="card-container">
                {hand.length > 0 ? (
                    hand.map(card => {
                        // CHECK TRANSIENCE
                        // If card is transient (keep_if_invalid is false/undefined) AND logic fails, hide/disable it
                        const isValid = evaluateCondition(card.draw_condition, qualities, qualityDefs, {}, null, 0);
                        const isTransient = !card.keep_if_invalid;
                        
                        // If it's transient and invalid, we shouldn't show it (or show it as dissolving)
                        if (isTransient && !isValid) return null; 

                        return (
                            <div key={card.id} className="card" style={{ position: 'relative' }}>
                                <button 
                                    className="card-content-btn"
                                    onClick={() => onCardClick(card.id)}
                                    style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, color: 'inherit' }}
                                >
                                    {card.image_code && (
                                        <GameImage code={card.image_code} imageLibrary={imageLibrary} type="storylet" alt={card.name} className="card-image" />
                                    )}
                                    <div className="card-text">
                                        <h3>{evaluateText(card.name, qualities, qualityDefs, null, 0)}</h3>
                                        {card.short && <p>{evaluateText(card.short, qualities, qualityDefs, null, 0)}</p>}
                                    </div>
                                </button>
                                
                                {card.can_discard !== false && (
                                    <button 
                                        onClick={(e) => handleDiscard(card.id, e)}
                                        style={{
                                            position: 'absolute', top: 5, right: 5,
                                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                                            border: '1px solid #aaa', borderRadius: '50%',
                                            width: '24px', height: '24px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.8rem'
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