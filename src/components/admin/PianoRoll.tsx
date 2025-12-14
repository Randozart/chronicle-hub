'use client';
import { useEffect, useRef, useState } from 'react';
import { ParsedTrack } from '@/engine/audio/models';
import { LigatureParser } from '@/engine/audio/parser';

interface Props {
    source: string;
}

export default function PianoRoll({ source }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);

    // 1. Parse Source
    useEffect(() => {
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source);
            setParsedTrack(track);
            
            // Default to the first pattern if none selected, or if current selection is gone
            const patternKeys = Object.keys(track.patterns);
            if (patternKeys.length > 0) {
                if (!selectedPatternId || !track.patterns[selectedPatternId]) {
                    setSelectedPatternId(patternKeys[0]);
                }
            } else {
                setSelectedPatternId("");
            }
        } catch (e) {
            // Ignore parsing errors while typing
        }
    }, [source]);

    // 2. Draw Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !parsedTrack || !selectedPatternId) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pattern = parsedTrack.patterns[selectedPatternId];
        if (!pattern) return;

        const { grid } = parsedTrack.config;
        const slotsPerBeat = grid;
        const totalSlots = pattern.duration;
        const trackNames = Object.keys(pattern.tracks);

        // --- DIMENSIONS ---
        const SLOT_W = 12;      // Width of one 16th note
        const ROW_H = 60;       // Height of one Instrument Track
        const HEADER_W = 80;    // Width of the label area
        const NOTE_H = 6;       // Height of a single note block

        canvas.width = HEADER_W + (totalSlots * SLOT_W) + 50; // Extra padding
        canvas.height = Math.max(150, trackNames.length * ROW_H);

        // --- BACKGROUND ---
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- GRID DRAWING ---
        ctx.lineWidth = 1;
        for (let x = 0; x <= totalSlots; x++) {
            const xPos = HEADER_W + (x * SLOT_W);
            
            // Determine Line Strength
            // Bar Line (Based on 4/4 assumption for visuals, or config if available)
            const isBar = x % (slotsPerBeat * 4) === 0; 
            const isBeat = x % slotsPerBeat === 0;

            ctx.beginPath();
            ctx.moveTo(xPos, 0);
            ctx.lineTo(xPos, canvas.height);

            if (isBar) {
                ctx.strokeStyle = '#444'; // Bright Bar Line
            } else if (isBeat) {
                ctx.strokeStyle = '#2a2a2a'; // Dim Beat Line
            } else {
                ctx.strokeStyle = '#1a1a1a'; // Faint Subdiv Line
            }
            ctx.stroke();
        }

        // --- TRACKS & NOTES ---
        trackNames.forEach((name, trackIndex) => {
            const yStart = trackIndex * ROW_H;
            const events = pattern.tracks[name];

            // 1. Track Background (Zebra Striping)
            if (trackIndex % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
                ctx.fillRect(0, yStart, canvas.width, ROW_H);
            }

            // 2. Track Label
            ctx.fillStyle = '#181a1f';
            ctx.fillRect(0, yStart, HEADER_W, ROW_H);
            ctx.fillStyle = '#888';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(name.substring(0, 10), 5, yStart + (ROW_H / 2) + 4);
            
            // Border between tracks
            ctx.strokeStyle = '#333';
            ctx.beginPath();
            ctx.moveTo(0, yStart + ROW_H);
            ctx.lineTo(canvas.width, yStart + ROW_H);
            ctx.stroke();

            // 3. Draw Notes
            events.forEach(evt => {
                const x = HEADER_W + (evt.time * SLOT_W);
                const w = Math.max(SLOT_W - 1, (evt.duration * SLOT_W) - 1);
                
                // --- VISUAL PITCH CALCULATION ---
                // We map scale degrees (1-7) to a vertical position within the row.
                // Higher degree = Higher Y (Smaller Y value).
                // Center line is roughly degree 1 of current octave.
                const noteDef = evt.notes[0];
                if (!noteDef) return;

                const degree = noteDef.degree;
                const octave = noteDef.octaveShift;
                
                // Calculate relative height. 
                // 1 = Bottomish. 7 = Topish. Octaves shift significantly.
                // Base offset + (Degree * Step) + (Octave * LargeStep)
                const relativePitch = (degree) + (octave * 7);
                
                // Map pitch to Y pixels. 
                // Center of row is roughly pitch 4.
                // Invert so higher pitch is lower Y value.
                const centerY = yStart + (ROW_H / 2);
                const yOffset = (relativePitch - 4) * -4; // -4 pixels per scale step
                
                const noteY = Math.max(yStart + 2, Math.min(yStart + ROW_H - NOTE_H - 2, centerY + yOffset));

                // Color Coding
                const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c'];
                ctx.fillStyle = colors[(degree - 1) % 7] || '#888';
                
                // Shadow for depth
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x + 2, noteY + 2, w, NOTE_H);
                
                // Main Note Block
                ctx.globalAlpha = 0.9;
                ctx.fillRect(x, noteY, w, NOTE_H);
                
                // Note Label (Small)
                if (w > 15) {
                    ctx.fillStyle = '#000';
                    ctx.font = '8px sans-serif';
                    let label = `${degree}`;
                    if (noteDef.accidental > 0) label += '#';
                    if (noteDef.accidental < 0) label += 'b';
                    if (noteDef.octaveShift > 0) label += "'";
                    if (noteDef.octaveShift < 0) label += ",";
                    ctx.fillText(label, x + 2, noteY + NOTE_H - 1);
                }
            });
            
            ctx.globalAlpha = 1.0;
        });

    }, [parsedTrack, selectedPatternId]);

    if (!parsedTrack) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#111', padding: '0.5rem', borderRadius: '4px', border: '1px solid #333' }}>
                <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>VISUALIZE PATTERN:</span>
                <select 
                    value={selectedPatternId} 
                    onChange={e => setSelectedPatternId(e.target.value)}
                    className="form-select"
                    style={{ width: 'auto', padding: '0.2rem 1rem', fontSize: '0.8rem' }}
                >
                    {Object.keys(parsedTrack.patterns).map(pid => (
                        <option key={pid} value={pid}>{pid}</option>
                    ))}
                </select>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#555' }}>
                    {parsedTrack.patterns[selectedPatternId]?.duration} slots
                </span>
            </div>

            <div style={{ width: '100%', overflowX: 'auto', border: '1px solid #333', borderRadius: '4px', background: '#000' }}>
                <canvas ref={canvasRef} style={{ display: 'block' }} />
            </div>
        </div>
    );
}