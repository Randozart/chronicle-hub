'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ParsedTrack, NoteDef } from '@/engine/audio/models';
import { resolveNote } from '@/engine/audio/scales';
import { serializeParsedTrack } from '@/engine/audio/serializer';

interface Props {
    parsedTrack: ParsedTrack | null;
    onChange: (source: string) => void;
    playlistIndex: number;
}

// QWERTY Keymap
const KEY_MAP: Record<string, { degree: number, accidental: number }> = {
    'z': { degree: 1, accidental: 0 }, 's': { degree: 1, accidental: 1 },
    'x': { degree: 2, accidental: 0 }, 'd': { degree: 2, accidental: 1 },
    'c': { degree: 3, accidental: 0 }, 'v': { degree: 4, accidental: 0 },
    'g': { degree: 4, accidental: 1 }, 'b': { degree: 5, accidental: 0 },
    'h': { degree: 5, accidental: 1 }, 'n': { degree: 6, accidental: 0 },
    'j': { degree: 6, accidental: 1 }, 'm': { degree: 7, accidental: 0 },
    ',': { degree: 8, accidental: 0 }
};

interface TrackerColumn {
    header: string;
    trackName: string;
    patternId: string;
    events: (any | null)[];
    boundaries: Map<number, { id: string, type: 'change' | 'repeat' }>;
    resolver: (rowIndex: number) => { patternId: string, localTime: number, trackName: string } | null;
}

