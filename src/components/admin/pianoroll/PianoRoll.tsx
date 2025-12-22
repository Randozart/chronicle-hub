'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { ParsedTrack, SequenceEvent, NoteDef, InstrumentDefinition, ParsedPattern } from '@/engine/audio/models';
import { serializeParsedTrack } from '@/engine/audio/serializer';
import { PlayerQualities } from '@/engine/models';
import { resolveNote } from '@/engine/audio/scales';
import { Note, Scale } from 'tonal';
import { LigatureParser } from '@/engine/audio/parser';
import * as Tone from 'tone';
import { usePlaybackState } from '@/hooks/usePlaybackState';
import { useAudio } from '@/providers/AudioProvider';

import PianoRollToolbar from './PianoRollToolbar';
import PianoRollKeys from './PianoRollKeys';
import PianoRollGrid from './PianoRollGrid';
import AutomationDrawer from './AutomationDrawer';

interface Props {
    source: string;
    qualities?: PlayerQualities;
    onChange: (newSource: string) => void;
    availableInstruments: InstrumentDefinition[]; 
    playbackMode: 'global' | 'local' | 'stopped';
    onPlaybackModeChange: (mode: 'global' | 'local' | 'stopped') => void;
}

const SLOT_W = 24;
const ROW_H = 16; 
const SCALE_BG = 'rgba(97, 175, 239, 0.08)'; 

type AutoMode = 'volume' | 'pan' | 'fade' | 'swell';

function pseudoRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

const getNoteId = (track: string, evtIdx: number, noteIdx: number) => `${track}:${evtIdx}:${noteIdx}`;

