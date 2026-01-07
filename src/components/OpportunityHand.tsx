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
    
    let buttonText = isLoading ? "Drawing..." : isHandFull ? `Hand Full (${hand.length}/${handSize})` : isEmpty ? "Deck Empty" : "Draw a Card";

    // --- CONFIG ---
    // @ts-ignore
    const layoutStyle = (deckDef?.card_style && deckDef.card_style !== 'default') 
        ? deckDef.card_style 
        // @ts-ignore
        : (settings.componentConfig?.handStyle || 'cards');

    const isRow = layoutStyle === 'rows';
    const isImagesOnly = layoutStyle === 'images-only';
    const isTarot = layoutStyle === 'tarot';

    // Image shape handling
    // @ts-ignore
    const globalImageShape = settings.imageConfig?.storylet || 'default';
    
    // In Tarot or Images-Only mode, we force specific shapes regardless of global setting
    let shapeOverride = undefined;
    if (isImagesOnly) shapeOverride = 'square';
    if (isTarot) shapeOverride = 'default'; // Let CSS ratio handle it
    if (isRow && globalImageShape === 'circle') shapeOverride = 'circle';

    // Dynamic Container Style
    const containerStyle: React.CSSProperties = isRow 
        ? { display: 'flex', flexDirection: 'column', gap: '1rem' }
        : layoutStyle === 'scrolling'
            ? { display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }
            : { /* Grid handled by CSS classes */ };

    return (
        <div className="opportunity-hand">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                {deckDef && isFinite && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-highlight)' }}>
                        <span style={{ fontWeight: 'bold' }}>{currentCharges}</span> / {deckSize} Cards
                        {currentCharges < deckSize && (
                            <DeckTimer deck={deckDef} settings={settings} lastUpdate={lastUpdate} currentCharges={currentCharges} maxCharges={deckSize} onRegen={() => {}} />
                        )}
                    </div>
                )}
            </div>

            <div className={`card-container mode-${layoutStyle}`} style={containerStyle}>
                {hand.length > 0 ? (
                    hand.map(card => {
                        const evaluatedName = engine.evaluateText(card.name, { qid: card.id, state: qualities[card.id] });
                        const evaluatedShort = card.short ? engine.evaluateText(card.short, { qid: card.id, state: qualities[card.id] }) : "";
                        const isValid = evaluateCondition(card.draw_condition, qualities, qualityDefs, null, 0);
                        const isTransient = !card.keep_if_invalid;
                        
                        if (isTransient && !isValid) return null; 

                        return (
                            <div 
                                key={card.id} 
                                className="card" 
                                style={layoutStyle === 'scrolling' ? { minWidth: '250px' } : { position: 'relative' }}
                                title={isImagesOnly ? evaluatedName : undefined}
                            >
                                <button 
                                    className="card-content-btn" 
                                    onClick={() => onCardClick(card.id)}
                                    // Switch flex direction for Rows
                                    style={isRow ? { display: 'flex', flexDirection: 'row', alignItems: 'flex-start', textAlign: 'left', width: '100%' } : {}}
                                >
                                    {card.image_code && (
                                        <div style={isRow ? { width: '80px', flexShrink: 0, marginRight: '1rem' } : {}}>
                                            <GameImage 
                                                code={card.image_code} 
                                                imageLibrary={imageLibrary} 
                                                type="storylet" 
                                                alt={evaluatedName} 
                                                className="card-image"
                                                settings={settings}
                                                shapeOverride={shapeOverride}
                                                evaluateText={(text) => engine.evaluateText(text, { qid: card.id, state: qualities[card.id] })}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Hide text in Images-Only mode */}
                                    {!isImagesOnly && (
                                        <div className="card-text">
                                            <h3><FormattedText text={evaluatedName} /></h3>
                                            {/* Hide body text in Tarot mode too (CSS handles it, but explicit check is safer) */}
                                            {evaluatedShort && !isTarot && <p><FormattedText text={evaluatedShort} /></p>}
                                        </div>
                                    )}

                                    {/* Overlay for Images Only */}
                                    {isImagesOnly && (
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                                            padding: '2rem 0.5rem 0.5rem 0.5rem',
                                            color: '#fff', fontSize: '0.75rem', fontWeight: 'bold',
                                            textAlign: 'center', pointerEvents: 'none'
                                        }}>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                <FormattedText text={evaluatedName} />
                                            </span>
                                        </div>
                                    )}
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
                                    >✕</button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="no-cards-text">Your hand is empty.</p>
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