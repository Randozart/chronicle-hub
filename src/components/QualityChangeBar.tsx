// src/components/QualityChangeBar.tsx
'use client';

import { QualityChangeInfo, QualityType } from "@/engine/models";
import { useEffect, useState } from "react";

const getCPforNextLevel = (level: number): number => level + 1;

export default function QualityChangeBar({ change }: { change: QualityChangeInfo }) {
    const [fillWidth, setFillWidth] = useState('0%');

    // For non-Pyramidal types, just show the text.
    if (change.type !== QualityType.Pyramidal) {
        return <p className="quality-change-text simple-change">{change.changeText}</p>;
    }

    const leveledUp = change.levelAfter > change.levelBefore;
    const leveledDown = change.levelAfter < change.levelBefore;
    
    // Determine the initial state of the bar for the animation's start point.
    // If you leveled down, the bar starts full. Otherwise, it starts from your previous CP.
    const startPercent = leveledDown ? 100 : (change.cpBefore / getCPforNextLevel(change.levelBefore)) * 100;
    
    // Determine the target state of the bar.
    // If you leveled up, the bar fills to 100%. Otherwise, it goes to your new CP value.
    const endPercent = leveledUp ? 100 : (change.cpAfter / getCPforNextLevel(change.levelAfter)) * 100;

    const isMenace = change.category?.includes('menace');
    const fillClassName = isMenace ? 'quality-bar-fill menace' : 'quality-bar-fill';

    if (change.type !== QualityType.Pyramidal) {
        return <p className={`quality-change-text simple-change ${isMenace ? 'menace-text' : ''}`}>{change.changeText}</p>;
    }

    useEffect(() => {
        // Set initial width instantly.
        setFillWidth(`${startPercent}%`);
        // Trigger animation to the end width after a short delay.
        const timer = setTimeout(() => setFillWidth(`${endPercent}%`), 100);
        return () => clearTimeout(timer);
    }, [startPercent, endPercent]);

    return (
        <div className="quality-change-item">
            <p className="quality-change-text">{change.changeText}</p>
            <div className="bar-wrapper">
                <span className="bar-level-label left">{leveledDown ? change.levelAfter : change.levelBefore}</span>
                <div className="quality-bar-background">
                    <div 
                        className={fillClassName}
                        style={{ width: fillWidth }}
                    />
                </div>
                <span className="bar-level-label right">{leveledDown ? change.levelAfter + 1 : change.levelBefore + 1}</span>
            </div>
        </div>
    );
}