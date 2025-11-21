// src/components/CharacterSheet.tsx
'use client';

import { useEffect } from 'react';
import { PlayerQualities, WorldContent, QualityType } from "@/engine/models";
import { repositories } from "@/engine/repositories";

interface CharacterSheetProps {
    qualities: PlayerQualities;
    gameData: WorldContent; 
}

const getCPforNextLevel = (level: number): number => level + 1;

export default function CharacterSheet({ qualities, gameData }: CharacterSheetProps) {
    useEffect(() => {
        repositories.initialize(gameData);
    }, [gameData]);

    // 1. Filter for character qualities that the player actually possesses.
    const characterQualities = Object.keys(qualities)
        .map(qid => {
            const definition = repositories.getQuality(qid);
            const state = qualities[qid];
            // Return a combined object if it's a 'character' quality
            return (definition?.category?.includes('character')) ? { ...definition, ...state } : null;
        })
        .filter(Boolean); // Filter out any nulls

    if (characterQualities.length === 0) {
        return null;
    }

    return (
        <aside className="character-sheet">
            <h2>Character</h2>
            <ul>
                {characterQualities.map(q => {
                    if (!q) return null; // Safety check

                    // Default to 0 for qualities that might not have a level
                    const level = ('level' in q) ? q.level : 0;
                    const changePoints = ('changePoints' in q) ? q.changePoints : 0;
                    
                    const isPyramidal = q.type === QualityType.Pyramidal;
                    const cpNeeded = isPyramidal ? getCPforNextLevel(level) : 0;
                    const cpPercent = cpNeeded > 0 ? (changePoints / cpNeeded) * 100 : 0;

                    return (
                        <li key={q.id} className="quality-item">
                            <p className="quality-header">
                                <span className="quality-name">{q.name}</span>
                                &nbsp;
                                <span className="quality-level">{level}</span>
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