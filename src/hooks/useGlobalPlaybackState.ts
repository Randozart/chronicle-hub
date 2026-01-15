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
            const transportState = Tone.getTransport().state;
            
            if (transportState === 'started') {
                const seconds = Tone.getTransport().seconds;
                const beatsPerSecond = bpm / 60;
                const slotsPerBeat = grid * (4 / timeSig[1]);
                
                const currentBeat = seconds * beatsPerSecond;
                const absoluteSlot = currentBeat * slotsPerBeat;
                
                setCurrentSlot(absoluteSlot);
                requestRef.current = requestAnimationFrame(animate);
            } else {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            }
        };

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
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