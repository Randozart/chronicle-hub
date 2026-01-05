'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType, CategoryDefinition } from "@/engine/models"; 
import { useMemo } from "react"; 
import { evaluateText } from "@/engine/textProcessor"; 
import { GameEngine } from "@/engine/gameEngine";
import FormattedText from "./FormattedText"; // Import the FormattedText component

interface CharacterSheetProps {
    qualities: PlayerQualities; // RAW State
    equipment: Record<string, string | null>; 
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
    categories: Record<string, CategoryDefinition>;
    engine: GameEngine; 
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings, categories, engine }: CharacterSheetProps) {
    
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

            // --- FIX: STRICT FILTERING LOGIC ---

            // 1. Check Category
            const cats = (definition.category ?? "").split(",").map(s => s.trim());
            const isInSidebarCategory = categoriesToDisplay.length > 0 && categoriesToDisplay.some(c => cats.includes(c));
            if (!isInSidebarCategory) return null;

            // 2. Check Hidden Tag
            // FIX: Pass a valid object to render and ensure type safety
            const renderedObject = engine.render({ id: qid, tags: definition.tags || [] });
            const renderedTags = Array.isArray(renderedObject.tags) ? renderedObject.tags : [];
            if (renderedTags.includes('hidden')) return null;

            // 3. Get Levels
            const state = qualities[qid];
            const baseLevel = (state && 'level' in state) ? state.level : 0;
            const effectiveLevel = engine.getEffectiveLevel(qid);
            
            // 4. Hide if no value
            if (effectiveLevel <= 0 && definition.type !== QualityType.String) return null;
            
            // ------------------------------------

            const mergedState = state || { qualityId: qid, type: definition.type };

            return { ...definition, ...mergedState, baseLevel, effectiveLevel };
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
                    
                    let displayValue: React.ReactNode = q.baseLevel;
                    let subText: React.ReactNode = null;

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
                    
                    const displayName = evaluateText(q.name, qualities, qualityDefs, null, 0);
                    const primaryCat = (q.category || "").split(',')[0].trim();
                    const catDef = categories[primaryCat];
                    const barColor = catDef?.color || 'var(--progress-fill)';

                    return (
                        <li key={q.id} className="quality-item">
                            {/* The container is changed to a div to correctly host the block-level <p> from FormattedText */}
                            <div className="quality-header">
                                <div className="quality-name">
                                    <FormattedText text={displayName} />
                                </div>
                                <span className="quality-level">
                                    {displayValue}
                                    {subText}
                                </span>
                            </div>
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