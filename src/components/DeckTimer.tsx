'use client';

import { useState, useEffect } from 'react';
import { DeckDefinition, WorldSettings } from '@/engine/models';

interface Props {
    deck: DeckDefinition;
    settings: WorldSettings;
    lastUpdate: string | Date;
    currentCharges: number;
    maxCharges: number;
    onRegen: () => void; // Trigger a visual refresh
}

export default function DeckTimer({ deck, settings, lastUpdate, currentCharges, maxCharges, onRegen }: Props) {
    const [timeLeft, setTimeLeft] = useState("--:--");

    useEffect(() => {
        if (currentCharges >= maxCharges) {
            setTimeLeft("");
            return;
        }

        // 1. Determine Interval
        let intervalMinutes = 0;
        
        if (deck.timer === 'sync_actions') {
            intervalMinutes = settings.regenIntervalInMinutes;
        } else if (deck.timer) {
            // Try parsing as number
            const parsed = parseInt(deck.timer, 10);
            if (!isNaN(parsed)) intervalMinutes = parsed;
            // Note: If it's complex logic ("$vitality"), client-side prediction is hard. 
            // We default to 0 (hidden) or standard to avoid complex parsing here.
        }

        if (intervalMinutes <= 0) return;

        const intervalMs = intervalMinutes * 60 * 1000;
        const lastTime = new Date(lastUpdate).getTime();

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastTime;
            const timeIntoCurrentInterval = elapsed % intervalMs;
            const msRemaining = intervalMs - timeIntoCurrentInterval;

            if (msRemaining <= 1000) {
                // Optimistic update suggestion
                onRegen(); 
            }

            const m = Math.floor(msRemaining / 60000);
            const s = Math.floor((msRemaining % 60000) / 1000);
            setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
        };

        const timerId = setInterval(tick, 1000);
        tick();

        return () => clearInterval(timerId);
    }, [deck, settings, lastUpdate, currentCharges, maxCharges, onRegen]);

    if (currentCharges >= maxCharges || timeLeft === "") return null;

    return (
        <span style={{ fontSize: '0.8rem', color: '#aaa', marginLeft: '10px' }}>
            Next card in: <span style={{ color: '#fff', fontWeight: 'bold' }}>{timeLeft}</span>
        </span>
    );
}