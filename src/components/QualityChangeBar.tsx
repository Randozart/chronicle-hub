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
    // 1. Data Extraction & State
    const levelBefore = change.levelBefore || 0;
    const levelAfter = change.levelAfter || 0;
    const cpBefore = change.cpBefore || 0;
    const cpAfter = change.cpAfter || 0;
    const leveledUp = levelAfter > levelBefore;

    const [displayLevel, setDisplayLevel] = useState(levelAfter);
    const [fillWidth, setFillWidth] = useState('0%');
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const [transitionDuration, setTransitionDuration] = useState('0.8s');

    // 2. Visuals
    const displayText = change.overrideDescription || change.changeText;
    let barColor = 'var(--success-color)'; 
    if (categoryDef?.color) barColor = categoryDef.color;
    else if (change.category?.includes('menace')) barColor = 'var(--danger-color)';

    // 3. Simple Text Fallback
    if (change.type !== QualityType.Pyramidal) {
        const isMenace = change.category?.includes('menace');
        return (
            <div className="quality-change-item" style={{ width: '100%' }}>
                <p className={`quality-change-text simple-change ${isMenace ? 'menace-text' : ''}`} style={{ margin: 0, fontSize: '0.9rem', color: isMenace ? 'var(--danger-color)' : 'var(--text-secondary)' }}>
                    {displayText}
                </p>
            </div>
        );
    }

    // 4. Animation Logic
    useEffect(() => {
        let timeouts: NodeJS.Timeout[] = [];

        if (leveledUp) {
            // === LEVEL UP SEQUENCE ===
            const cpNeededOld = getCPforNextLevel(levelBefore);
            const startPercent = Math.min(100, (cpBefore / cpNeededOld) * 100);
            const cpNeededNew = getCPforNextLevel(levelAfter);
            const finalPercent = Math.min(100, (cpAfter / cpNeededNew) * 100);

            // Step 1: Snap to start position
            setTransitionDuration('0s');
            setDisplayLevel(levelBefore);
            setFillWidth(`${startPercent}%`);
            setIsLevelingUp(false);

            // Step 2: Animate to 100% and trigger "pop"
            timeouts.push(setTimeout(() => {
                setTransitionDuration('0.6s');
                setFillWidth('100%');
                setIsLevelingUp(true);
            }, 50));

            // Step 3: Snap bar to 0% and update level number
            timeouts.push(setTimeout(() => {
                setTransitionDuration('0s');
                setFillWidth('0%');
                setDisplayLevel(levelAfter);
            }, 700));

            // Step 4: Animate to final percentage and remove "pop"
            timeouts.push(setTimeout(() => {
                setTransitionDuration('0.6s');
                setFillWidth(`${finalPercent}%`);
                setIsLevelingUp(false);
            }, 800));

        } else {
            // === NORMAL CHANGE (NO LEVEL UP) ===
            const cpNeeded = getCPforNextLevel(levelAfter);
            const startP = cpNeeded > 0 ? (cpBefore / cpNeeded) * 100 : 0;
            const endP = cpNeeded > 0 ? (cpAfter / cpNeeded) * 100 : 0;
            
            setTransitionDuration('0s');
            setDisplayLevel(levelAfter);
            setFillWidth(`${Math.max(0, Math.min(100, startP))}%`);
            setIsLevelingUp(false);

            timeouts.push(setTimeout(() => {
                setTransitionDuration('0.8s');
                setFillWidth(`${Math.max(0, Math.min(100, endP))}%`);
            }, 50));
        }

        return () => timeouts.forEach(clearTimeout);
    }, [change]);

    return (
        <div className="quality-change-item" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <p className="quality-change-text" style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{displayText}</p>
            </div>
            
            <div className="bar-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="bar-level-label left" style={{ 
                    minWidth: '20px', 
                    textAlign: 'right', 
                    fontSize: isLevelingUp ? '1rem' : '0.8rem', // Pop size
                    fontWeight: 'bold',
                    transform: isLevelingUp ? 'scale(1.25)' : 'scale(1)',
                    color: isLevelingUp ? 'var(--accent-highlight)' : 'var(--text-muted)', // Pop color
                    transition: 'transform 0.3s ease, color 0.3s ease, font-size 0.3s ease'
                }}>
                    {displayLevel}
                </span>
                
                <div className="quality-bar-background" style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                    <div 
                        className="quality-bar-fill"
                        style={{ 
                            width: fillWidth,
                            height: '100%',
                            backgroundColor: barColor,
                            transition: `width ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`
                        }}
                    />
                </div>
                
                <span className="bar-level-label right" style={{ minWidth: '20px', textAlign: 'left', opacity: 0.5, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {displayLevel + 1}
                </span>
            </div>
        </div>
    );
}