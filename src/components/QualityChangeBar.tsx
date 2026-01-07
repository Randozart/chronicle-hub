'use client';

import { CategoryDefinition, QualityChangeInfo, QualityType } from "@/engine/models";
import { useEffect, useState } from "react";

// Standard Formula: Next Level = Current Level + 1
const getCPforNextLevel = (level: number): number => level + 1;

interface Props {
    change: QualityChangeInfo;
    categoryDef?: CategoryDefinition;
}

export default function QualityChangeBar({ change, categoryDef }: Props) {
    const [fillWidth, setFillWidth] = useState('0%');

    // 1. Determine Display Text
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
    
    // START STATE: 
    // If leveled UP, we start at 100% of previous level (visually full), then jump to 0 of new.
    // If leveled DOWN, we start at 0 of previous, then jump to full of new.
    // But for a simple animation, let's just animate the CURRENT level's progress.
    
    const cpNeededBefore = getCPforNextLevel(change.levelBefore);
    const cpNeededAfter = getCPforNextLevel(change.levelAfter);

    let startPercent = 0;
    let endPercent = 0;

    if (leveledUp) {
        // We only show the progress filling up the NEW level
        startPercent = 0;
        endPercent = (change.cpAfter / cpNeededAfter) * 100;
    } else if (leveledDown) {
        // We show the drop in the NEW level
        startPercent = 100;
        endPercent = (change.cpAfter / cpNeededAfter) * 100;
    } else {
        // Same Level: Just animate the bar
        startPercent = (change.cpBefore / cpNeededBefore) * 100;
        endPercent = (change.cpAfter / cpNeededAfter) * 100;
    }
    
    useEffect(() => {
        // Reset to start position immediately
        setFillWidth(`${startPercent}%`);
        
        // Then animate to end position
        const timer = setTimeout(() => setFillWidth(`${endPercent}%`), 50);
        return () => clearTimeout(timer);
    }, [startPercent, endPercent]);

    return (
        <div className="quality-change-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <p className="quality-change-text" style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold' }}>{displayText}</p>
                {/* Optional: Show "+1 CP" text here if desired */}
            </div>
            
            <div className="bar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="bar-level-label left" style={{ minWidth: '20px', textAlign: 'right' }}>
                    {change.levelAfter}
                </span>
                
                <div className="quality-bar-background" style={{ flex: 1, height: '8px', background: 'var(--bg-item)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <div 
                        className="quality-bar-fill"
                        style={{ 
                            width: fillWidth,
                            height: '100%',
                            backgroundColor: barColor,
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    />
                </div>
                
                <span className="bar-level-label right" style={{ minWidth: '20px', textAlign: 'left', opacity: 0.5 }}>
                    {change.levelAfter + 1}
                </span>
            </div>
        </div>
    );
}