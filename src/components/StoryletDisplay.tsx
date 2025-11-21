// src/components/StoryletDisplay.tsx
'use client';

import { Storylet, PlayerQualities, ResolveOption, Opportunity, WorldContent, QualityChangeInfo } from '@/engine/models';
import { useState, useEffect } from 'react';
import { evaluateText, evaluateCondition, calculateSkillCheckChance } from '@/engine/textProcessor';
import { repositories } from '@/engine/repositories';
import QualityChangeBar from './QualityChangeBar';

interface StoryletDisplayProps {
    eventData: Storylet | Opportunity;
    initialQualities: PlayerQualities;
    onFinish: (newQualities: PlayerQualities, redirectId?: string) => void;
    gameData: WorldContent;
}

type DisplayOption = ResolveOption & {
    isLocked: boolean;
    lockReason: string;
    skillCheckText: string; 
    chance: number | null;    
};

type ResolutionState = {
    title: string;
    body: string;
    redirectId?: string;
    image_code?: string;
    wasSuccess?: boolean; 
    skillCheckDetails?: { 
        description: string;
    };
    qualityChanges: QualityChangeInfo[];
};

export default function StoryletDisplay({ 
    eventData, 
    initialQualities, 
    onFinish,
    gameData 
}: StoryletDisplayProps) {

    useEffect(() => {
        repositories.initialize(gameData);
    }, [gameData]);
    
    const [storylet, setStorylet] = useState(eventData);
    const [qualities, setQualities] = useState(initialQualities);
    const [resolution, setResolution] = useState<ResolutionState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        setStorylet(eventData); // Sync the internal state with the new prop
        setQualities(initialQualities); // Also reset qualities to the latest from the parent
        setResolution(null); // Ensure we're not stuck on a resolution screen
    }, [eventData, initialQualities]);

    const handleOptionClick = async (option: ResolveOption) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyletId: storylet.id, optionId: option.id })
            });
            if (!response.ok) throw new Error(await response.text());

            const data = await response.json();
            const isInstant = option.properties?.includes('instant_redirect');
            
            console.log('[handleOptionClick] Instant Redirect Triggered. API Result:', data.result);

            if (isInstant) {
                onFinish(data.newQualities, data.result.redirectId);
            } else {
                setQualities(data.newQualities);
                setResolution({ ...data.result, image_code: option.image_code });
            }
        } catch (error) {
            console.error("API Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinue = () => {
        if (!resolution) return;
        // When finished, call the onFinish prop with the final state and any redirect
        onFinish(qualities, resolution.redirectId);
    };

    const getReturnTarget = (currentStorylet: Storylet | Opportunity): string | null => {
        if ('return' in currentStorylet && currentStorylet.return) return currentStorylet.return;
        if (currentStorylet.properties) {
            const match = currentStorylet.properties.match(/return\[(.*?)\]/);
            if (match?.[1]) return match[1];
        }
        return null;
    };
    const returnTargetId = getReturnTarget(storylet);
    

    if (resolution) {
        return (
            <div className="storylet-container">
                <div className="storylet-main-content">
                    {resolution.image_code && (
                        <div className="storylet-image-container">
                            <img 
                                src={`/images/storylets/${resolution.image_code}.png`} 
                                alt={evaluateText(resolution.title, qualities)} 
                                className="storylet-image"
                            />
                        </div>
                    )}
                    <div className="storylet-text-content">
                        <h1>{evaluateText(resolution.title, qualities)}</h1>
                        <p className="storylet-text">{evaluateText(resolution.body, qualities)}</p>
                    </div>
                </div>

                {resolution.qualityChanges && resolution.qualityChanges.length > 0 && 
                    <div className="quality-changes-container">
                        {resolution.qualityChanges.map((change) => (
                            <QualityChangeBar key={change.qid} change={change} />
                        ))}
                    </div>
                }
                    
                <button className="option-button continue-button" onClick={handleContinue}>
                    Continue
                </button>
            </div>
        );
    }
    
    const getLockReason = (condition: string): string => {
        const match = condition.match(/\$([a-zA-Z0-9_]+)\s*(>=|<=|==|>|<)\s*(\d+)/);
        if (!match) return `A requirement is not met.`;
        
        const [, qid, op, val] = match;
        const qualityName = repositories.getQuality(qid)?.name ?? qid;
        const state = qualities[qid];
        const currentVal = (state && 'level' in state) ? state.level : 0;
        return `Requires ${qualityName} ${op} ${val} (You have ${currentVal})`;
    };

    const optionsToDisplay: DisplayOption[] = storylet.options
        .filter(option => evaluateCondition(option.visible_if, qualities))
        .map(option => {
            const isLocked = !evaluateCondition(option.unlock_if, qualities);
            const lockReason = isLocked ? getLockReason(option.unlock_if!) : '';

            // Calculate skill check info separately
            let skillCheckText = '';
            const chance = calculateSkillCheckChance(option.random, qualities);

            if (chance !== null && !isLocked) {
                const qualitiesMatch = option.random?.match(/^\s*\$(.*?)\s*(>=|<=)/);
                
                if (qualitiesMatch) {
                    const qualitiesPart = qualitiesMatch[1].trim(); // "scholar + fellowship"

                    // First, remove all '$' characters, then split.
                    const testedQualityNames = qualitiesPart.replace(/\$/g, '') 
                        .split('+')
                        .map(qid => qid.trim())
                        .filter(qid => qid)
                        .map(qid => repositories.getQuality(qid)?.name ?? qid);

                    const testedQualitiesString = testedQualityNames.join(' + ');
                    skillCheckText = `A test of ${testedQualitiesString}. [${chance}% chance]`;
                } else {
                    skillCheckText = `[A ${chance}% chance]`;
                }
            }

            return {
                ...option,
                isLocked,
                lockReason,
                skillCheckText, 
                chance,         
            };
        });
    
    if (isLoading && !resolution) {
        return (
            <div className="storylet-container loading-container">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="storylet-container">
            <div className="storylet-main-content">
                {storylet.image_code && (
                    <div className="storylet-image-container">
                        <img 
                            src={`/images/storylets/${storylet.image_code}.png`} 
                            alt={evaluateText(storylet.name, qualities)} 
                            className="storylet-image"
                        />
                    </div>
                )}

                <div className="storylet-text-content">
                    <h1>{evaluateText(storylet.name, qualities)}</h1>
                    <p className="storylet-text">{evaluateText(storylet.text, qualities)}</p>
                    {storylet.metatext && <p className="metatext">{evaluateText(storylet.metatext, qualities)}</p>}
                </div>
            </div>

            <div className="options-container">
                {optionsToDisplay.map((option) => (
                    <button 
                        key={option.id} 
                        className={`option-button ${option.isLocked ? 'locked' : ''}`}
                        onClick={() => handleOptionClick(option)}
                        disabled={option.isLocked || isLoading}
                    >
                        <div className="option-content-wrapper">
                        {option.image_code && (
                            <div className="option-image-container">
                                <img 
                                    src={`/images/storylets/${option.image_code}.png`} 
                                    alt="" // Alt text can be empty for decorative images
                                    className="option-image"
                                />
                            </div>
                        )}
                        <div className="option-text-wrapper">
                            <h3>{evaluateText(option.name, qualities)}</h3>
                            {option.short && (
                                <p className="option-short-desc">
                                    {evaluateText(option.short, qualities)}
                                </p>
                            )}
                            {option.meta && (
                                <p className="option-meta-text">
                                    {evaluateText(option.meta, qualities)}
                                </p>
                            )}
                            {option.skillCheckText && (
                                <p className="option-skill-check" style={getChanceColor(option.chance)}>
                                    {option.skillCheckText}
                                </p>
                            )}
                            {option.isLocked && (
                                <p className="option-locked-reason">
                                    {option.lockReason}
                                </p>
                            )}
                        </div>
                    </div>
                    </button>
                ))}
            </div>

            <div className="footer-actions">
                <button 
                    className="option-button return-button" 
                    onClick={() => onFinish(qualities, returnTargetId ?? undefined)}
                >
                    {returnTargetId 
                        ? `Return to ${evaluateText(repositories.getEvent(returnTargetId)?.name, qualities)}` 
                        : 'Return to Location'}
                </button>
            </div>
        </div>
    );
}

const getChanceColor = (chance: number | null): React.CSSProperties => {
    if (chance === null) return {};

    // Define our color stops
    const colors = {
        0: '#9b59b6',   // Purple (0%)
        1: '#e74c3c',   // Deep Red (1%)
        50: '#f1c40f',  // Yellow (50%)
        99: '#2ecc71',  // Green (99%)
        100: '#ffffff', // White/Black (100% - let's use white for a dark theme)
    };

    let color = colors[100]; // Default to 100% color

    if (chance === 0) color = colors[0];
    else if (chance === 1) color = colors[1];
    else if (chance < 50) {
        // Interpolate between red (1%) and yellow (50%)
        const progress = (chance - 1) / (50 - 1);
        color = lerpColor(colors[1], colors[50], progress);
    } else if (chance < 100) {
        // Interpolate between yellow (50%) and green (99%)
        const progress = (chance - 50) / (99 - 50);
        color = lerpColor(colors[50], colors[99], progress);
    }

    return { color };
};

const lerpColor = (color1: string, color2: string, factor: number): string => {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + factor * (c2.r - c1.r));
    const g = Math.round(c1.g + factor * (c2.g - c1.g));
    const b = Math.round(c1.b + factor * (c2.b - c1.b));

    return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgb = (hex: string): {r: number, g: number, b: number} | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};