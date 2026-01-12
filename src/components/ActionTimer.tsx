'use client';

import { useState, useEffect } from 'react';

interface ActionTimerProps {
    currentActions: number; // Stale DB value
    maxActions: number;
    lastTimestamp: string | Date;
    regenIntervalMinutes: number;
    onRegen: () => void; // Trigger parent refresh/save
}

export default function ActionTimer({ 
    currentActions, 
    maxActions, 
    lastTimestamp, 
    regenIntervalMinutes,
    onRegen 
}: ActionTimerProps) {
    
    // We maintain local display state to show "Offline Gained" actions immediately
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

            // 1. Calculate actions gained purely by time passed
            const actionsGainedOffline = Math.floor(elapsed / intervalMs);
            const effectiveActions = Math.min(maxActions, currentActions + actionsGainedOffline);

            // 2. Calculate time into the *current* pending action
            const msIntoCurrentCycle = elapsed % intervalMs;
            const msRemaining = intervalMs - msIntoCurrentCycle;

            // 3. Update Display
            if (effectiveActions >= maxActions) {
                setDisplayState({ actions: maxActions, timeLeft: "MAX" });
            } else {
                const m = Math.floor(msRemaining / 60000);
                const s = Math.floor((msRemaining % 60000) / 1000);
                setDisplayState({ 
                    actions: effectiveActions, 
                    timeLeft: `${m}:${s < 10 ? '0' : ''}${s}` 
                });

                // If we officially hit a new tick in real-time, notify parent to sync/save if desired
                // (Optional: debounce this to avoid spamming calls)
                if (msRemaining < 1000) {
                    onRegen(); 
                }
            }
        };

        const timerId = setInterval(tick, 1000);
        tick(); // Run immediately to prevent flash of old data

        return () => clearInterval(timerId);
    }, [currentActions, maxActions, lastTimestamp, regenIntervalMinutes, onRegen]);

    return (
        <div className="action-timer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                {displayState.actions} / {maxActions}
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {displayState.actions >= maxActions ? (
                    <span style={{ color: 'var(--success-color)' }}>Full</span>
                ) : (
                    <span>Next in: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'monospace' }}>{displayState.timeLeft}</span></span>
                )}
            </div>
        </div>
    );
}