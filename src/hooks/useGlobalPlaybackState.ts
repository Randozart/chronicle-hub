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
            if (transport.state === 'started') {
                const seconds = transport.seconds;
                const beatsPerSecond = bpm / 60;
                // This formula matches your parser's logic exactly. This is the source of truth.
                const slotsPerBeat = grid * (4 / timeSig[1]);
                const slotsPerSecond = beatsPerSecond * slotsPerBeat;
                const absoluteSlot = seconds * slotsPerSecond;
                setCurrentSlot(absoluteSlot);
                requestRef.current = requestAnimationFrame(animate);
            } else {
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            }
        };

        if (isPlaying) {
            setCurrentSlot(0);
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setCurrentSlot(0);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, bpm, grid, timeSig]);

    return currentSlot;
}