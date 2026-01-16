'use client';

import { Storylet, PlayerQualities, QualityDefinition, ImageDefinition, WorldSettings } from "@/engine/models";
import { GameEngine } from "@/engine/gameEngine";
import GameImage from "./GameImage";
import FormattedText from "./FormattedText";

interface LocationStoryletsProps {
    storylets: Storylet[];
    onStoryletClick: (storyletId: string) => void;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    imageLibrary: Record<string, ImageDefinition>;
    settings: WorldSettings;
    engine: GameEngine; 
}

export default function LocationStorylets({ 
    storylets, 
    onStoryletClick, 
    qualities, 
    qualityDefs, 
    imageLibrary, 
    settings, 
    engine
}: LocationStoryletsProps) {
    const visibleStorylets = storylets; 

    if (visibleStorylets.length === 0) return null;

    const getLockReason = (condition: string): string => {
        const opMap: Record<string, string> = {
            '>': 'more than',
            '>=': 'at least',
            '<': 'less than',
            '<=': 'at most',
            '==': 'exactly',
            '!=': 'not'
        };

        let readable = condition.replace(/(\$?[a-zA-Z0-9_]+)\s*(>=|<=|==|!=|>|<)\s*([0-9]+|'[^']+'|"[^"]+")/g, (match, rawQid, op, val) => {
            const qid = rawQid.startsWith('$') ? rawQid.substring(1) : rawQid;
            const qualityName = qualityDefs[qid]?.name ?? qid;
            
            const state = qualities[qid];
            let currentVal: string | number = 0;
            if (state) {
                if (state.type === 'S') currentVal = state.stringValue;
                else if ('level' in state) currentVal = state.level;
            }

            const cleanVal = val.replace(/^['"]|['"]$/g, '');
            const readableOp = opMap[op] || op;
            
            return `${qualityName} ${readableOp} ${cleanVal} (Current: ${currentVal})`;
        });

        readable = readable.replace(/&&|,/g, ' AND ');
        readable = readable.replace(/\|\|/g, ' OR ');
        
        readable = readable.replace(/\$/g, '');

        return `Requires: ${readable}`;
    };

    const cfg = settings.componentConfig || {};
    const layoutStyle = cfg.storyletListStyle || 'rows';

    const useCardStructure = ['cards', 'polaroid', 'images-only', 'tarot', 'scrolling'].includes(layoutStyle);
    const containerClass = useCardStructure ? `card-container mode-${layoutStyle}` : `storylet-list-container mode-${layoutStyle}`;

    return (
        <div className="location-storylets">
            <h2>Actions</h2>
            <div className={containerClass}>
                {visibleStorylets.map(storylet => {
                    const context = { qid: storylet.id, state: qualities[storylet.id] };
                    const evaluatedName = engine.evaluateText(storylet.name, context);
                    const evaluatedShort = storylet.short ? engine.evaluateText(storylet.short, context) : "";
                    const evaluator = (text: string) => engine.evaluateText(text, context);
                    
                    const isLocked = storylet.unlock_if ? !engine.evaluateCondition(storylet.unlock_if) : false;
                    const lockReason = isLocked && storylet.unlock_if ? getLockReason(storylet.unlock_if) : null;

                    const buttonStyle = isLocked ? { opacity: 0.7, cursor: 'not-allowed' } : {};
                    const clickHandler = isLocked ? undefined : () => onStoryletClick(storylet.id);

                    if (layoutStyle === 'polaroid') {
                        return (
                            <button
                                key={storylet.id}
                                className={`option-button card-mode ${isLocked ? 'locked' : ''}`}
                                onClick={clickHandler}
                                disabled={isLocked}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                    alignItems: 'stretch',
                                    ...buttonStyle
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
                                    {storylet.image_code && (
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
                                                code={storylet.image_code}
                                                imageLibrary={imageLibrary}
                                                type="storylet"
                                                alt={evaluatedName}
                                                className="option-image"
                                                settings={settings}
                                                evaluateText={evaluator}
                                                style={{
                                                    borderBottomLeftRadius: 0,
                                                    borderBottomRightRadius: 0
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div
                                        className="option-text-wrapper"
                                        style={{ padding: '0 1rem 1rem' }}
                                    >
                                        <h3><FormattedText text={evaluatedName} inline /></h3>
                                        {evaluatedShort && (
                                            <div className="option-short-desc"><FormattedText text={evaluatedShort} /></div>
                                        )}
                                        {lockReason && (
                                            <div className="option-locked-reason" style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.5rem', fontWeight: 'bold' }}>
                                                {lockReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    }

                    if (layoutStyle === 'rows' || layoutStyle === 'compact') {
                         return (
                            <button 
                                key={storylet.id} 
                                className={`option-button ${isLocked ? 'locked' : ''}`}
                                onClick={clickHandler}
                                disabled={isLocked}
                                style={buttonStyle}
                            >                               
                                <div className="option-content-wrapper">
                                    {storylet.image_code && (
                                        <div className="option-image-container">
                                            <GameImage 
                                                code={storylet.image_code} 
                                                imageLibrary={imageLibrary} 
                                                type="storylet" 
                                                alt={evaluatedName} 
                                                className="option-image" 
                                                settings={settings}
                                                evaluateText={evaluator}
                                            />
                                        </div>
                                    )}
                                    <div className="option-text-wrapper">
                                        <h3><FormattedText text={evaluatedName} inline /></h3>
                                        {evaluatedShort && layoutStyle !== 'compact' && <div className="option-short-desc"><FormattedText text={evaluatedShort} /></div>}
                                        {lockReason && (
                                            <div className="option-locked-reason" style={{ fontSize: '0.8rem', color: 'var(--danger-color)', marginTop: '0.25rem' }}>
                                                {lockReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    }
                    
                    return (
                        <div key={storylet.id} className={`card ${isLocked ? 'locked' : ''}`} title={layoutStyle === 'images-only' ? evaluatedName : undefined} style={buttonStyle}>
                            <button 
                                className="card-content-btn" 
                                onClick={clickHandler}
                                disabled={isLocked}
                                style={isLocked ? { cursor: 'not-allowed' } : {}}
                            >
                                {storylet.image_code && (
                                    <GameImage 
                                        code={storylet.image_code} 
                                        imageLibrary={imageLibrary} 
                                        type="storylet" 
                                        alt={evaluatedName} 
                                        className="card-image" 
                                        settings={settings}
                                        evaluateText={evaluator}
                                    />
                                )}                                 
                                <div className="card-text">
                                     <h3><FormattedText text={evaluatedName} inline /></h3>
                                     {evaluatedShort && layoutStyle !== 'tarot' && <div><FormattedText text={evaluatedShort} /></div>}
                                     {lockReason && (
                                         <div className="option-locked-reason" style={{ fontSize: '0.75rem', color: 'var(--danger-color)', marginTop: '5px', background: 'rgba(0,0,0,0.5)', padding: '2px 4px', borderRadius: '3px' }}>
                                             {lockReason}
                                         </div>
                                     )}
                                 </div>
                                 {layoutStyle === 'images-only' && <div className="image-only-overlay"><FormattedText text={evaluatedName} /></div>}
                             </button>
                         </div>
                    );
                })}
            </div>
        </div>
    );
}