'use client';

import { QualityChangeInfo, QualityType } from "@/engine/models"; // Assuming QualityChangeInfo is in models
import { useEffect, useState } from "react";

// The same helper function from the engine
const getCPforNextLevel = (level: number): number => level + 1;

export default function QualityChangeBar({ change }: { change: QualityChangeInfo }) {
    const [fillWidth, setFillWidth] = useState('0%');

    const isPyramidal = change.type === QualityType.Pyramidal;
    const cpNeededBefore = isPyramidal ? getCPforNextLevel(change.levelBefore) : 1;
    const cpNeededAfter = isPyramidal ? getCPforNextLevel(change.levelAfter) : 1;
    
    // Calculate percentages for the bar fill
    const startPercent = isPyramidal ? (change.cpBefore / cpNeededBefore) * 100 : change.levelBefore;
    const endPercent = isPyramidal ? (change.cpAfter / cpNeededAfter) * 100 : change.levelAfter;

    // Animate the bar after the component mounts
    useEffect(() => {
        // Start the bar at the "before" state
        setFillWidth(`${startPercent}%`);
        // Use a timeout to allow the initial state to render, then trigger the animation
        const timer = setTimeout(() => {
            setFillWidth(`${endPercent}%`);
        }, 100);

        return () => clearTimeout(timer);
    }, [startPercent, endPercent]);


    // Don't show a bar for non-numerical qualities
    if (change.type === QualityType.String) {
        return <p className="quality-change-text">{change.changeText}</p>;
    }
    
    return (
        <div className="quality-change-item">
            <p className="quality-change-text">{change.changeText}</p>
            <div className="quality-bar-background">
                <div 
                    className="quality-bar-fill" 
                    style={{ width: fillWidth }}
                />
            </div>
        </div>
    );
}