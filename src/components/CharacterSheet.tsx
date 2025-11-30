'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType, CategoryDefinition } from "@/engine/models"; 
import { useMemo } from "react"; 
import { evaluateText } from "@/engine/textProcessor"; 

interface CharacterSheetProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>; 
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
    categories: Record<string, CategoryDefinition>;
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings, categories }: CharacterSheetProps) {
    
    const categoriesToDisplay = settings.characterSheetCategories || [];

    const getEffectiveLevel = (qid: string, baseLevel: number) => {
        let total = baseLevel;
        Object.values(equipment || {}).forEach(itemId => {
            if (!itemId) return;
            const itemDef = qualityDefs[itemId];
            if (!itemDef || !itemDef.bonus) return;
            const bonuses = itemDef.bonus.split(',');
            for (const bonus of bonuses) {
                const match = bonus.trim().match(/^\$([a-zA-Z0-9_]+)\s*([+\-])\s*(\d+)$/);
                if (match) {
                    const [, targetQid, op, value] = match;
                    if (targetQid === qid) {
                        const numVal = parseInt(value, 10);
                        if (op === '+') total += numVal;
                        if (op === '-') total -= numVal;
                    }
                }
            }
        });
        return total;
    };

    const characterQualities = useMemo(() => {
        return Object.keys(qualities)
        .map(qid => {
            const definition = qualityDefs[qid];
            const state = qualities[qid];
            if (!definition) return null;

            const cats = (definition.category ?? "").split(",").map(s => s.trim());
            const shouldDisplay = categoriesToDisplay.some(c => cats.includes(c));
            
            if (!shouldDisplay) return null;

            const baseLevel = ('level' in state) ? state.level : 0;
            const effectiveLevel = getEffectiveLevel(qid, baseLevel);

            return { ...definition, ...state, baseLevel, effectiveLevel };
        })
        .filter(Boolean as any);
    }, [qualities, equipment, qualityDefs, categoriesToDisplay]);

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
                    const bonusText = bonusDiff > 0 ? `(+${bonusDiff})` : bonusDiff < 0 ? `(${bonusDiff})` : '';
                    const bonusClass = bonusDiff > 0 ? 'text-green-400' : 'text-red-400';
                    
                    // Dynamic Name Resolution
                    const displayName = evaluateText(q.name, qualities, qualityDefs);

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