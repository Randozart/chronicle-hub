'use client';

import { useState, useEffect } from 'react';
import { DeckDefinition, WorldSettings } from '@/engine/models';

interface Props {
    deck: DeckDefinition;
    settings: WorldSettings;
    lastUpdate: string | Date;
    currentCharges: number;
    maxCharges: number;
    onRegen?: () => void;
    actionTimestamp?: string | Date; // NEW PROP
}

export default function DeckTimer({ 
    deck, settings, lastUpdate, currentCharges, maxCharges, onRegen = () => {}, actionTimestamp 
}: Props) {
    const [timeLeft, setTimeLeft] = useState<string | null>(null);

    useEffect(() => {
        if (currentCharges >= maxCharges) {
            setTimeLeft(null);
            return;
        }

        let intervalMinutes = 0;
        let effectiveLastUpdate = new Date(lastUpdate).getTime();
        
        // FIX: Determine Interval AND Reference Time
        if (deck.timer === 'sync_actions') {
            intervalMinutes = settings.regenIntervalInMinutes;
            // If synced, override the deck's specific time with the global action time
            if (actionTimestamp) {
                effectiveLastUpdate = new Date(actionTimestamp).getTime();
            }
        } else if (deck.timer) {
            const parsed = parseInt(deck.timer, 10);
            if (!isNaN(parsed)) intervalMinutes = parsed;
        }

        if (intervalMinutes <= 0) return;

        const intervalMs = intervalMinutes * 60 * 1000;

        const tick = () => {
            const now = Date.now();
            const elapsed = now - effectiveLastUpdate;
            
            // Offline Calc
            const chargesGained = Math.floor(elapsed / intervalMs);
            const effectiveCharges = Math.min(maxCharges, currentCharges + chargesGained);

            if (effectiveCharges >= maxCharges) {
                setTimeLeft(null);
                // Trigger refresh if we just crossed the line locally
                if (currentCharges < maxCharges) onRegen();
                return;
            }

            const msRemaining = intervalMs - (elapsed % intervalMs);
            
            // If we are extremely close to the next tick, trigger regen
            if (msRemaining < 1000) {
                onRegen();
            }

            const m = Math.floor(msRemaining / 60000);
            const s = Math.floor((msRemaining % 60000) / 1000);
            setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
        };

        const timerId = setInterval(tick, 1000);
        tick();

        return () => clearInterval(timerId);
    }, [deck, settings, lastUpdate, currentCharges, maxCharges, onRegen, actionTimestamp]);

    if (!timeLeft) return null;

    return (
        <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem', 
            background: 'rgba(0,0,0,0.3)', 
            border: '1px solid var(--border-color)',
            padding: '2px 8px',
            borderRadius: '12px',
            marginLeft: '10px',
            color: 'var(--text-secondary)',
            verticalAlign: 'middle'
        }}>
            <span>⏳</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{timeLeft}</span>
        </span>
    );
}