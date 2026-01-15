'use client';

import { useState, useEffect } from 'react';

interface ActionTimerProps {
    currentActions: number; 
    maxActions: number;
    lastTimestamp: string | Date;
    regenIntervalMinutes: number;
    regenAmount: number;
    onRegen: () => void; 
}

export default function ActionTimer({ 
    currentActions, 
    maxActions, 
    lastTimestamp, 
    regenIntervalMinutes,
    regenAmount,
    onRegen 
}: ActionTimerProps) {
    
    const [displayState, setDisplayState] = useState({
        actions: currentActions,
        timeLeft: "--:--"
    });

    useEffect(() => {
        const intervalMs = regenIntervalMinutes * 60 * 1000;
        const lastTime = new Date(lastTimestamp).getTime();

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastTime;
            const cyclesPassed = Math.floor(elapsed / intervalMs);
            const actionsGained = cyclesPassed * regenAmount;
            
            const effectiveActions = Math.min(maxActions, currentActions + actionsGained);
            const msIntoCurrentCycle = elapsed % intervalMs;
            const msRemaining = intervalMs - msIntoCurrentCycle;
            if (effectiveActions >= maxActions) {
                setDisplayState({ actions: maxActions, timeLeft: "MAX" });
            } else {
                const m = Math.floor(msRemaining / 60000);
                const s = Math.floor((msRemaining % 60000) / 1000);
                setDisplayState({ 
                    actions: effectiveActions, 
                    timeLeft: `${m}:${s < 10 ? '0' : ''}${s}` 
                });

                if (msRemaining < 1000) {
                    onRegen(); 
                }
            }
        };

        const timerId = setInterval(tick, 1000);
        tick(); 

        return () => clearInterval(timerId);
    }, [currentActions, maxActions, lastTimestamp, regenIntervalMinutes, onRegen, regenAmount]);

    return (
        <div className="action-timer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                {displayState.actions} / {maxActions}
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {displayState.actions >= maxActions ? (
                    <span style={{ color: 'var(--success-color)' }}>Full</span>
                ) : (
                    <span>+{regenAmount} in <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'monospace' }}>{displayState.timeLeft}</span></span>
                )}
            </div>
        </div>
    );
}