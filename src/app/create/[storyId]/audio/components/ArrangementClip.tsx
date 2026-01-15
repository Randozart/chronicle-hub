// src/app/create/[storyId]/audio/components/ArrangementClip.tsx
'use client';
import { ParsedPattern, NoteDef } from "@/engine/audio/models";
import { resolveNote } from "@/engine/audio/scales";
import { Note } from "tonal";

interface Props {
    pattern: ParsedPattern;
    totalDuration: number;
    color: string;
    slotWidth: number;
    config: any;
    noteRange: { min: number, max: number };
}
const midiCache = new Map<string, number>();

function getNoteMidi(note: NoteDef, config: any): number {
    const key = `${note.degree}-${note.octaveShift}-${note.accidental}`;
    if (midiCache.has(key)) {
        return midiCache.get(key)!;
    }
    const midi = Note.midi(resolveNote(note.degree, config.scaleRoot, config.scaleMode, note.octaveShift, note.accidental, note.isNatural)) || 60;
    midiCache.set(key, midi);
    return midi;
}

export default function ArrangementClip({ pattern, totalDuration, color, slotWidth, config, noteRange }: Props) {
    if (!pattern || pattern.duration <= 0) {
        return <div style={{ width: `${totalDuration * slotWidth}px`, height: '100%', borderRight: '1px solid #444' }} />;
    }

    const repetitions = Math.ceil(totalDuration / pattern.duration);
    const allNotes: { left: number; top: number; width: number }[] = [];
    const rangeSpan = noteRange.max - noteRange.min;

    for (let i = 0; i < repetitions; i++) {
        const timeOffset = i * pattern.duration;
        if (timeOffset >= totalDuration) break;

        Object.values(pattern.tracks).forEach(track => {
            track.forEach(event => {
                const eventStartTime = timeOffset + event.time;
                if (eventStartTime >= totalDuration) return;
                
                const eventDuration = Math.min(event.duration, totalDuration - eventStartTime);

                event.notes.forEach(note => {
                    const midi = getNoteMidi(note, config);
                    const topPercent = 100 - ((midi - noteRange.min) / rangeSpan) * 100;
                    
                    allNotes.push({
                        left: eventStartTime * slotWidth,
                        top: topPercent,
                        width: eventDuration * slotWidth,
                    });
                });
            });
        });
    }

    return (
        <div style={{ width: `${totalDuration * slotWidth}px`, height: '100%', position: 'relative', overflow: 'hidden', borderRight: '1px solid #444' }}>
            {allNotes.map((note, index) => (
                <div 
                    key={index}
                    style={{
                        position: 'absolute',
                        left: `${note.left}px`,
                        top: `${note.top}%`,
                        width: `${note.width}px`,
                        height: '3px',
                        background: color,
                        borderRadius: '1px',
                        transform: 'translateY(-50%)'
                    }}
                />
            ))}
        </div>
    );
}