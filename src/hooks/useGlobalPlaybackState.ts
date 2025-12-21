// src/hooks/useGlobalPlaybackState.ts
import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

export function useGlobalPlaybackState(
    isPlaying: boolean,
    bpm: number,
    grid: number,
    timeSig: [number, number]
) {
    const [currentSlot, setCurrentSlot] = useState(0);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            // Check state directly from Tone
            const transportState = Tone.getTransport().state;
            
            if (transportState === 'started') {
                const seconds = Tone.getTransport().seconds;
                
                // Calculate Slot Position
                // Formula: Seconds * (Beats / Second) * (Slots / Beat)
                const beatsPerSecond = bpm / 60;
                // grid = slots per quarter note? OR slots per bar?
                // Ligature Parser assumes: slotsPerBeat = grid * (4 / timeSig[1])
                // E.g. Grid 4 (16th notes in 4/4) -> 4 * (4/4) = 4 slots per beat.
                const slotsPerBeat = grid * (4 / timeSig[1]);
                
                const currentBeat = seconds * beatsPerSecond;
                const absoluteSlot = currentBeat * slotsPerBeat;
                
                setCurrentSlot(absoluteSlot);
                requestRef.current = requestAnimationFrame(animate);
            } else {
                // If Tone stopped but React state says isPlaying, we might be pausing
                // Just cancel the loop to save CPU
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            }
        };

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Reset logic or Pause logic
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // Optionally reset to 0 if stopped, or keep position if paused
            if (Tone.getTransport().state !== 'started') {
                 setCurrentSlot(0);
            }
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, bpm, grid, timeSig]);

    return currentSlot;
}