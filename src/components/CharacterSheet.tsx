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
    engine: GameEngine; // Needed for calculations
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings, categories, engine }: CharacterSheetProps) {
    
    const categoriesToDisplay = settings.characterSheetCategories || [];
    const currencyIds = (settings.currencyQualities || []).map(c => c.replace('$', '').trim());

    const characterQualities = useMemo(() => {
        // Iterate only RAW qualities (hides ghosts like 'darkness' if base is 0)
        return Object.keys(qualities).map(qid => {
            if (currencyIds.includes(qid)) return null;

            const definition = qualityDefs[qid];
            if (!definition) return null;

            const cats = (definition.category ?? "").split(",").map(s => s.trim());
            // Strict filtering
            const shouldDisplay = categoriesToDisplay.some(c => cats.includes(c));
            
            if (!shouldDisplay) return null;

            const state = qualities[qid];
            const baseLevel = ('level' in state) ? state.level : 0;
            
            // Calculate effective level for the (+1) display
            const effectiveLevel = engine.getEffectiveLevel(qid);

            return { ...definition, ...state, baseLevel, effectiveLevel };
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

                    // Calculate the difference for display
                    const bonusDiff = q.effectiveLevel - q.baseLevel;
                    const bonusText = bonusDiff > 0 ? `(+${bonusDiff})` : bonusDiff < 0 ? `(${bonusDiff})` : '';
                    const bonusClass = bonusDiff > 0 ? 'text-green-400' : 'text-red-400';
                    
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
                                    {q.effectiveLevel} 
                                    {bonusDiff !== 0 && <span className={`text-xs ml-1 ${bonusClass}`}>{bonusText}</span>}
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