export default function PianoRoll({ 
    source, qualities, onChange, availableInstruments, 
    playbackMode, onPlaybackModeChange 
}: Props) {
    const [selectedPatternId, setSelectedPatternId] = useState<string>("");
    const [activeLane, setActiveLane] = useState<string>("");
    const [parsedTrack, setParsedTrack] = useState<ParsedTrack | null>(null);
    const [height, setHeight] = useState(400); 
    
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewWidth, setViewWidth] = useState(800);
    
    const gridRef = useRef<HTMLDivElement>(null);
    const keysRef = useRef<HTMLDivElement>(null);
    const autoRef = useRef<HTMLDivElement>(null);

    const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
    const [selectionRect, setSelectionRect] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
    
    const [dragState, setDragState] = useState<{
        type: 'move' | 'resize' | 'automation';
        startX: number;
        startY: number;
        trackName?: string;
        eventIndex?: number;
        originalVal?: number;
    } | null>(null);
    const [dragDelta, setDragDelta] = useState<{ slots: number, rows: number }>({ slots: 0, rows: 0 });

    const [showAutomation, setShowAutomation] = useState(false);
    const [autoHeight, setAutoHeight] = useState(140);
    const [autoMode, setAutoMode] = useState<'volume' | 'pan' | 'fade' | 'swell'>('volume');
    
    const { playTrack, stop: audioStop, isPlaying } = useAudio();

    // --- HELPER: Resolve Collisions (The Fix) ---
    const resolveCollisions = (pattern: ParsedPattern, baseLane: string) => {
        const groupKeys = Object.keys(pattern.tracks).filter(k => k === baseLane || k.startsWith(`${baseLane}_#`));
        let allEvents: SequenceEvent[] = [];
        
        groupKeys.forEach(key => {
            pattern.tracks[key].forEach(event => allEvents.push(event));
            pattern.tracks[key] = []; // Clear to rebuild
        });

        // Sort by time, then duration
        allEvents.sort((a, b) => (a.time - b.time) || (b.duration - a.duration));

        const newTracks: Record<string, SequenceEvent[]> = {};
        
        // Ensure base lane exists
        if (!newTracks[baseLane]) newTracks[baseLane] = [];

        // Check if a list of events has space for [start, end]
        const checkOverlap = (laneEvents: SequenceEvent[], start: number, end: number) => {
            return laneEvents.some(e => {
                const eEnd = e.time + e.duration;
                // Epsilon for float precision
                return (start < eEnd - 0.001) && (end > e.time + 0.001);
            });
        };

        const findLaneForRange = (start: number, end: number): string => {
            // Try base
            if (!checkOverlap(newTracks[baseLane], start, end)) return baseLane;
            
            // Try suffixes
            let idx = 2;
            while (true) {
                const key = `${baseLane}_#${idx}`;
                if (!newTracks[key]) newTracks[key] = [];
                if (!checkOverlap(newTracks[key], start, end)) return key;
                idx++;
                if (idx > 16) return key; // Hard cap
            }
        };

        allEvents.forEach(event => {
            const targetKey = findLaneForRange(event.time, event.time + event.duration);
            newTracks[targetKey].push(event);
            
            // Ensure modifiers exist for new lane
            if (targetKey !== baseLane) {
                if (pattern.trackModifiers && pattern.trackModifiers[baseLane]) {
                    if (!pattern.trackModifiers) pattern.trackModifiers = {};
                    // Copy base modifiers to new lane if missing
                    if (!pattern.trackModifiers[targetKey]) {
                        pattern.trackModifiers[targetKey] = { ...pattern.trackModifiers[baseLane] };
                    }
                }
            }
        });

        // Write back
        Object.assign(pattern.tracks, newTracks);
    };

    // --- PARSING ---
    useEffect(() => {
        try {
            const parser = new LigatureParser();
            const track = parser.parse(source, qualities);
            setParsedTrack(track);
            
            const patternKeys = Object.keys(track.patterns);
            if (patternKeys.length > 0) {
                if (!selectedPatternId || !track.patterns[selectedPatternId]) {
                    const firstPat = patternKeys[0];
                    setSelectedPatternId(firstPat);
                    const lanes = Object.keys(track.patterns[firstPat].tracks);
                    if (lanes.length > 0) setActiveLane(lanes[0].split('_#')[0]);
                }
            }
        } catch (e) { }
    }, [source, qualities]);

    useEffect(() => {
        if (!parsedTrack) return;
        const patternKeys = Object.keys(parsedTrack.patterns);
        if (patternKeys.length === 0) return;

        let currentPatternId = selectedPatternId;
        if (!currentPatternId || !parsedTrack.patterns[currentPatternId]) {
            currentPatternId = patternKeys[0];
            setSelectedPatternId(currentPatternId);
        }

        const pattern = parsedTrack.patterns[currentPatternId];
        if (pattern) {
            const lanes = Object.keys(pattern.tracks);
            if (lanes.length > 0) {
                const currentBase = activeLane;
                const hasCurrent = lanes.some(l => l.split('_#')[0] === currentBase);
                if (!currentBase || !hasCurrent) {
                    setActiveLane(lanes[0].split('_#')[0]);
                }
            } else {
                setActiveLane("");
            }
        }
    }, [parsedTrack, selectedPatternId]);

    const activePattern = parsedTrack?.patterns[selectedPatternId];
    const config = parsedTrack?.config;
    const currentSlot = usePlaybackState(isPlaying, activePattern?.duration || 0, config?.bpm || 120, config?.grid || 4, config?.timeSig || [4,4]);

    const scalePCs = useMemo(() => config ? Scale.get(`${config.scaleRoot} ${config.scaleMode.toLowerCase()}`).notes : [], [config]);
    const { noteRange, minMidi } = useMemo(() => {
        if (!activePattern || !config) return { noteRange: [], minMidi: 48 };
        const min = 36; const max = 96; 
        const range = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return { noteRange: range, minMidi: min };
    }, [activePattern, config]);
    const midiToRow = (midi: number) => noteRange.length - 1 - (midi - minMidi);

    const toggleLocalPlay = () => {
        if (playbackMode === 'local') {
            audioStop();
            onPlaybackModeChange('stopped');
        } else {
            if (!parsedTrack || !selectedPatternId) return;
            audioStop(); 
            const soloTrack = JSON.parse(JSON.stringify(parsedTrack));
            soloTrack.playlist = [{ type: 'pattern', layers: [{ items: [{ id: selectedPatternId, transposition: 0 }] }] }];
            const soloSource = serializeParsedTrack(soloTrack);
            playTrack(soloSource, availableInstruments, qualities);
            onPlaybackModeChange('local');
        }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        setScrollLeft(target.scrollLeft);
        setScrollTop(target.scrollTop);
        if (keysRef.current) keysRef.current.scrollTop = target.scrollTop;
        if (autoRef.current) autoRef.current.scrollLeft = target.scrollLeft;
    };

    useEffect(() => {
        if (!gridRef.current) return;
        setViewWidth(gridRef.current.clientWidth);
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) setViewWidth(entry.contentRect.width);
        });
        observer.observe(gridRef.current);
        return () => observer.disconnect();
    }, []);

    const isTrackInActiveGroup = (trackName: string) => {
        return trackName === activeLane || trackName.startsWith(`${activeLane}_#`);
    };

    const handleGridMouseDown = (e: React.MouseEvent, midiVal: number) => {
        if (e.button !== 0) return;
        if (!parsedTrack || !selectedPatternId || !activeLane) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const localX = e.clientX - rect.left; 
        const absX = localX + scrollLeft; 
        const clickedSlot = Math.floor(absX / SLOT_W);

        if (e.ctrlKey || e.metaKey) {
            setSelectedNotes(new Set());
            setSelectionRect({ 
                startX: localX + scrollLeft, 
                startY: e.clientY - rect.top + scrollTop, 
                currentX: localX + scrollLeft, 
                currentY: e.clientY - rect.top + scrollTop 
            });
            return;
        }

        const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
        const pattern = newTrack.patterns[selectedPatternId];
        
        // Smart Lane Logic: Initial Check
        let targetLane = activeLane;
        const groupLanes = Object.keys(pattern.tracks).filter(isTrackInActiveGroup);
        let found = false;
        
        for (const key of groupLanes) {
            const events = pattern.tracks[key];
            const collision = events.some(ev => ev.time < (clickedSlot + 1) && (ev.time + ev.duration) > clickedSlot);
            if (!collision) { targetLane = key; found = true; break; }
        }
        
        if (!found) {
            let idx = 2;
            while (pattern.tracks[`${activeLane}_#${idx}`]) idx++;
            targetLane = `${activeLane}_#${idx}`;
            pattern.tracks[targetLane] = [];
            if (pattern.trackModifiers && pattern.trackModifiers[activeLane]) {
                if (!pattern.trackModifiers[targetLane]) pattern.trackModifiers[targetLane] = { ...pattern.trackModifiers[activeLane] };
            }
        }

        const noteDef = resolveScaleDegree(midiVal, config!.scaleRoot, config!.scaleMode);
        pattern.tracks[targetLane].push({ time: clickedSlot, duration: 1, notes: [noteDef] });
        
        // Resolve immediately
        resolveCollisions(pattern, activeLane);
        
        onChange(serializeParsedTrack(newTrack));
    };

    const handleNoteMouseDown = (e: React.MouseEvent, trackName: string, evtIdx: number, noteIdx: number) => {
        e.stopPropagation();
        
        if (e.button === 2) {
            e.preventDefault();
            const newTrack = JSON.parse(JSON.stringify(parsedTrack));
            const ev = newTrack.patterns[selectedPatternId].tracks[trackName][evtIdx];
            if (ev.notes.length > 1) ev.notes.splice(noteIdx, 1);
            else newTrack.patterns[selectedPatternId].tracks[trackName].splice(evtIdx, 1);
            
            resolveCollisions(newTrack.patterns[selectedPatternId], activeLane);
            
            onChange(serializeParsedTrack(newTrack));
            return;
        }

        const id = getNoteId(trackName, evtIdx, noteIdx);
        const isSelected = selectedNotes.has(id);
        const newSelection = new Set(e.shiftKey ? selectedNotes : []);

        if (!isSelected && !e.shiftKey) {
            newSelection.clear();
            newSelection.add(id);
        } else {
            newSelection.add(id);
        }
        setSelectedNotes(newSelection);

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const isResize = (e.clientX - rect.left) > rect.width - 10;
        
        setDragState({
            type: isResize ? 'resize' : 'move',
            startX: e.clientX,
            startY: e.clientY
        });
        setDragDelta({ slots: 0, rows: 0 });
    };

    const handleAutomationMouseDown = (e: React.MouseEvent, trackName: string, eventIndex: number, currentVal: number) => { 
        e.stopPropagation();
        setDragState({
            type: 'automation',
            startX: e.clientX,
            startY: e.clientY,
            trackName,
            eventIndex,
            originalVal: currentVal
        });
        setDragDelta({ slots: 0, rows: 0 }); 
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (selectionRect) {
                if (!gridRef.current) return;
                const rect = gridRef.current.getBoundingClientRect();
                const scrollX = gridRef.current.scrollLeft;
                const scrollY = gridRef.current.scrollTop;
                setSelectionRect(prev => prev ? { ...prev, currentX: (e.clientX - rect.left) + scrollX, currentY: (e.clientY - rect.top) + scrollY } : null);
                return;
            }

            if (!dragState) return;
            const deltaX = e.clientX - dragState.startX;
            const deltaY = e.clientY - dragState.startY;

            if (dragState.type === 'automation') {
                const isAttenuation = autoMode === 'fade' || autoMode === 'swell';
                const direction = isAttenuation ? 1 : -1;
                setDragDelta({ slots: 0, rows: deltaY * 0.5 * direction }); 
            } else {
                const dSlots = Math.round(deltaX / SLOT_W);
                const dRows = Math.round(deltaY / ROW_H);
                setDragDelta({ slots: dSlots, rows: -dRows });
            }
        };

        const handleMouseUp = () => {
            if (selectionRect && parsedTrack && selectedPatternId) {
                const x1 = Math.min(selectionRect.startX, selectionRect.currentX);
                const x2 = Math.max(selectionRect.startX, selectionRect.currentX);
                const y1 = Math.min(selectionRect.startY, selectionRect.currentY);
                const y2 = Math.max(selectionRect.startY, selectionRect.currentY);

                const newSet = new Set<string>();
                const pattern = parsedTrack.patterns[selectedPatternId];
                const laneKeys = Object.keys(pattern.tracks).filter(isTrackInActiveGroup);

                laneKeys.forEach(trackName => {
                    pattern.tracks[trackName].forEach((ev, eIdx) => {
                        const noteLeft = ev.time * SLOT_W;
                        const noteWidth = ev.duration * SLOT_W;
                        
                        if (noteLeft < x2 && (noteLeft + noteWidth) > x1) {
                            ev.notes.forEach((n, nIdx) => {
                                const midi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 0;
                                const top = midiToRow(midi) * ROW_H;
                                if (top < y2 && (top + ROW_H) > y1) {
                                    newSet.add(getNoteId(trackName, eIdx, nIdx));
                                }
                            });
                        }
                    });
                });
                setSelectedNotes(newSet);
                setSelectionRect(null);
                return;
            }

            if (dragState && parsedTrack && activePattern) {
                const newTrack = JSON.parse(JSON.stringify(parsedTrack)) as ParsedTrack;
                const pattern = newTrack.patterns[selectedPatternId];

                if (dragState.type === 'automation' && dragState.trackName !== undefined && dragState.eventIndex !== undefined) {
                    const event = pattern.tracks[dragState.trackName][dragState.eventIndex];
                    const rounded = Math.round(Math.min(100, Math.max(autoMode === 'volume' ? -60 : (autoMode === 'pan' ? -100 : 0), (dragState.originalVal || 0) + dragDelta.rows)));
                    
                    if (autoMode === 'volume') event.notes[0].volume = Math.min(6, rounded);
                    else {
                        if (!event.notes[0].effects) event.notes[0].effects = [];
                        let code = autoMode === 'pan' ? 'P' : (autoMode === 'fade' ? 'F' : 'S');
                        event.notes[0].effects = event.notes[0].effects.filter(e => e.code !== code);
                        if (rounded !== 0) event.notes[0].effects.push({ code, value: rounded });
                    }
                    onChange(serializeParsedTrack(newTrack));

                } else if (dragDelta.slots !== 0 || dragDelta.rows !== 0) {
                    const processedEvents = new Set<SequenceEvent>();
                    const laneKeys = Object.keys(pattern.tracks).filter(isTrackInActiveGroup);

                    laneKeys.forEach(trackName => {
                        pattern.tracks[trackName].forEach((ev, eIdx) => {
                            ev.notes.forEach((n, nIdx) => {
                                if (selectedNotes.has(getNoteId(trackName, eIdx, nIdx))) {
                                    if (dragState.type === 'move') {
                                        if (!processedEvents.has(ev)) {
                                            ev.time = Math.max(0, ev.time + dragDelta.slots);
                                            processedEvents.add(ev);
                                        }
                                        if (dragDelta.rows !== 0) {
                                            const currentMidi = Note.midi(resolveNote(n.degree, config!.scaleRoot, config!.scaleMode, n.octaveShift, n.accidental, n.isNatural)) || 60;
                                            const newDef = resolveScaleDegree(currentMidi + dragDelta.rows, config!.scaleRoot, config!.scaleMode);
                                            Object.assign(n, newDef);
                                        }
                                    } else if (dragState.type === 'resize') {
                                        if (!processedEvents.has(ev)) {
                                            ev.duration = Math.max(0.25, ev.duration + dragDelta.slots);
                                            processedEvents.add(ev);
                                        }
                                    }
                                }
                            });
                        });
                    });
                    
                    // --- FIX: Resolve Collisions BEFORE Saving ---
                    resolveCollisions(pattern, activeLane);
                    
                    onChange(serializeParsedTrack(newTrack));
                }
                setDragState(null);
                setDragDelta({ slots: 0, rows: 0 });
            }
        };

        if (dragState || selectionRect) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, selectionRect, parsedTrack, selectedNotes, dragDelta, config, autoMode, activeLane, midiToRow]);

    if (!parsedTrack || !activePattern || !config) return null;

    const totalSlots = Math.max(32, activePattern.duration + 4);
    const contentWidth = totalSlots * SLOT_W;
    const contentHeight = noteRange.length * ROW_H;
    
    const uniqueBaseLanes = Array.from(new Set(Object.keys(activePattern.tracks).map(k => k.split('_#')[0]))).sort();

    return (
        <div className="pianoroll-container">
            <PianoRollToolbar 
                patterns={Object.keys(parsedTrack.patterns)}
                selectedPatternId={selectedPatternId}
                onSelectPattern={setSelectedPatternId}
                activeLane={activeLane}
                lanes={uniqueBaseLanes}
                onSelectLane={setActiveLane}
                playbackMode={playbackMode}
                onTogglePlay={toggleLocalPlay}
                showAutomation={showAutomation}
                onToggleAutomation={setShowAutomation}
            />

            <div className="pianoroll-main">
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                    <div style={{ display: 'flex', height: `${height}px`, position: 'relative' }}>
                        
                        <PianoRollKeys 
                            scrollRef={keysRef} 
                            noteRange={noteRange} 
                            rowHeight={ROW_H} 
                            height={contentHeight} 
                        />
                        <PianoRollGrid 
                            gridRef={gridRef}
                            onScroll={handleScroll}
                            onMouseDown={handleGridMouseDown}
                            onNoteMouseDown={handleNoteMouseDown}
                            
                            pattern={activePattern}
                            config={config}
                            activeLane={activeLane}
                            noteRange={noteRange}
                            minMidi={minMidi}
                            
                            width={contentWidth}
                            height={contentHeight}
                            slotW={SLOT_W}
                            rowH={ROW_H}
                            scalePCs={scalePCs}
                            
                            currentSlot={currentSlot}
                            isPlaying={isPlaying && playbackMode === 'local'}
                            selectionRect={selectionRect}
                            selectedNotes={selectedNotes}
                            dragState={dragState}
                            dragDelta={dragDelta}
                            
                            scrollLeft={scrollLeft}
                            scrollTop={scrollTop}
                            viewWidth={viewWidth}
                            viewHeight={height}
                        />
                    </div>

                    <div 
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startY = e.clientY; const startH = height;
                            const doDrag = (ev: MouseEvent) => setHeight(Math.max(200, startH + (ev.clientY - startY)));
                            const stopDrag = () => { window.removeEventListener('mousemove', doDrag); window.removeEventListener('mouseup', stopDrag); };
                            window.addEventListener('mousemove', doDrag); window.addEventListener('mouseup', stopDrag);
                        }} 
                        className="pianoroll-resize-handle"
                    >
                        <div className="pianoroll-resize-handle-bar" />
                    </div>

                    {showAutomation && (
                        <AutomationDrawer 
                            height={autoHeight}
                            width={contentWidth}
                            mode={autoMode}
                            onSetMode={setAutoMode}
                            scrollRef={autoRef}
                            pattern={activePattern}
                            lane={activeLane}
                            slotW={SLOT_W}
                            scrollLeft={scrollLeft}
                            viewWidth={viewWidth}
                            onMouseDown={handleAutomationMouseDown}
                            dragState={dragState}
                            dragDeltaRows={dragDelta.rows}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

function resolveScaleDegree(midi: number, root: string, mode: string): NoteDef {
    const scale = Scale.get(`${root} ${mode.toLowerCase()}`);
    const pc = Note.pitchClass(Note.fromMidi(midi));
    let degree = scale.notes.indexOf(pc) + 1;
    let accidental = 0;
    if (degree === 0) { degree = 1; accidental = 1; }
    const octave = Note.octave(Note.fromMidi(midi)) || 4;
    return { degree, octaveShift: octave - 4, accidental, isNatural: false };
}