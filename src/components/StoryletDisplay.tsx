'use client';

import { Storylet, PlayerQualities, ResolveOption, Opportunity, QualityDefinition, QualityChangeInfo, WorldSettings, ImageDefinition, CategoryDefinition } from '@/engine/models';
import { useState } from 'react';
import { evaluateText, evaluateCondition, calculateSkillCheckChance } from '@/engine/textProcessor';
import QualityChangeBar from './QualityChangeBar';
import GameImage from './GameImage';

interface StoryletDisplayProps {
    eventData: Storylet | Opportunity;
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    storyletDefs: Record<string, Storylet>;
    opportunityDefs: Record<string, Opportunity>;
    settings: WorldSettings;
    onFinish: (newQualities: PlayerQualities, redirectId?: string) => void;
    onQualitiesUpdate: (newQualities: PlayerQualities) => void;
    onCardPlayed?: (cardId: string) => void;
    imageLibrary: Record<string, ImageDefinition>; 
    categories: Record<string, CategoryDefinition>;
    storyId: string;
    characterId: string; // <--- Add this
}

type DisplayOption = ResolveOption & { isLocked: boolean; lockReason: string; skillCheckText: string; chance: number | null; };

type ResolutionState = {
    qualities: PlayerQualities;
    title: string; body: string; redirectId?: string; image_code?: string;
    wasSuccess?: boolean; skillCheckDetails?: { description: string; };
    qualityChanges: QualityChangeInfo[];
};

export default function StoryletDisplay({ 
    eventData, 
    qualities, 
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
    characterId
}: StoryletDisplayProps) {
    const [resolution, setResolution] = useState<ResolutionState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const storylet = eventData; 
    
    const handleOptionClick = async (option: ResolveOption) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/resolve', {
                method: 'POST',
                body: JSON.stringify({ 
                    storyletId: storylet.id, 
                    optionId: option.id, 
                    storyId, 
                    characterId // <--- Pass it
                })
            });
            if (!response.ok) throw new Error(await response.text());
            
            const data = await response.json();
            onQualitiesUpdate(data.newQualities); 
            
            if (onCardPlayed && 'deck' in eventData) {
                onCardPlayed(eventData.id);
            }

            const isInstant = option.tags?.includes('instant_redirect');

            if (isInstant) {
                onFinish(data.newQualities, data.result.redirectId);
            } else {
                setResolution({ ...data.result, image_code: option.image_code, qualities: data.newQualities });
            }
        } catch (error) {
            console.error("API Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        if (!resolution) return;
        onFinish(resolution.qualities, resolution.redirectId);
    };

    // --- SMART RETURN LOGIC ---
    const disableReturn = storylet.tags?.includes('no_return');

    const getReturnTarget = (): string | null | undefined => {
        if (disableReturn) return null; // Null means "Don't show button"

        const explicitReturn = 'return' in storylet ? storylet.return : undefined;
        
        if (explicitReturn) {
            // Check if the target is a Storylet (Cards usually don't return to cards)
            const target = storyletDefs[explicitReturn];
            
            if (target) {
                // RE-EVALUATE: Is the player allowed to see the return target?
                // If they locked themselves out during this event, we should fallback to Hub.
                const isVisible = evaluateCondition(target.visible_if, qualities);
                const isUnlocked = evaluateCondition(target.unlock_if, qualities);

                // If target is hidden or locked, return undefined to force Hub
                if (!isVisible || !isUnlocked) return undefined; 
                
                return explicitReturn;
            }
            // Target ID exists but not found in DB? Fallback.
            return undefined;
        }
        
        // Undefined means "Return to Location Hub"
        return undefined; 
    };

    const returnTargetId = getReturnTarget();
    const returnTargetName = returnTargetId ? (storyletDefs[returnTargetId]?.name || opportunityDefs[returnTargetId]?.name) : null;

     if (resolution) {
        return (
            <div className="storylet-container">
                <div className="storylet-main-content">
                    {resolution.image_code && (
                        <div className="storylet-image-container">
                            <GameImage 
                                code={resolution?.image_code || storylet.image_code} 
                                imageLibrary={imageLibrary} 
                                type="storylet"
                                alt={storylet.name}
                                className="storylet-image"
                            />
                        </div>
                    )}
                    <div className="storylet-text-content">
                        <h1>{resolution.title}</h1> 
                        <p className="storylet-text">{resolution.body}</p>
                    </div>
                </div>

                {resolution.qualityChanges?.length > 0 && 
                    <div className="quality-changes-container">
                        {resolution.qualityChanges.map((change) => (
                            <QualityChangeBar 
                                key={change.qid} 
                                change={change} 
                                categoryDef={categories[change.category || ""]} 
                            />
                        ))}
                    </div>
                }
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
        .filter(option => evaluateCondition(option.visible_if, qualities))
        .map(option => {
            const isLocked = !evaluateCondition(option.unlock_if, qualities);
            const lockReason = isLocked ? getLockReason(option.unlock_if!) : '';
            
            const { chance, text } = calculateSkillCheckChance(
                option.challenge, 
                qualities, 
                qualityDefs
            );

            const skillCheckText = chance !== null && !isLocked ? `${text} [${chance}% chance]` : '';
            return { ...option, isLocked, lockReason, skillCheckText, chance, };
        });
        
    return (
        <div className="storylet-container">
            <div className="storylet-main-content">
                {storylet.image_code && (
                    <div className="storylet-image-container">
                        <GameImage 
                            code={storylet.image_code} 
                            imageLibrary={imageLibrary} 
                            type="storylet"
                            alt={storylet.name}
                            className="storylet-image"
                        />
                    </div>
                )}
                <div className="storylet-text-content">
                    <h1>{evaluateText(storylet.name, qualities, qualityDefs)}</h1>
                    <p className="storylet-text">{evaluateText(storylet.text, qualities, qualityDefs)}</p>
                    {storylet.metatext && <p className="metatext">{evaluateText(storylet.metatext, qualities, qualityDefs)}</p>}
                </div>
            </div>

            <div className="options-container">
                {optionsToDisplay.map((option) => {
                    const cost = option.computed_action_cost ?? 1;
                    const showCost = settings.useActionEconomy;

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
                                            alt={option.name}
                                            className="option-image"
                                        />
                                    </div>
                                )}
                                <div className="option-text-wrapper">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <h3 style={{ margin: 0 }}>{option.name}</h3>
                                        {showCost && (
                                            <span style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 'bold', 
                                                color: cost > 0 ? 'var(--danger-color)' : 'var(--success-color)', 
                                                background: 'rgba(0,0,0,0.3)',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                marginLeft: '10px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {cost > 0 ? `${cost} Actions` : 'Free'}
                                            </span>
                                        )}
                                    </div>
                                    {option.short && <p className="option-short-desc">{option.short}</p>}
                                    {option.meta && <p className="option-meta-text">{option.meta}</p>}
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
                        {returnTargetName 
                        ? `Return to ${evaluateText(returnTargetName, qualities, qualityDefs)}` 
                        : 'Return to Location'}
                    </button>
                )}
            </div>
        </div>
    );
}