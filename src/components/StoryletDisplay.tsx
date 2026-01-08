'use client';

import { Storylet, PlayerQualities, ResolveOption, Opportunity, QualityDefinition, QualityChangeInfo, WorldSettings, ImageDefinition, CategoryDefinition } from '@/engine/models';
import { useState } from 'react';
import { evaluateText, evaluateCondition, getChallengeDetails } from '@/engine/textProcessor';
import QualityChangeBar from './QualityChangeBar';
import GameImage from './GameImage';
import FormattedText from './FormattedText';
import { GameEngine } from '@/engine/gameEngine';

export type ResolutionState = {
    qualities: PlayerQualities; 
    title: string; 
    body: string; 
    redirectId?: string; 
    moveToId?: string; 
    image_code?: string;
    wasSuccess?: boolean; 
    skillCheckDetails?: { description: string; };
    qualityChanges: QualityChangeInfo[];
    errors?: string[]; 
    rawEffects?: string;
    resolvedEffects?: string[];
};

interface StoryletDisplayProps {
    eventData: Storylet | Opportunity;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>;
    settings: WorldSettings;
    
    resolution: ResolutionState | null; 
    onResolve: (res: ResolutionState) => void; 
    
    onFinish: (newQualities: PlayerQualities, redirectId?: string, moveToId?: string) => void;
    onQualitiesUpdate: (newQualities: PlayerQualities, newDefinitions?: Record<string, QualityDefinition>) => void;
    
    onCardPlayed?: (cardId: string) => void;
    imageLibrary: Record<string, ImageDefinition>; 
    categories: Record<string, CategoryDefinition>;
    storyId: string;
    characterId: string;
    engine: GameEngine; 
    isPlaytesting?: boolean;
}

type DisplayOption = ResolveOption & { isLocked: boolean; lockReason: string; skillCheckText: string; chance: number | null; };

