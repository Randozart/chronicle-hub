'use client';

import { useState, useEffect } from 'react';

interface ActionTimerProps {
    currentActions: number;
    maxActions: number;
    lastTimestamp: string | Date; // Passed from DB
    regenIntervalMinutes: number;
    onRegen: () => void; // Callback to parent to increment action count
}

export default function ActionTimer({ 
    currentActions, 
    maxActions, 
    lastTimestamp, 
    regenIntervalMinutes,
    onRegen 
}: ActionTimerProps) {
    
    const [timeLeft, setTimeLeft] = useState<string>("--:--");

    useEffect(() => {
        if (currentActions >= maxActions) {
            setTimeLeft("MAX");
            return;
        }

        const intervalMs = regenIntervalMinutes * 60 * 1000;
        const lastTime = new Date(lastTimestamp).getTime();

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastTime;
            
            // Calculate time remaining for the *next* action
            // Logic: How many intervals have passed? What's the remainder?
            const timeIntoCurrentInterval = elapsed % intervalMs;
            const msRemaining = intervalMs - timeIntoCurrentInterval;

            if (msRemaining <= 1000) {
                // Timer hit zero!
                onRegen();
                // In a real app, we might re-sync with server here, but optimistic is fine
            }

            const m = Math.floor(msRemaining / 60000);
            const s = Math.floor((msRemaining % 60000) / 1000);
            setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
        };

        const timerId = setInterval(tick, 1000);
        tick(); // Run immediately

        return () => clearInterval(timerId);
    }, [currentActions, maxActions, lastTimestamp, regenIntervalMinutes, onRegen]);

    return (
        <div className="action-timer" style={{ fontSize: '0.9rem', color: '#aaa' }}>
            {currentActions >= maxActions ? (
                <span>Actions Full</span>
            ) : (
                <span>Next action in: <span style={{ color: 'white', fontWeight: 'bold' }}>{timeLeft}</span></span>
            )}
        </div>
    );
}