'use client';

import { useState } from "react";
import { Opportunity, PlayerQualities, QualityDefinition, ImageDefinition, CharacterDocument, DeckDefinition, WorldSettings } from "@/engine/models";
import { evaluateCondition } from "@/engine/textProcessor";
import GameImage from "./GameImage";
import DeckTimer from "./DeckTimer";
import FormattedText from "./FormattedText";
import { GameEngine } from "@/engine/gameEngine";
import DeckEmptyModal from "./DeckEmptyModal"; 
import GameModal from "./GameModal";

interface OpportunityHandProps {
    hand: Opportunity[];
    onCardClick: (opportunityId: string) => void;
    qualities: PlayerQualities;
    onDrawClick: () => void;
    onDiscard?: (cardId: string) => void;
    onRegen?: () => void;
    isLoading: boolean;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    character: CharacterDocument;
    locationDeckId: string;
    deckDefs: Record<string, DeckDefinition>;
    settings: WorldSettings;
    currentDeckStats?: { handSize: number, deckSize: number };
    engine: GameEngine; 
    actionTimestamp?: string | Date; 
}

export default function OpportunityHand({ 
    hand, onCardClick, qualities, onDrawClick, onDiscard, isLoading, 
    qualityDefs, imageLibrary, character, locationDeckId, deckDefs, settings, currentDeckStats, engine,
    onRegen, actionTimestamp
}: OpportunityHandProps) {

    const [showEmptyModal, setShowEmptyModal] = useState(false);
    const [cardToDiscard, setCardToDiscard] = useState<string | null>(null);

    const deckDef = deckDefs[locationDeckId];
    const deckSize = currentDeckStats?.deckSize ?? 0;
    const handSize = currentDeckStats?.handSize ?? 3;
    const currentCharges = character.deckCharges?.[locationDeckId] ?? deckSize;
    const lastUpdate = character.lastDeckUpdate?.[locationDeckId] || new Date();
    const isHandFull = hand.length >= handSize;
    const isFinite = deckSize > 0;
    const isEmpty = isFinite && currentCharges <= 0;
    
    const isButtonDisabled = isLoading || isHandFull; 
    
    let buttonText = isLoading ? "Drawing..." : isHandFull ? `Hand Full (${hand.length}/${handSize})` : isEmpty ? "Refilling..." : "Draw a Card";

    const handleDrawInteraction = () => {
        if (isEmpty) {
            setShowEmptyModal(true);
        } else {
            onDrawClick();
        }
    };

    const handleDiscardConfirm = () => {
        if (cardToDiscard && onDiscard) {
            onDiscard(cardToDiscard);
            setCardToDiscard(null);
        }
    };

    const renderDiscardBtn = (card: Opportunity) => {
        if (card.can_discard === false || !onDiscard) return null;
        return (
            <button 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setCardToDiscard(card.id); 
                }} 
                style={{ 
                    position: 'absolute', top: 5, right: 5, zIndex: 10, 
                    background:'rgba(0,0,0,0.5)', color:'white', border:'none', 
                    borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} 
                title="Discard"
            >✕</button>
        );
    };

    const layoutStyle = (deckDef?.card_style) 
        ? deckDef.card_style 
        : (settings.componentConfig?.handStyle || 'cards');

    const useCardStructure = ['cards', 'polaroid', 'images-only', 'tarot', 'scrolling'].includes(layoutStyle);
    const containerClass = useCardStructure ? `card-container mode-${layoutStyle} list-constraint-full` : `storylet-list-container mode-${layoutStyle}`;

    return (
        <div className="opportunity-hand">
            {deckDef && (
                <DeckEmptyModal 
                    isOpen={showEmptyModal}
                    onClose={() => setShowEmptyModal(false)}
                    deck={deckDef}
                    settings={settings}
                    currentCharges={currentCharges}
                    maxCharges={deckSize}
                    lastUpdate={lastUpdate}
                    actionTimestamp={actionTimestamp}
                    onRegen={onRegen || (() => {})}
                />
            )}
            <GameModal 
                isOpen={!!cardToDiscard}
                title="Discard Card?"
                message="Are you sure you want to discard this opportunity? It may not return for some time."
                confirmLabel="Discard"
                onConfirm={handleDiscardConfirm}
                onClose={() => setCardToDiscard(null)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                {deckDef && isFinite && (
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <span style={{ marginRight: '5px' }}>Deck:</span>
                        <span style={{ 
                            fontWeight: 'bold', 
                            color: currentCharges === 0 ? 'var(--danger-color)' : 'var(--text-secondary)'
                        }}>{currentCharges}</span> 
                        <span style={{ margin: '0 2px' }}>/</span> 
                        <span>{deckSize}</span>
                        
                        <DeckTimer 
                            deck={deckDef} 
                            settings={settings} 
                            lastUpdate={lastUpdate} 
                            currentCharges={currentCharges} 
                            maxCharges={deckSize} 
                            actionTimestamp={actionTimestamp}
                            onRegen={onRegen || (() => {})}
                        />
                    </div>
                )}
            </div>

            <div className={containerClass}>
                {hand.length > 0 ? (
                    hand.map(card => {
                        const evaluatedName = engine.evaluateText(card.name, { qid: card.id, state: qualities[card.id] });
                        const evaluatedShort = card.short ? engine.evaluateText(card.short, { qid: card.id, state: qualities[card.id] }) : "";
                        
                        const isValid = evaluateCondition(card.draw_condition, qualities, qualityDefs, null, 0);
                        const isTransient = !card.keep_if_invalid;

                        if (isTransient && !isValid) return null;
                        
                        const discardButton = (card.can_discard !== false && onDiscard) ? (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setCardToDiscard(card.id);
                                }} 
                                style={{ 
                                    position: 'absolute', top: 5, right: 5, zIndex: 10, 
                                    background:'rgba(0,0,0,0.6)', color:'white', border:'1px solid rgba(255,255,255,0.3)', 
                                    borderRadius:'50%', width:'24px', height:'24px', cursor:'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }} 
                                title="Discard"
                            >✕</button>
                        ) : null;

                        if (layoutStyle === 'polaroid') {
                            return (
                                <div 
                                    key={card.id}
                                    className="option-button card-mode" 
                                    style={{ 
                                        position: 'relative', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        height: '100%',
                                        alignItems: 'stretch'
                                    }}
                                >
                                    <button
                                        onClick={() => onCardClick(card.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            margin: 0,
                                            width: '100%',
                                            height: '100%',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
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
                                            {card.image_code && (
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
                                                        code={card.image_code}
                                                        imageLibrary={imageLibrary}
                                                        type="storylet"
                                                        alt={evaluatedName}
                                                        className="option-image"
                                                        settings={settings}
                                                        evaluateText={(text) =>
                                                            engine.evaluateText(text, {
                                                                qid: card.id,
                                                                state: qualities[card.id]
                                                            })
                                                        }
                                                        style={{
                                                            borderBottomLeftRadius: 0,
                                                            borderBottomRightRadius: 0
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            <div
                                                className="option-text-wrapper"
                                                style={{ padding: '0 1rem 1rem', textAlign: 'left' }}
                                            >
                                                <h3><FormattedText text={evaluatedName} inline/></h3>
                                                {evaluatedShort && <div className="option-short-desc"><FormattedText text={evaluatedShort} /></div>}
                                            </div>
                                        </div>
                                    </button>
                                    {renderDiscardBtn(card)}
                                </div>
                            );
                        }

                                                
                        if (layoutStyle === 'rows' || layoutStyle === 'compact') {
                            return (
                                <div 
                                    key={card.id}
                                    className="option-button"
                                    style={{ 
                                        position: 'relative',
                                        padding: 0,
                                        display: 'flex',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <button
                                        onClick={() => onCardClick(card.id)}
                                        style={{
                                            flex: 1,
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '1rem',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'block',
                                            width: '100%'
                                        }}
                                    >
                                        <div className="option-content-wrapper">
                                            {card.image_code && (
                                                <div className="option-image-container">
                                                    <GameImage
                                                        code={card.image_code}
                                                        imageLibrary={imageLibrary}
                                                        type="storylet"
                                                        alt={evaluatedName}
                                                        className="option-image"
                                                        settings={settings}
                                                        evaluateText={(text) =>
                                                            engine.evaluateText(text, {
                                                                qid: card.id,
                                                                state: qualities[card.id]
                                                            })
                                                        }
                                                    />
                                                </div>
                                            )}

                                            <div className="option-text-wrapper">
                                                <h3 style={{ marginRight: '30px' }}>
                                                    <FormattedText text={evaluatedName} inline/>
                                                </h3>
                                                {evaluatedShort && (
                                                    <div><FormattedText text={evaluatedShort} /></div>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {renderDiscardBtn(card)}
                                </div>
                            );
                        }

                        
                        return (
                            <div key={card.id} className="card" title={layoutStyle === 'images-only' ? evaluatedName : undefined}>
                                <button className="card-content-btn" onClick={() => onCardClick(card.id)}>
                                        {card.image_code && (
                                            <GameImage code={card.image_code} imageLibrary={imageLibrary} type="storylet" alt={evaluatedName} className="card-image" settings={settings} evaluateText={(text) => engine.evaluateText(text, { qid: card.id, state: qualities[card.id] })} />
                                        )}                                       
                                        <div className="card-text"><h3><FormattedText text={evaluatedName} inline/></h3>{evaluatedShort && layoutStyle !== 'tarot' && <div><FormattedText text={evaluatedShort} /></div>}</div>
                                    {layoutStyle === 'images-only' && <div className="image-only-overlay"><FormattedText text={evaluatedName} /></div>}
                                </button>
                                {renderDiscardBtn(card)}
                            </div>
                        );
                    })
                ) : ( <div className="no-cards-text">Your hand is empty.</div> )}
            </div>
            
            <div className="deck-actions">
                <button 
                    className="deck-button" 
                    onClick={handleDrawInteraction} 
                    disabled={isButtonDisabled} 
                    style={isButtonDisabled ? { opacity: 0.5, cursor: 'not-allowed', background: '#444' } : {}}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}