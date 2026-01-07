'use client';

import { Opportunity, PlayerQualities, QualityDefinition, ImageDefinition, CharacterDocument, DeckDefinition, WorldSettings } from "@/engine/models";
import { evaluateCondition } from "@/engine/textProcessor";
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
    qualityDefs, imageLibrary, character, locationDeckId, deckDefs, settings, currentDeckStats, engine 
}: OpportunityHandProps) {
    //console.log("[OpportunityHand] Component is rendering. Received hand prop:", JSON.parse(JSON.stringify(hand)));

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

    const layoutStyle = (deckDef?.card_style) 
        ? deckDef.card_style 
        : (settings.componentConfig?.handStyle || 'cards');

    const useCardStructure = ['cards', 'polaroid', 'images-only', 'tarot', 'scrolling'].includes(layoutStyle);
    const containerClass = useCardStructure ? `card-container mode-${layoutStyle} list-constraint-full` : `storylet-list-container mode-${layoutStyle}`;

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

            <div className={containerClass}>
                {hand.length > 0 ? (
                    hand.map(card => {
                        //console.group(`[OpportunityHand] Processing Card: ${card.id}`);
                        //console.log("Input Card Object:", JSON.parse(JSON.stringify(card)));
                        //console.log("Input Name to Evaluate:", card.name);

                        //console.log("Engine state BEFORE eval (tempAliases):", { ...engine.tempAliases });
                        const evaluatedName = engine.evaluateText(card.name, { qid: card.id, state: qualities[card.id] });
                        //console.log("Output (evaluatedName):", evaluatedName);
                        //console.groupEnd();

                        const evaluatedShort = card.short ? engine.evaluateText(card.short, { qid: card.id, state: qualities[card.id] }) : "";
                        
                        const isValid = evaluateCondition(card.draw_condition, qualities, qualityDefs, null, 0);
                        const isTransient = !card.keep_if_invalid;

                        if (isTransient && !isValid) return null;

                        // Inside your hand.map(...) callback in OpportunityHand.tsx

                        if (layoutStyle === 'polaroid') {
                            return (
                                // --- CHANGE 1: Change the root element to a div and add position: 'relative' ---
                                <div 
                                    key={card.id}
                                    className="option-button card-mode" 
                                    style={{ 
                                        position: 'relative', // Necessary for absolute positioning the discard button
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        height: '100%',
                                        alignItems: 'stretch'
                                    }}
                                >
                                    {/* --- CHANGE 2: Wrap the main content in its own button --- */}
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
                                                <h3><FormattedText text={evaluatedName} /></h3>
                                                {evaluatedShort && <div className="option-short-desc"><FormattedText text={evaluatedShort} /></div>}
                                            </div>
                                        </div>
                                    </button>
                                    
                                    {/* --- CHANGE 3: Add the discard button, just like in your other card layout --- */}
                                    {card.can_discard !== false && onDiscard && (
                                        <button 
                                            onClick={(e) => { 
                                                e.stopPropagation(); // Prevent any other clicks
                                                if (confirm("Discard?")) {
                                                    onDiscard(card.id); 
                                                }
                                            }} 
                                            style={{ 
                                                position: 'absolute', 
                                                top: 5, 
                                                right: 5,
                                                background: 'rgba(0,0,0,0.6)', 
                                                color: 'var(--text-primary)',
                                                border: '1px solid #aaa', 
                                                borderRadius: '50%',
                                                width: '24px', 
                                                height: '24px', 
                                                cursor: 'pointer',
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                fontSize: '0.8rem', 
                                                zIndex: 10 // Ensure it's on top
                                            }} 
                                            title="Discard"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            );
                        }

                                                
                        if (layoutStyle === 'rows' || layoutStyle === 'compact') {
                            return (
                                <button
                                    key={card.id}
                                    className="option-button"
                                    onClick={() => onCardClick(card.id)}
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
                                            <h3><FormattedText text={evaluatedName} /></h3>
                                            {evaluatedShort && (
                                                <div><FormattedText text={evaluatedShort} /></div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        }

                        
                        return (
                            <div key={card.id} className="card" title={layoutStyle === 'images-only' ? evaluatedName : undefined}>
                                <button className="card-content-btn" onClick={() => onCardClick(card.id)}>
                                        {card.image_code && (
                                            <GameImage 
                                                code={card.image_code} 
                                                imageLibrary={imageLibrary} 
                                                type="storylet" 
                                                alt={evaluatedName} 
                                                className="card-image" 
                                                settings={settings} 
                                                evaluateText={(text) => engine.evaluateText(text, { qid: card.id, state: qualities[card.id] })}
                                            />
                                        )}                                       <div className="card-text"><h3><FormattedText text={evaluatedName} /></h3>{evaluatedShort && layoutStyle !== 'tarot' && <div><FormattedText text={evaluatedShort} /></div>}</div>
                                    {layoutStyle === 'images-only' && <div className="image-only-overlay"><FormattedText text={evaluatedName} /></div>}
                                </button>
                                {card.can_discard !== false && onDiscard && <button onClick={(e) => { e.stopPropagation(); if (confirm("Discard?")) onDiscard(card.id); }} style={{ position: 'absolute', top: 5, right: 5, /* ... */ }} title="Discard">✕</button>}
                            </div>
                        );
                    })
                ) : ( <div className="no-cards-text">Your hand is empty.</div> )}
            </div>
            
            <div className="deck-actions">
                <button className="deck-button" onClick={onDrawClick} disabled={isDisabled} style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed', background: '#444' } : {}}>{buttonText}</button>
            </div>
        </div>
    );
}