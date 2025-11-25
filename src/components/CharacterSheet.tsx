'use client';
import { PlayerQualities, QualityDefinition, WorldSettings, QualityType } from "@/engine/models";
import { useMemo } from "react";

interface CharacterSheetProps {
    qualities: PlayerQualities;
    equipment: Record<string, string | null>; // <--- New Prop
    qualityDefs: Record<string, QualityDefinition>;
    settings: WorldSettings;
}
const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, equipment, qualityDefs, settings }: CharacterSheetProps) {
    
    const categoriesToDisplay = settings.characterSheetCategories || [];

    // Helper to calculate effective stats
    const getEffectiveLevel = (qid: string, baseLevel: number) => {
        let total = baseLevel;
        
        // Loop through equipment slots
        Object.values(equipment || {}).forEach(itemId => {
            if (!itemId) return;
            const itemDef = qualityDefs[itemId];
            if (!itemDef || !itemDef.bonus) return;

            // Parse bonus string (same regex as GameEngine)
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

            const categories = (definition.category ?? "").split(",").map(s => s.trim());
            const shouldDisplay = categoriesToDisplay.some(c => categories.includes(c));
            
            if (!shouldDisplay) return null;

            const baseLevel = ('level' in state) ? state.level : 0;
            const effectiveLevel = getEffectiveLevel(qid, baseLevel);

            return { ...definition, ...state, baseLevel, effectiveLevel };
        })
        .filter(Boolean as any);
    }, [qualities, equipment, qualityDefs, categoriesToDisplay]);

    if (characterQualities.length === 0) return null;

    return (
        <aside className="character-sheet">
            <h2>Character</h2>
            <ul>
                {characterQualities.map(q => {
                    if (!q) return null; 

                    const changePoints = ('changePoints' in q) ? q.changePoints : 0;
                    const isPyramidal = q.type === QualityType.Pyramidal;
                    
                    // Use effectiveLevel for display/CP calculation? 
                    // Usually CP is based on Base Level, but Display is Effective.
                    // Let's stick to CP based on BASE level (standard RPG practice), 
                    // but display the Effective level.
                    
                    const cpNeeded = isPyramidal ? getCPforNextLevel(q.baseLevel) : 0;
                    const cpPercent = cpNeeded > 0 ? (changePoints / cpNeeded) * 100 : 0;

                    // Calculate the bonus difference for display (e.g., "10 (+3)")
                    const bonusDiff = q.effectiveLevel - q.baseLevel;
                    const bonusText = bonusDiff > 0 ? `(+${bonusDiff})` : bonusDiff < 0 ? `(${bonusDiff})` : '';
                    const bonusClass = bonusDiff > 0 ? 'text-green-400' : 'text-red-400';

                    return (
                        <li key={q.id} className="quality-item">
                            <p className="quality-header">
                                <span className="quality-name">{q.name}</span>
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
                                        style={{ width: `${cpPercent}%` }}
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