export default function StoryletDisplay({ 
    eventData, 
    qualities, 
    resolution, 
    onResolve,  
    onFinish,
    onQualitiesUpdate,
    qualityDefs,
    storyletDefs,
    opportunityDefs,
    settings,
    onCardPlayed,
    imageLibrary,
    categories,
    storyId,
    characterId,
    engine, 
    isPlaytesting
    
}: StoryletDisplayProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const [showDebug, setShowDebug] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    
    const storylet = eventData; 
    
    const evalText = (text: string | undefined) => {
        return engine.evaluateText(text, { qid: storylet.id, state: qualities[storylet.id] });
    };

    const handleOptionClick = async (option: ResolveOption) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyletId: storylet.id, optionId: option.id, storyId, characterId })
            });

            if (response.status === 409) {
                const data = await response.json();
                if (data.redirectId) {
                    onFinish(qualities, data.redirectId);
                    return;
                }
            }

            if (!response.ok) throw new Error(await response.text());
            
            const data = await response.json();
            
            if (data.error && !data.result) {
                 alert(`Critical Error: ${data.error}\n${data.details}`);
                 setIsLoading(false);
                 return;
            }

            onQualitiesUpdate(data.newQualities, data.newDefinitions); 
            
            if (onCardPlayed && 'deck' in eventData) {
                onCardPlayed(eventData.id);
            }

            const isInstant = option.tags?.includes('instant_redirect');

            if (isInstant) {
                onFinish(data.newQualities, data.result.redirectId, data.result.moveToId);
            } else {
                onResolve({ 
                    ...data.result, 
                    image_code: option.image_code, 
                    qualities: data.newQualities 
                });
            }
        } catch (error) {
            console.error("API Error:", error);
            alert("Network or Server Error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        if (!resolution) return;
        onFinish(resolution.qualities, resolution.redirectId, resolution.moveToId);
    };

    const disableReturn = storylet.tags?.includes('no_return');
    const getReturnTarget = (): string | null | undefined => {
        if (disableReturn) return null;
        const explicitReturn = storylet.return;
        if (explicitReturn) {
            const target = storyletDefs[explicitReturn];
            if (target) {
                const isVisible = evaluateCondition(target.visible_if, qualities, qualityDefs, null, 0);
                const isUnlocked = evaluateCondition(target.unlock_if, qualities, qualityDefs, null, 0);
                if (!isVisible || !isUnlocked) return undefined; 
                return explicitReturn;
            }
            return undefined;
        }
        return undefined; 
    };

    const returnTargetId = getReturnTarget();
    const returnTargetName = returnTargetId ? (storyletDefs[returnTargetId]?.name || opportunityDefs[returnTargetId]?.name) : null;

   if (resolution) {
        const canDebug = isPlaytesting && ((resolution.errors && resolution.errors.length > 0) || resolution.rawEffects !== undefined);
        const postResolutionQualities = resolution.qualities;
        const evalResultText = (text: string | undefined) => {
            return evaluateText(text, postResolutionQualities, qualityDefs, null, 0);
        };
        const imageCode = resolution.image_code || storylet.image_code || "";

        return (
            <div className="storylet-container">
                <div className="storylet-main-content">
                    {imageCode && ( 
                        <div className="storylet-image-frame storylet-image-container"> 
                            <GameImage 
                                code={imageCode} 
                                imageLibrary={imageLibrary} 
                                type="storylet"
                                alt={storylet.name}
                                className="storylet-image"
                                evaluateText={evalResultText} 
                                settings={settings}
                            />
                        </div>
                    )}
                    <div className="storylet-text-content">
                        <h1><FormattedText text={resolution.title} /></h1> 
                        <div className="storylet-text">
                            <FormattedText text={resolution.body} />
                        </div>
                    </div>
                </div>

                {resolution.qualityChanges?.length > 0 && 
                    <div className="quality-changes-container">
                        {resolution.qualityChanges.map((change) => {
                            if (change.hidden && !showHidden) return null;

                            const resolvedChangeText = evaluateText(change.changeText, postResolutionQualities, qualityDefs, null, 0);
                            const finalChange = {...change, changeText: resolvedChangeText};
                            const catDef = categories[change.category || ""] || categories['default'];

                            // --- FIX: Check if an icon exists before rendering its container ---
                            const qualityDef = qualityDefs[change.qid];
                            const iconCode = qualityDef?.image || change.qid;
                            const hasIcon = !!(imageLibrary[iconCode] || (iconCode && iconCode.startsWith('http')));

                            return (
                                <div key={change.qid} style={{ opacity: change.hidden ? 0.6 : 1, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    {/* Conditionally render the icon container */}
                                    {hasIcon ? (
                                        <div style={{ width: '40px', height: '40px', flexShrink: 0, marginTop: '2px' }}>
                                            <GameImage 
                                                code={iconCode}
                                                imageLibrary={imageLibrary}
                                                type="icon" 
                                                settings={settings}
                                                className="option-image"
                                            />
                                        </div>
                                    ) : (
                                        // If no icon, render a spacer to maintain alignment but keep it empty
                                        <div style={{ width: '40px', flexShrink: 0 }}></div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <QualityChangeBar 
                                            change={finalChange} 
                                            categoryDef={catDef} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                }

                {canDebug && (
                    <div style={{ marginTop: '20px', border: '1px solid #7f8c8d', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                            onClick={() => setShowDebug(!showDebug)}
                            style={{ 
                                background: (resolution.errors && resolution.errors.length > 0) ? '#e74c3c' : '#7f8c8d', 
                                color: 'var(--text-primary)', padding: '8px 12px', 
                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' 
                            }}
                        >
                            <span>
                                {(resolution.errors && resolution.errors.length > 0) ? '⚠️ Script Errors Detected' : '🛠️ Debug Console'}
                            </span>
                            <span>{showDebug ? '▼' : '▶'}</span>
                        </div>
                        {showDebug && (
                            <div style={{ 
                                background: '#2c3e50', color: '#ecf0f1', padding: '12px', fontFamily: 'monospace', 
                                fontSize: '0.85rem', maxHeight: '400px', overflowY: 'auto'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '10px' }}>
                                    <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} style={{ marginRight: '8px' }}/>
                                    Show Hidden Effects
                                </label>
                                {resolution.errors && resolution.errors.length > 0 && (
                                    <div style={{ marginBottom: '15px', borderBottom: '1px solid #95a5a6', paddingBottom: '10px' }}>
                                        <strong style={{ color: '#e74c3c' }}>Errors:</strong>
                                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                            {resolution.errors.map((err, idx) => <li key={idx} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{err}</li>)}
                                        </ul>
                                    </div>
                                )}
                                {resolution.rawEffects && (
                                    <div style={{ marginBottom: '15px' }}><strong style={{ color: '#95a5a6' }}>Raw ScribeScript:</strong><pre style={{ background: '#000', padding: '8px', marginTop: '5px', whiteSpace: 'pre-wrap', borderRadius: '4px', color: '#95a5a6', opacity: 0.8 }}>{resolution.rawEffects}</pre></div>
                                )}
                                {resolution.resolvedEffects && resolution.resolvedEffects.length > 0 && (
                                    <div><strong style={{ color: '#2ecc71' }}>Final Execution Trace:</strong><pre style={{ background: '#000', padding: '8px', marginTop: '5px', whiteSpace: 'pre-wrap', borderRadius: '4px', color: '#f1c40f' }}>{resolution.resolvedEffects.join('\n')}</pre></div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <button className="option-button continue-button" onClick={handleContinue}>Continue</button>
            </div>
        );
    }
    
    const getLockReason = (condition: string): string => {
        const match = condition.match(/\$([a-zA-Z0-9_]+)\s*(>=|<=|==|>|<)\s*(\d+)/);
        if (!match) return `A requirement is not met.`;
        const [, qid, op, val] = match;
        const qualityName = qualityDefs[qid]?.name ?? qid; 
        const state = qualities[qid];
        const currentVal = (state && 'level' in state) ? state.level : 0;
        return `Requires ${qualityName} ${op} ${val} (You have ${currentVal})`;
    };

    const optionsToDisplay: DisplayOption[] = storylet.options
        .filter(option => evaluateCondition(option.visible_if, qualities, qualityDefs, null, 0))
        .map(option => {
            const isLocked = !evaluateCondition(option.unlock_if, qualities, qualityDefs, null, 0);
            const lockReason = isLocked && option.unlock_if ? getLockReason(option.unlock_if) : '';
            const { chance, text } = getChallengeDetails(option.challenge, qualities, qualityDefs);
            const skillCheckText = chance !== null && !isLocked ? `${text} [${chance}%]` : '';
            return { ...option, isLocked, lockReason, skillCheckText, chance };
        });
        
    const imageCode = storylet.image_code || "";
        
    return (
        <div className="storylet-container">
            <div className="storylet-main-content">
                {imageCode && ( 
                    <div className="storylet-image-frame storylet-image-container"> 
                        <GameImage 
                            code={imageCode} 
                            imageLibrary={imageLibrary} 
                            type="storylet"
                            alt={storylet.name}
                            className="storylet-image"
                            evaluateText={evalText}
                        />
                    </div>
                )}
                <div className="storylet-text-content">
                    <h1><FormattedText text={evalText(storylet.name)} /></h1>
                    <div className="storylet-text">
                        <FormattedText text={evalText(storylet.text)} />
                    </div>
                    {storylet.metatext && (
                         <div className="metatext">
                            <FormattedText text={evalText(storylet.metatext)} />
                        </div>
                    )}
                </div>
            </div>

            <div className="options-container">
                {optionsToDisplay.map((option) => {
                    const showCost = settings.useActionEconomy;
                    let costDisplay = null;
                    if (showCost) {
                        const rawCost = option.computed_action_cost;
                        if (typeof rawCost === 'number') {
                            if (rawCost > 0) costDisplay = <span className="cost-badge cost-numeric">{rawCost} Actions</span>;
                            else costDisplay = <span className="cost-badge cost-free">Free</span>;
                        } else if (typeof rawCost === 'string') {
                            const cleanLogic = rawCost.replace(/\$/g, '');
                            costDisplay = <span className="cost-badge cost-logic" title={rawCost}>{cleanLogic}</span>;
                        }
                    }
                    const evaluatedName = evalText(option.name);

                    return (
                        <button 
                            key={option.id} 
                            className={`option-button ${option.isLocked ? 'locked' : ''} ${option.tags?.includes('dangerous') ? 'dangerous-border' : ''}`}
                            onClick={() => handleOptionClick(option)}
                            disabled={option.isLocked || isLoading}
                            style={option.tags?.includes('dangerous') ? { borderColor: 'var(--danger-color)' } : {}}
                        >
                            <div className="option-content-wrapper">
                                {option.image_code && (
                                    <div className="option-image-container">
                                        <GameImage 
                                            code={option.image_code} 
                                            imageLibrary={imageLibrary} 
                                            type="icon" 
                                            alt={evaluatedName}
                                            className="option-image"
                                            evaluateText={evalText}
                                        />
                                    </div>
                                )}
                                <div className="option-text-wrapper">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <h3 style={{ margin: 0, padding: 0 }}>
                                            <FormattedText text={evaluatedName} />
                                        </h3>
                                        {costDisplay}
                                    </div>
                                    {option.short && <div className="option-short-desc"><FormattedText text={evalText(option.short)} /></div>}
                                    {option.meta && <div className="option-meta-text"><FormattedText text={evalText(option.meta)} /></div>}
                                    {option.skillCheckText && (
                                        <p className="option-skill-check" style={{ color: option.chance !== null ? (option.chance > 80 ? '#2ecc71' : option.chance < 40 ? '#e74c3c' : '#f1c40f') : 'inherit' }}>
                                            {option.skillCheckText}
                                        </p>
                                    )}
                                    {option.isLocked && <p className="option-locked-reason">{option.lockReason}</p>}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="footer-actions">
                {returnTargetId !== null && (
                    <button className="option-button return-button" onClick={() => onFinish(qualities, returnTargetId)}>
                        {returnTargetId && returnTargetName
                            ? `Return to ${evalText(returnTargetName)}`
                            : ('deck' in storylet)
                                ? 'Put Card Back (Return to Hand)'
                                : 'Return to Location'
                        }
                    </button>
                )}
            </div>
        </div>
    );
}