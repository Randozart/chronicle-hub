'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType, CategoryDefinition, ImageDefinition } from "@/engine/models"; 
import { useMemo } from "react"; 
import { evaluateText } from "@/engine/textProcessor"; 
import { GameEngine } from "@/engine/gameEngine";
import FormattedText from "./FormattedText"; 
import GameImage from "./GameImage"; 

interface CharacterSheetProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>; 
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
    categories: Record<string, CategoryDefinition>;
    engine: GameEngine; 
    showHidden?: boolean;
    imageLibrary?: Record<string, ImageDefinition>; 
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings, categories, engine, showHidden, imageLibrary }: CharacterSheetProps) {
    
    const categoriesToDisplay = settings.characterSheetCategories || [];
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());
    const showIcons = settings.showQualityIconsInSheet; // [ADDED]

    const characterQualities = useMemo(() => {
        const rawKeys = Object.keys(qualities);
        const bonusKeys = engine.getBonusQualities();
        const allKeys = Array.from(new Set([...rawKeys, ...bonusKeys]));

        return allKeys.map(qid => {
            if (currencyIds.includes(qid)) return null;

            const definition = qualityDefs[qid];
            
            if (!definition) return null;

            const cats = (definition.category ?? "").split(",").map(s => s.trim());
            const isInSidebarCategory = categoriesToDisplay.length > 0 && categoriesToDisplay.some(c => cats.includes(c));
            
            if (!isInSidebarCategory) return null;

            const renderedObject = engine.render({ id: qid, tags: definition.tags || [] });
            const renderedTags = Array.isArray(renderedObject.tags) ? renderedObject.tags : [];
            
            const shouldHide = renderedTags.includes('hidden') || 
                               renderedTags.includes('log_only') || 
                               renderedTags.includes('no_ui') || 
                               renderedTags.includes('fx_only');

            if (shouldHide && !showHidden) return null;

            const state = qualities[qid];
            const baseLevel = (state && 'level' in state) ? state.level : 0;
            const effectiveLevel = engine.getEffectiveLevel(qid);
            
            if (effectiveLevel <= 0 && definition.type !== QualityType.String && definition.type !== QualityType.Tracker) return null;
            
            const mergedState = state || { qualityId: qid, type: definition.type };

            return { ...definition, ...mergedState, baseLevel, effectiveLevel, tags: renderedTags };
        })
        .filter(Boolean as any);
    }, [qualities, equipment, qualityDefs, categoriesToDisplay, engine, currencyIds, showHidden]);

    const validQualities = characterQualities.filter(q => q !== null);

    if (validQualities.length === 0) {
        return null;
    }

    return (
        <aside className="character-sheet">
            <h2>Character</h2>
            <ul>
                {validQualities.map(q => {
                    if (!q) return null; 
                    
                    const changePoints = ('changePoints' in q) ? q.changePoints : 0;
                    const isPyramidal = q.type === QualityType.Pyramidal;
                    const isTracker = q.type === QualityType.Tracker;
                    
                    let barPercent = 0;
                    
                    if (isPyramidal) {
                        const cpNeeded = getCPforNextLevel(q.baseLevel);
                        barPercent = cpNeeded > 0 ? (changePoints / cpNeeded) * 100 : 0;
                    } else if (isTracker) {
                        let maxVal = 100; 
                        if (q.max) {
                            const evalMax = engine.evaluateText(`{${q.max}}`);
                            maxVal = parseInt(evalMax, 10) || 100;
                        }
                        barPercent = Math.min(100, Math.max(0, (q.effectiveLevel / maxVal) * 100));
                    }

                    const bonusDiff = q.effectiveLevel - q.baseLevel;
                    const hideLevel = q.tags?.includes('hide_level');

                    let displayValue: React.ReactNode = null;
                    let subText: React.ReactNode = null;

                    if (!hideLevel) {
                        displayValue = q.baseLevel;
                        
                        if (bonusDiff !== 0) {
                            const sign = bonusDiff > 0 ? '+' : '';
                            const colorVar = bonusDiff > 0 ? 'var(--success-color)' : 'var(--danger-color)';
                            
                            displayValue = <span>{q.baseLevel}</span>;
                            
                            subText = (
                                <span 
                                    style={{ color: colorVar, marginLeft: '4px', fontWeight: 'bold' }} 
                                    title={`Effective Level: ${q.effectiveLevel}`}
                                >
                                    {sign}{bonusDiff}
                                </span>
                            );
                        }
                    }
                    
                    const displayName = engine.evaluateText(q.name);
                    const displayDesc = q.description ? engine.evaluateText(q.description) : "";

                    const primaryCat = (q.category || "").split(',')[0].trim();
                    const catDef = categories[primaryCat];
                    const barColor = catDef?.color || 'var(--progress-fill)';

                    return (
                        <li key={q.id} className="quality-item">
                            <div className="quality-header">
                                <div className="quality-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {showIcons && q.image && imageLibrary && (
                                        <div style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '2px', overflow: 'hidden' }}>
                                            <GameImage 
                                                code={q.image} 
                                                imageLibrary={imageLibrary} 
                                                type="icon" 
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    )}
                                    <FormattedText text={displayName} />
                                </div>
                                <span className="quality-level">
                                    {displayValue}
                                    {subText}
                                </span>
                            </div>
                            
                            {displayDesc && (
                                <div className="quality-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                                    <FormattedText text={displayDesc} />
                                </div>
                            )}
                            
                            {(isPyramidal || isTracker) && (
                                <div className="quality-cp-bar-background">
                                    <div 
                                        className="quality-cp-bar-fill"
                                        style={{ width: `${barPercent}%`, backgroundColor: barColor }}
                                    />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}