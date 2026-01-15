// src/hooks/usePlaybackState.ts
import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

export function usePlaybackState(
    isPlaying: boolean, 
    totalDurationSlots: number, 
    bpm: number, 
    grid: number, 
    timeSig: [number, number]
) {
    const [currentSlot, setCurrentSlot] = useState(0);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const animate = () => {
            if (isPlaying && Tone.getTransport().state === 'started') {
                const slotsPerBeat = grid * (4 / timeSig[1]);
                const ticksPerBeat = Tone.getTransport().PPQ; 
                const ticksPerSlot = ticksPerBeat / slotsPerBeat;
                
                const currentTicks = Tone.getTransport().ticks;
                const slot = currentTicks / ticksPerSlot;
                
                setCurrentSlot(slot);
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, grid, timeSig]);

    return currentSlot;
}