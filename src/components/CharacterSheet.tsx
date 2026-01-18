'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType, CategoryDefinition } from "@/engine/models"; 
import { useMemo } from "react"; 
import { evaluateText } from "@/engine/textProcessor"; 
import { GameEngine } from "@/engine/gameEngine";
import FormattedText from "./FormattedText"; 

interface CharacterSheetProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>; 
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
    categories: Record<string, CategoryDefinition>;
    engine: GameEngine; 
    showHidden?: boolean;
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings, categories, engine, showHidden }: CharacterSheetProps) {
    
    const categoriesToDisplay = settings.characterSheetCategories || [];
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());

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
            
            if (effectiveLevel <= 0 && definition.type !== QualityType.String) return null;
            
            const mergedState = state || { qualityId: qid, type: definition.type };

            return { ...definition, ...mergedState, baseLevel, effectiveLevel, tags: renderedTags };
        })
        .filter(Boolean as any);
    }, [qualities, equipment, qualityDefs, categoriesToDisplay, engine]);

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
                    
                    const cpNeeded = isPyramidal ? getCPforNextLevel(q.baseLevel) : 0;
                    const cpPercent = cpNeeded > 0 ? (changePoints / cpNeeded) * 100 : 0;

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
                                <div className="quality-name">
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
                            {isPyramidal && (
                                <div className="quality-cp-bar-background">
                                    <div 
                                        className="quality-cp-bar-fill"
                                        style={{ width: `${cpPercent}%`, backgroundColor: barColor }}
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