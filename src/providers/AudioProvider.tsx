'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { ParsedTrack, SequenceEvent } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { getOrMakeInstrument } from '@/engine/audio/synth';
import { LigatureParser } from '@/engine/audio/parser';
import { InstrumentDefinition } from '@/engine/audio/models'; 

interface AudioContextType {
    playTrack: (source: string, instruments: InstrumentDefinition[]) => void;
    stop: () => void;
    isPlaying: boolean;
    initializeAudio: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudio = () => useContext(AudioContext)!;

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // State to hold the current song data (Refs are used to avoid re-renders during loop)
    const currentTrackRef = useRef<ParsedTrack | null>(null);
    const instrumentDefsRef = useRef<InstrumentDefinition[]>([]); 
    
    // Scheduler State
    const playlistIndexRef = useRef(0);
    const nextNoteTimeRef = useRef(0);
    const scheduleIdRef = useRef<number | null>(null); // To cancel specific Tone transport events

    const initializeAudio = async () => {
        if (isInitialized) return;
        try {
            await Tone.start();
            Tone.Transport.start();
            setIsInitialized(true);
            console.log("Audio Engine Started");
        } catch (e) {
            console.error("Failed to start audio context:", e);
        }
    };

    const stop = () => {
        if (scheduleIdRef.current !== null) {
            Tone.Transport.clear(scheduleIdRef.current);
            scheduleIdRef.current = null;
        }
        
        // Cancel all scheduled notes on the transport timeline
        Tone.Transport.cancel(); 
        
        currentTrackRef.current = null;
        setIsPlaying(false);
        playlistIndexRef.current = 0;
    };

    const playTrack = async (ligatureSource: string, instruments: InstrumentDefinition[]) => {
        if (!isInitialized) await initializeAudio();
        
        // 1. Parse
        const parser = new LigatureParser();
        const track = parser.parse(ligatureSource);
        
        // 2. Setup
        stop(); // Stop previous track
        currentTrackRef.current = track;
        instrumentDefsRef.current = instruments;
        
        // 3. Set Global Transport Settings
        Tone.Transport.bpm.value = track.config.bpm;
        // Swing logic (0 to 1) applied to 8th or 16th notes depending on resolution
        // Tone.js handles swing subdiv automatically usually for 8th notes.
        // For custom grids, this might need manual offset logic later, but we set it here for now.
        // Tone.Transport.swing = track.config.swing; 
        
        // 4. Kickoff the Loop
        // We schedule the first block slightly in the future to ensure audio context is ready
        nextNoteTimeRef.current = Tone.Transport.now() + 0.1; 
        scheduleNextBlock();
        setIsPlaying(true);
    };

    // --- CORE SCHEDULING LOOP ---
    
    const scheduleNextBlock = () => {
        const track = currentTrackRef.current;
        if (!track) return;

        // 1. Get Current Playlist Item
        // If we reached the end, loop back to 0
        if (playlistIndexRef.current >= track.playlist.length) {
            playlistIndexRef.current = 0; 
        }
        const item = track.playlist[playlistIndexRef.current];

        // 2. Calculate Duration of this Block
        // We find the longest pattern in this layer to determine when the NEXT block starts
        let maxDurationSlots = 0;

        // 3. Schedule Patterns (Layers)
        item.patternIds.forEach(patId => {
            const pattern = track.patterns[patId];
            if (!pattern) return;

            // Track the longest pattern so we know when to advance the playlist
            maxDurationSlots = Math.max(maxDurationSlots, pattern.duration);
            
            // Iterate Tracks (Bass, Lead, etc)
            for (const [trackName, events] of Object.entries(pattern.tracks)) {
                // Find Asset ID mapping (e.g. Bass -> fm_bass)
                const instId = track.instruments[trackName];
                // Find Definition in our library
                const instDef = instrumentDefsRef.current.find(d => d.id === instId);
                
                if (instDef) {
                    const synth = getOrMakeInstrument(instDef);
                    scheduleSequence(
                        synth, 
                        events, 
                        track.config, 
                        nextNoteTimeRef.current, 
                        item.transposition
                    );
                }
            }
        });

        // 4. Calculate Time for NEXT block
        // Formula: (60 / BPM) / (Grid/4) = Seconds per Slot
        // Explanation: Grid 4 means 4 slots per beat (16th notes). 
        // If Grid is 12, 12 slots per beat.
        const secondsPerBeat = 60 / track.config.bpm;
        // Slots per beat comes from track config (default 4)
        const slotsPerBeat = track.config.grid; 
        const secondsPerSlot = secondsPerBeat / slotsPerBeat;
        
        const blockDurationSeconds = maxDurationSlots * secondsPerSlot;

        // Advance Cursor
        nextNoteTimeRef.current += blockDurationSeconds;
        playlistIndexRef.current++;

        // 5. Schedule Recursive Call
        // We schedule the NEXT calculation slightly before this block ends to ensure gapless playback.
        // "scheduleOnce" takes an absolute time on the Transport timeline.
        scheduleIdRef.current = Tone.Transport.scheduleOnce(() => {
            scheduleNextBlock();
        }, nextNoteTimeRef.current - 0.1); // 100ms lookahead
    };

    const scheduleSequence = (
        synth: Tone.PolySynth, 
        events: SequenceEvent[], 
        config: ParsedTrack['config'], 
        startTime: number,
        globalTranspose: number
    ) => {
        const secondsPerBeat = 60 / config.bpm;
        const slotsPerBeat = config.grid;
        const secondsPerSlot = secondsPerBeat / slotsPerBeat;

        events.forEach(event => {
            const timeOffset = event.time * secondsPerSlot;
            const duration = event.duration * secondsPerSlot;
            
            // Resolve Notes
            const frequencies = event.notes.map(n => 
                resolveNote(
                    n.degree + globalTranspose, // Shift degree by playlist logic
                    config.scaleRoot,
                    config.scaleMode,
                    n.octaveShift,
                    n.accidental,
                    n.isNatural
                )
            );

            // Schedule Attack/Release
            // Note: startTime is absolute Tone.Transport time
            synth.triggerAttackRelease(
                frequencies, 
                duration, 
                startTime + timeOffset
            );
        });
    };

    return (
        <AudioContext.Provider value={{ playTrack, stop, isPlaying, initializeAudio }}>
            {children}
        </AudioContext.Provider>
    );
}