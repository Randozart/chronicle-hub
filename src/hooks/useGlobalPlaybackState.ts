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
            const transport = Tone.getTransport();
            if (isPlaying && transport.state === 'started') {
                const seconds = transport.seconds;
                
                // Convert linear seconds into total slots elapsed
                const beatsPerSecond = bpm / 60;
                const slotsPerBeat = grid * (4 / timeSig[1]);
                const slotsPerSecond = beatsPerSecond * slotsPerBeat;
                
                const absoluteSlot = seconds * slotsPerSecond;
                
                setCurrentSlot(absoluteSlot);
                requestRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            setCurrentSlot(0); // Reset on play start
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setCurrentSlot(0); // Reset on stop
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, bpm, grid, timeSig]);

    return currentSlot;
}