export default function TrackerView({ parsedTrack, onChange, playlistIndex }: Props) {
    const [useAbsolute, setUseAbsolute] = useState(false);
    const [viewMode, setViewMode] = useState<'context' | 'pattern'>('context');
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    
    // View State
    const [rowHeight, setRowHeight] = useState(20);
    const [fontSize, setFontSize] = useState(11);
    const [cursor, setCursor] = useState({ row: 0, col: 0, sub: 0 }); // 0:Note, 1:Mod, 2:FX
    const [inputBuffer, setInputBuffer] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-select
    useEffect(() => {
        if (!parsedTrack) return;
        if (viewMode === 'pattern' && !selectedPatternId) {
            const firstPat = Object.keys(parsedTrack.patterns)[0];
            if (firstPat) setSelectedPatternId(firstPat);
        }
    }, [viewMode, parsedTrack, selectedPatternId]);

    // Clear buffer on nav
    useEffect(() => { setInputBuffer(""); }, [cursor]);

    if (!parsedTrack) return null;

    // --- DATA GENERATION ---
    const columns: TrackerColumn[] = [];
    let maxDuration = 0;

    const processSegment = (patId: string, globalStartTime: number, trans: number, prefix: string, isRepeat: boolean, cols: TrackerColumn[]) => {
        const pat = parsedTrack.patterns[patId];
        if (!pat) return 0;
        Object.keys(pat.tracks).sort().forEach(trackName => {
            const headerName = `${prefix}${trackName}`;
            let col = cols.find(c => c.header === headerName);
            if (!col) {
                col = { header: headerName, trackName, patternId: patId, events: [], boundaries: new Map(), resolver: () => null };
                cols.push(col);
            }
            col.boundaries.set(globalStartTime, { id: patId, type: isRepeat ? 'repeat' : 'change' });
            pat.tracks[trackName].forEach(ev => {
                const globalTime = globalStartTime + ev.time;
                while (col!.events.length <= globalTime) col!.events.push(null);
                col!.events[Math.floor(globalTime)] = { ...ev, transposition: trans };
            });
        });
        return pat.duration;
    };

    if (viewMode === 'context') {
        const item = parsedTrack.playlist[playlistIndex];
        if (item && item.type === 'pattern') {
            item.layers.forEach((layer, layerIdx) => {
                let time = 0;
                let lastPatId = '';
                const layerChainData: { start: number, end: number, patId: string, trans: number }[] = [];
                layer.items.forEach(chainItem => {
                    const dur = parsedTrack.patterns[chainItem.id]?.duration || 16;
                    const isRepeat = chainItem.id === lastPatId;
                    processSegment(chainItem.id, time, chainItem.transposition, `L${layerIdx}:`, isRepeat, columns);
                    layerChainData.push({ start: time, end: time + dur, patId: chainItem.id, trans: chainItem.transposition });
                    time += dur;
                    lastPatId = chainItem.id;
                });
                if (time > maxDuration) maxDuration = time;
                columns.filter(c => c.header.startsWith(`L${layerIdx}:`)).forEach(col => {
                    col.resolver = (r) => {
                        const seg = layerChainData.find(s => r >= s.start && r < s.end);
                        if (!seg) return null;
                        return { patternId: seg.patId, localTime: r - seg.start, trackName: col.trackName };
                    };
                });
            });
        }
    } else {
        if (selectedPatternId && parsedTrack.patterns[selectedPatternId]) {
            const dur = processSegment(selectedPatternId, 0, 0, "", false, columns);
            if (dur) maxDuration = dur;
            columns.forEach(c => {
                c.resolver = (r) => ({ patternId: selectedPatternId, localTime: r, trackName: c.trackName });
            });
        }
    }
    columns.forEach(c => { while(c.events.length < maxDuration) c.events.push(null); });

    // --- EDITING ---
    const commitEdit = (key?: string) => {
        const colDef = columns[cursor.col];
        if (!colDef) return;
        const sourceInfo = colDef.resolver(cursor.row);
        if (!sourceInfo) return; 

        const { patternId, localTime, trackName } = sourceInfo;
        const newTrack = JSON.parse(JSON.stringify(parsedTrack));
        const pattern = newTrack.patterns[patternId];
        if (!pattern) return;

        if (!pattern.tracks[trackName]) pattern.tracks[trackName] = [];
        const trackEvents = pattern.tracks[trackName];
        
        const eventIndex = trackEvents.findIndex((e: any) => Math.abs(e.time - localTime) < 0.01);
        let event = trackEvents[eventIndex];

        if (key === 'Delete' || key === '.') {
            if (eventIndex > -1) trackEvents.splice(eventIndex, 1);
            onChange(serializeParsedTrack(newTrack));
            setInputBuffer("");
            return;
        }

        if (!event) {
            if (!key && !inputBuffer) return;
            event = { time: localTime, duration: 1, notes: [{ degree: 1, octaveShift: 0, accidental: 0, isNatural: false }] };
            trackEvents.push(event);
        }

        const note = event.notes[0];
        if (cursor.sub === 0) { 
            if (inputBuffer.startsWith('@')) {
                // In a real scenario, we'd lookup definition here.
                // For visual simplicity, we assume the user types the alias name.
                // Note: The model doesn't support 'alias' string in NoteDef easily without changes.
                // We'll reset buffer for now.
            } else if (key && KEY_MAP[key.toLowerCase()]) {
                const map = KEY_MAP[key.toLowerCase()];
                note.degree = map.degree;
                note.accidental = map.accidental;
            }
        } else if (cursor.sub === 1) {
            const val = parseInt(inputBuffer);
            if (!isNaN(val)) note.volume = val * -1;
        } else if (cursor.sub === 2) {
            if (inputBuffer.length >= 2) {
                const code = inputBuffer.charAt(0).toUpperCase();
                const val = parseInt(inputBuffer.slice(1));
                note.effects = [{ code, value: isNaN(val) ? 0 : val }];
            }
        }
        trackEvents.sort((a: any, b: any) => a.time - b.time);
        onChange(serializeParsedTrack(newTrack));
        setInputBuffer("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            if (inputBuffer) commitEdit();
            if (e.key === 'ArrowUp') setCursor(p => ({ ...p, row: Math.max(0, p.row - 1) }));
            if (e.key === 'ArrowDown') setCursor(p => ({ ...p, row: Math.min(maxDuration - 1, p.row + 1) }));
            if (e.key === 'ArrowLeft') setCursor(p => p.sub > 0 ? { ...p, sub: p.sub - 1 } : (p.col > 0 ? { ...p, col: p.col - 1, sub: 2 } : p));
            if (e.key === 'ArrowRight') setCursor(p => p.sub < 2 ? { ...p, sub: p.sub + 1 } : (p.col < columns.length - 1 ? { ...p, col: p.col + 1, sub: 0 } : p));
            return;
        }
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); return; }
        if (e.key === 'Backspace') { setInputBuffer(prev => prev.slice(0, -1)); return; }
        if (e.key === 'Delete' || e.key === '.') { commitEdit('Delete'); return; }
        
        if (e.key.length === 1) {
            if (cursor.sub === 0) {
                if (e.key === '@' || inputBuffer.startsWith('@')) setInputBuffer(prev => prev + e.key);
                else commitEdit(e.key);
            } else {
                setInputBuffer(prev => prev + e.key);
            }
        }
    };

    // --- HELPER TEXT ---
    let helperText = "";
    if (cursor.sub === 0) helperText = "NOTE: Z=1, S=1# ... | CHORD: Type '@alias' -> Enter";
    else if (cursor.sub === 1) helperText = "MOD: Type Value (e.g. 10 for -10db) -> Enter";
    else if (cursor.sub === 2) helperText = "FX: Code + Value (e.g. F50, S10) -> Enter";

    const gridRows = [];
    for (let t = 0; t < maxDuration; t++) {
        const rowData = columns.map(col => {
            const boundary = col.boundaries.get(t);
            const startEvent = col.events[t];
            if (startEvent) return { type: 'note', ...startEvent, boundary };
            const sustained = col.events.find((e, i) => e && t > i && t < (i + e.duration - 0.01));
            if (sustained) return { type: 'sustain', boundary };
            return { type: 'empty', boundary };
        });
        gridRows.push(rowData);
    }

    const isEditing = inputBuffer.length > 0;

    return (
        <div 
            style={{ height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', fontSize: `${fontSize}px`, background: '#000', outline: 'none' }}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            ref={containerRef}
        >
            {/* ROW 1: CONTROLS */}
            <div style={{ padding: '4px', background: '#21252b', borderBottom: '1px solid #333', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select value={viewMode} onChange={e => setViewMode(e.target.value as any)} style={{ background: '#111', color: '#fff', border: '1px solid #444', fontSize:'11px' }}>
                    <option value="context">Playlist Row</option>
                    <option value="pattern">Pattern</option>
                </select>
                {viewMode === 'pattern' && (
                    <select value={selectedPatternId} onChange={e => setSelectedPatternId(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid #444', fontSize:'11px' }}>
                        <option value="" disabled>Select Pattern</option>
                        {Object.keys(parsedTrack.patterns).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft:'1px solid #444', paddingLeft:'8px' }}>
                    <button onClick={() => { setRowHeight(h => Math.max(12, h-2)); setFontSize(f => Math.max(9, f-1)); }} style={{background:'#333', color:'#fff', border:'none', cursor:'pointer', width:'20px'}}>-</button>
                    <button onClick={() => { setRowHeight(h => Math.min(40, h+2)); setFontSize(f => Math.min(16, f+1)); }} style={{background:'#333', color:'#fff', border:'none', cursor:'pointer', width:'20px'}}>+</button>
                    
                    <label style={{ color: '#ccc', display:'flex', alignItems:'center', gap:'4px', fontSize:'10px', marginLeft:'8px' }}>
                        <input type="checkbox" checked={useAbsolute} onChange={e => setUseAbsolute(e.target.checked)} />
                        Absolute/Relative Notes
                    </label>
                </div>
            </div>

            {/* ROW 2: INPUT CONSOLE (Always Visible, Highlighted on Edit) */}
            <div style={{ 
                padding: '4px 8px', 
                background: isEditing ? '#1e222a' : '#111', 
                borderBottom: '1px solid #333', 
                display: 'flex', alignItems: 'center', gap: '12px',
                fontSize: '11px',
                color: '#aaa',
                height: '28px',
                transition: 'background 0.1s'
            }}>
                <span style={{ color: '#98c379', minWidth: '50px' }}>Row: {cursor.row}</span>
                
                <div style={{ display: 'flex', gap: '4px', color: isEditing ? '#fff' : '#555', fontWeight: isEditing ? 'bold' : 'normal' }}>
                    <span>INPUT:</span>
                    <span style={{ color: isEditing ? '#e06c75' : '#555', borderBottom: isEditing ? '1px solid #e06c75' : 'none', minWidth: '40px' }}>
                        {inputBuffer || "___"}
                    </span>
                </div>

                <span style={{ 
                    marginLeft: 'auto', 
                    color: isEditing ? '#61afef' : '#444', 
                    fontStyle: 'italic',
                    fontWeight: isEditing ? 'bold' : 'normal'
                }}>
                    {helperText}
                </span>
            </div>
            
            {/* GRID */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#181a1f', zIndex: 20 }}>
                        <tr>
                            <th style={{ width: '40px', borderRight: '1px solid #333', color: '#555', background: '#181a1f', zIndex: 21 }}>#</th>
                            {columns.map((col, i) => (
                                <th key={i} colSpan={3} style={{ 
                                    width: '130px', maxWidth:'130px', borderRight: '1px solid #444', 
                                    color: i === cursor.col ? '#fff' : '#98c379', 
                                    background: i === cursor.col ? '#2c313a' : '#181a1f',
                                    textAlign: 'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
                                }}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                        <tr style={{ color: '#666', fontSize: `${Math.max(9, fontSize-2)}px` }}>
                            <th style={{ background: '#21252b', borderRight:'1px solid #333' }}></th>
                            {columns.map((_, i) => (
                                <React.Fragment key={i}>
                                    <th style={{ width:'50px', background: '#21252b', textAlign:'center', color: (cursor.col === i && cursor.sub === 0) ? '#fff' : '#666' }}>Note</th>
                                    <th style={{ width:'40px', background: '#21252b', textAlign:'center', color: (cursor.col === i && cursor.sub === 1) ? '#fff' : '#666' }}>Mod</th>
                                    <th style={{ width:'40px', background: '#21252b', textAlign:'center', borderRight:'1px solid #444', color: (cursor.col === i && cursor.sub === 2) ? '#fff' : '#666' }}>FX</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {gridRows.map((cells, t) => (
                            <tr key={t} style={{ height: `${rowHeight}px`, background: t === cursor.row ? '#2c313a' : t % 4 === 0 ? '#141414' : '#0d0d0d' }}>
                                <td style={{ color: '#444', borderRight: '1px solid #333', textAlign: 'right', paddingRight: '4px' }}>
                                    {t.toString(16).toUpperCase().padStart(2, '0')}
                                </td>
                                {cells.map((cell, i) => {
                                    const hasFocus = (t === cursor.row && i === cursor.col);
                                    
                                    let borderStyle = {};
                                    let label = null;
                                    if (cell.boundary) {
                                        if (cell.boundary.type === 'change') {
                                            borderStyle = { borderTop: '2px solid #666' };
                                            label = <div style={{ position:'absolute', top:0, left:0, background:'#333', color:'#fff', fontSize:'9px', padding:'0 2px', zIndex:5, opacity:0.8, pointerEvents:'none' }}>{cell.boundary.id}</div>;
                                        } else {
                                            borderStyle = { borderTop: '1px dashed #444' };
                                        }
                                    }

                                    const getCellStyle = (sub: number) => ({
                                        ...borderStyle,
                                        position: 'relative' as const,
                                        textAlign: 'center' as const,
                                        outline: (hasFocus && cursor.sub === sub) ? '2px solid white' : 'none',
                                        outlineOffset: '-2px',
                                        background: (hasFocus && cursor.sub === sub) ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        zIndex: (hasFocus && cursor.sub === sub) ? 15 : 'auto',
                                        cursor: 'cell'
                                    });

                                    if (cell.type === 'sustain') {
                                        return (
                                            <React.Fragment key={i}>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 0})} style={{ ...getCellStyle(0), color: '#fff', fontWeight:'bold', letterSpacing:'3px' }}>
                                                    {label} — 
                                                </td>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 1})} style={{ ...getCellStyle(1), color: '#fff', opacity: 0.2 }}> | </td>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 2})} style={{ ...getCellStyle(2), color: '#fff', borderRight: '1px solid #333', opacity: 0.2 }}> | </td>
                                            </React.Fragment>
                                        );
                                    }
                                    
                                    if (cell.type === 'empty') {
                                        return (
                                            <React.Fragment key={i}>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 0})} style={{ ...getCellStyle(0), color: '#222' }}>
                                                    {label} . 
                                                </td>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 1})} style={{ ...getCellStyle(1), color: '#222' }}> . </td>
                                                <td onClick={() => setCursor({row: t, col: i, sub: 2})} style={{ ...getCellStyle(2), color: '#222', borderRight: '1px solid #333' }}> . </td>
                                            </React.Fragment>
                                        );
                                    }

                                    const note = cell.notes[0];
                                    const isChord = cell.notes.length > 1;
                                    const noteColor = isChord ? '#d19a66' : '#61afef';

                                    const modifiers = [];
                                    if (note.volume !== undefined) modifiers.push(`${Math.abs(note.volume)}`);
                                    
                                    const fxStr = note.effects ? note.effects.map((e: any) => `${e.code}${e.value}`).join('') : '';

                                    return (
                                        <React.Fragment key={i}>
                                            <td onClick={() => setCursor({row: t, col: i, sub: 0})} style={{ ...getCellStyle(0), color: noteColor, fontWeight:'bold' }}>
                                                {label}
                                                {formatNote(cell.notes, parsedTrack.config, useAbsolute)}
                                            </td>
                                            <td onClick={() => setCursor({row: t, col: i, sub: 1})} style={{ ...getCellStyle(1), color: '#c678dd' }}>
                                                {modifiers[0] || '..'}
                                            </td>
                                            <td onClick={() => setCursor({row: t, col: i, sub: 2})} style={{ ...getCellStyle(2), color: '#e5c07b', borderRight:'1px solid #333' }}>
                                                {fxStr || '..'}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function formatNote(notes: NoteDef[], config: any, absolute: boolean) {
    if (notes.length > 1) return "@Chord";
    const n = notes[0];
    if (!absolute) {
        let s = `${n.degree}`;
        if(n.accidental > 0) s+='#';
        if(n.accidental < 0) s+='b';
        return s;
    }
    try { return resolveNote(n.degree, config.scaleRoot, config.scaleMode, n.octaveShift, n.accidental, n.isNatural); } 
    catch(e) { return '?'; }
}