// src/components/QualityChangeBar.tsx
'use client';

import { CategoryDefinition, QualityChangeInfo, QualityType } from "@/engine/models";
import { useEffect, useState } from "react";

const getCPforNextLevel = (level: number): number => level + 1;

interface Props {
    change: QualityChangeInfo;
    categoryDef?: CategoryDefinition;
}

export default function QualityChangeBar({ change, categoryDef }: Props) {
    const [fillWidth, setFillWidth] = useState('0%');

    // 1. Determine Display Text
    // Priority: Dynamic Override ([desc:...]) > Default Change Text (increase_description)
    const displayText = change.overrideDescription || change.changeText;

    // 2. Determine Color
    let barColor = '#2ecc71'; 
    if (categoryDef?.color) barColor = categoryDef.color;
    else if (change.category?.includes('menace')) barColor = '#e74c3c';

    // 3. Handle Non-Pyramidal (Simple Text)
    if (change.type !== QualityType.Pyramidal) {
        const isMenace = change.category?.includes('menace');
        return (
            <div className="quality-change-item">
                <p className={`quality-change-text simple-change ${isMenace ? 'menace-text' : ''}`} style={{ color: isMenace ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                    {displayText}
                </p>
            </div>
        );
    }

    // 4. Handle Pyramidal (Progress Bar)
    const leveledUp = change.levelAfter > change.levelBefore;
    const leveledDown = change.levelAfter < change.levelBefore;
    
    // Animation Logic
    const startPercent = leveledDown ? 100 : (change.cpBefore / getCPforNextLevel(change.levelBefore)) * 100;
    const endPercent = leveledUp ? 100 : (change.cpAfter / getCPforNextLevel(change.levelAfter)) * 100;
    
    useEffect(() => {
        setFillWidth(`${startPercent}%`);
        const timer = setTimeout(() => setFillWidth(`${endPercent}%`), 100);
        return () => clearTimeout(timer);
    }, [startPercent, endPercent]);

    return (
        <div className="quality-change-item">
            {/* Use the resolved display text */}
            <p className="quality-change-text" style={{ color: barColor }}>{displayText}</p>
            
            <div className="bar-wrapper">
                <span className="bar-level-label left">{leveledDown ? change.levelAfter : change.levelBefore}</span>
                <div className="quality-bar-background">
                    <div 
                        className="quality-bar-fill"
                        style={{ 
                            width: fillWidth,
                            backgroundColor: barColor
                        }}
                    />
                </div>
                <span className="bar-level-label right">{leveledDown ? change.levelAfter + 1 : change.levelBefore + 1}</span>
            </div>
        </div>
    );
}