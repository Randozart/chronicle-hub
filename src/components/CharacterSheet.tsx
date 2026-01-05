'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType, CategoryDefinition } from "@/engine/models"; 
import { useMemo } from "react"; 
import { evaluateText } from "@/engine/textProcessor"; 
import { GameEngine } from "@/engine/gameEngine";

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

            const state = qualities[qid];
            const baseLevel = (state && 'level' in state) ? state.level : 0;
            const effectiveLevel = engine.getEffectiveLevel(qid);

            const cats = (definition.category ?? "").split(",").map(s => s.trim());
            const shouldDisplay = categoriesToDisplay.length === 0 || categoriesToDisplay.some(c => cats.includes(c));
            
            if (!shouldDisplay) return null;

            // Hide zero-level items unless they are relevant bonuses or strings
            if (effectiveLevel <= 0 && definition.type !== QualityType.String) return null;

            const mergedState = state || { qualityId: qid, type: definition.type };

            return { ...definition, ...mergedState, baseLevel, effectiveLevel };
        })
        .filter(Boolean as any);
    }, [qualities, equipment, qualityDefs, categoriesToDisplay, engine]);

    const validQualities = characterQualities.filter(q => q !== null);

    if (validQualities.length === 0) return null;

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
                    
                    // VISUAL FIX: "Base + Bonus" format
                    // Display: "5 +2" or "0 +1"
                    let displayValue: React.ReactNode = q.baseLevel;
                    let subText: React.ReactNode = null;

                    if (bonusDiff !== 0) {
                        const sign = bonusDiff > 0 ? '+' : '';
                        const colorVar = bonusDiff > 0 ? 'var(--success-color)' : 'var(--danger-color)';
                        
                        // The big number is the BASE level
                        displayValue = <span>{q.baseLevel}</span>;
                        
                        // The modifier sits next to it
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
                            <p className="quality-header">
                                <span className="quality-name">{displayName}</span>
                                &nbsp;
                                <span className="quality-level">
                                    {displayValue}
                                    {subText}
                                </span>
                            </p>
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