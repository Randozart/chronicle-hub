// src/engine/audio/ligatureTools.ts

import { Note, Scale } from 'tonal';
import { LigatureParser } from './parser';
import { serializeParsedTrack } from './serializer';
import { formatLigatureSource } from './formatter';
import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, PatternPlaylistItem, ChainItem, Layer } from './models';
import { PlayerQualities } from '../models';
import { MODES, resolveNote  } from './scales';

interface LigatureToolOptions {
    foldLanes?: boolean;
    extractPatterns?: boolean;
    foldAggressiveness?: 'low' | 'high';
    patternSimilarity?: 'exact' | 'rhythmic' | 'transpositional';
    patternAggressiveness?: 0 | 1 | 2 | 3;
}

export function processLigature(
    source: string, 
    options: LigatureToolOptions,
    mockQualities: PlayerQualities = {}
): string {
    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);
    
    // 1. Normalize: Split long patterns into 1-bar chunks (Crucial: Must fill gaps with RESTs)
    parsedTrack = normalizePatternsToBars(parsedTrack);

    // 2. Verticalize: Organize into Song Sections BEFORE deduplication to preserve structure.
    parsedTrack = verticalizePlaylist(parsedTrack);

    // 3. Optimize Chains: Merge sequential segments (A+B+C -> Pattern_ABC)
    parsedTrack = optimizeChains(parsedTrack);

    // 4. Exact Deduplication: Now we merge identical patterns.
    parsedTrack = extractRepeatedPatterns(parsedTrack, 0);

    // 5. Fold Lanes: Handle Polyphony
    if (options.foldLanes) {
        parsedTrack = foldInstrumentLanes(parsedTrack);
    }

    // 6. Fuzzy Deduplication
    if (options.extractPatterns) {
        if (options.patternSimilarity === 'transpositional') {
            parsedTrack = extractTransposedPatterns(parsedTrack);
        } else if (options.patternAggressiveness && options.patternAggressiveness > 0) {
            parsedTrack = extractRepeatedPatterns(parsedTrack, options.patternAggressiveness);
        }
    }
    
    // 7. Cleanup Pipeline
    parsedTrack = pruneUnusedDefinitions(parsedTrack); 
    parsedTrack = cleanupDefinitions(parsedTrack);
    parsedTrack = pruneUnusedInstruments(parsedTrack);
    parsedTrack = pruneSilentLayers(parsedTrack); // New step to remove columns of only rests
    parsedTrack = renamePatterns(parsedTrack);

    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

export function polishLigatureSource(source: string, mockQualities: PlayerQualities = {}): string {
    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);
    
    // Pipeline: Prune Unused -> Deduplicate & Rename Definitions -> Prune Instruments -> Rename Patterns
    parsedTrack = pruneUnusedDefinitions(parsedTrack); 
    parsedTrack = cleanupDefinitions(parsedTrack);
    parsedTrack = pruneUnusedInstruments(parsedTrack);
    parsedTrack = renamePatterns(parsedTrack);
    
    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

// --- HELPERS ---

function getNoteSignature(notes: NoteDef[]): string {
    return notes
      .map(n => `${n.degree},${n.octaveShift},${n.accidental},${n.isNatural}`)
      .sort()
      .join(' ');
}

function pruneUnusedDefinitions(track: ParsedTrack): ParsedTrack {
    // 1. Collect signatures of all notes played in all patterns
    const usedSignatures = new Set<string>();
    
    for (const pattern of Object.values(track.patterns)) {
        for (const events of Object.values(pattern.tracks)) {
            for (const event of events) {
                if (event.notes && event.notes.length > 1) {
                    // We only care about signatures for chords (length > 1)
                    usedSignatures.add(getNoteSignature(event.notes));
                }
            }
        }
    }

    // 2. Filter definitions based on usage
    const newDefinitions: Record<string, NoteDef[]> = {};
    for (const [alias, notes] of Object.entries(track.definitions)) {
        const sig = getNoteSignature(notes);
        if (usedSignatures.has(sig)) {
            newDefinitions[alias] = notes;
        }
    }

    track.definitions = newDefinitions;
    return track;
}

function foldInstrumentLanes(track: ParsedTrack): ParsedTrack {
    const trackGroups: Record<string, string[]> = {};
    Object.keys(track.instruments).forEach(trackName => {
        const baseName = trackName.replace(/_L\d+$/, '');
        if (!trackGroups[baseName]) trackGroups[baseName] = [];
        trackGroups[baseName].push(trackName);
    });

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const layer of playlistItem.layers) {
            for (const chainItem of layer.items) {
                const pat = track.patterns[chainItem.id];
                if(!pat) continue;
                
                for (const baseName in trackGroups) {
                    const lanes = trackGroups[baseName];
                    if (lanes.length <= 1) continue;
                    
                    const baseLaneName = lanes.find(l => pat.tracks[l]) || lanes[0];
                    // Ensure base lane exists in tracks so we have an array to push to
                    if (!pat.tracks[baseLaneName]) pat.tracks[baseLaneName] = []; 

                    const baseEvents = pat.tracks[baseLaneName];
                    
                    for (const otherLane of lanes) {
                        if (otherLane === baseLaneName) continue;
                        if (!pat.tracks[otherLane]) continue;

                        const otherEvents = pat.tracks[otherLane];
                        otherEvents.forEach(e => baseEvents.push(e));
                        delete pat.tracks[otherLane];
                    }
                    // Sort merged events by time
                    baseEvents.sort((a,b) => a.time - b.time);
                }
            }
        }
    }
    return track;
}

const INTERVAL_TO_CHORD_NAME: Record<string, string> = {
    '2': 'M2', '3': 'm3', '4': 'M3', '5': 'P4', '6': 'tri', '7': 'P5',
    '8': 'm6', '9': 'M6', '10': 'm7', '11': 'M7', '12': 'oct', '0': 'uni',
    '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug',
    '5,7': 'sus4', '2,7': 'sus2',
    '4,7,10': '7', '3,7,10': 'm7', '4,7,11': 'maj7',
    '3,6,9': 'dim7', '3,6,10': 'm7b5'
};

function cleanupDefinitions(track: ParsedTrack): ParsedTrack {
    if (!track.definitions || Object.keys(track.definitions).length === 0) {
        return track;
    }

    const modeKey = track.config.scaleMode.charAt(0).toUpperCase() + track.config.scaleMode.slice(1);
    const scaleIntervals = MODES[modeKey] || MODES['Major'];
    
    // Deduplicate existing definitions
    const canonicalDefinitions = new Map<string, NoteDef[]>(); 
    for (const notes of Object.values(track.definitions)) {
        const signature = getNoteSignature(notes);
        if (!canonicalDefinitions.has(signature)) {
            canonicalDefinitions.set(signature, notes);
        }
    }

    const finalDefinitions: Record<string, NoteDef[]> = {};
    const nameCollisionCounter: Record<string, number> = {};
    let unrecognizedCounter = 1;

    for (const notes of canonicalDefinitions.values()) {
        let bestName: string | null = null;

        for (const potentialRoot of notes) {
            const rootSemitone = degreeToSemitone(potentialRoot.degree, scaleIntervals) + (potentialRoot.octaveShift * 12) + potentialRoot.accidental;

            const intervals = notes
                .filter(n => n !== potentialRoot)
                .map(n => {
                    const noteSemitone = degreeToSemitone(n.degree, scaleIntervals) + (n.octaveShift * 12) + n.accidental;
                    return ((noteSemitone - rootSemitone) % 12 + 12) % 12;
                })
                .sort((a, b) => a - b);
            
            if (notes.length > 1 && intervals.length === 0) intervals.push(0);
            
            const intervalSignature = intervals.join(',');
            const quality = INTERVAL_TO_CHORD_NAME[intervalSignature];

            if (quality) {
                const rootName = `${potentialRoot.degree}`.replace(/['#,b%]/g, '');
                bestName = `@${rootName}${quality}`;
                break; 
            }
        }

        if (!bestName) {
            bestName = `@chord_unrec_${unrecognizedCounter++}`;
        }
        
        if (finalDefinitions[bestName]) {
            nameCollisionCounter[bestName] = (nameCollisionCounter[bestName] || 1) + 1;
            bestName = `${bestName}_${nameCollisionCounter[bestName]}`;
        }

        finalDefinitions[bestName] = notes;
    }
    
    track.definitions = finalDefinitions;
    return track;
}

function normalizePatternsToBars(track: ParsedTrack): ParsedTrack {
    const newPatterns: Record<string, ParsedPattern> = {};
    const newPlaylist: PlaylistItem[] = [];
    const { grid, timeSig } = track.config;
    const slotsPerBar = grid * (4 / timeSig[1]) * timeSig[0];

    // Helper to get or create a REST pattern for this specific grid size
    const getRestPatternId = (): string => {
        const id = `REST_${grid}`;
        if (!newPatterns[id]) {
            newPatterns[id] = {
                id: id,
                duration: slotsPerBar,
                tracks: {}, 
                trackModifiers: {}
            };
        }
        return id;
    };

    for (const playlistItem of track.playlist) {
        if (playlistItem.type === 'command') { newPlaylist.push(playlistItem); continue; }
        
        const newLayers: Layer[] = [];

        // 1. Calculate Max Bars for this Row to ensure alignment
        let maxBars = 0;
        playlistItem.layers.forEach(layer => {
            let layerDuration = 0;
            layer.items.forEach(item => {
                const pat = track.patterns[item.id];
                if (pat) layerDuration += pat.duration;
            });
            maxBars = Math.max(maxBars, Math.ceil(layerDuration / slotsPerBar));
        });

        for (const layer of playlistItem.layers) {
            const newChain: ChainItem[] = [];
            let currentBarIndex = 0;
            
            for (const chainItem of layer.items) {
                const originalPattern = track.patterns[chainItem.id];
                if (!originalPattern) continue;
                
                const numBars = Math.ceil(originalPattern.duration / slotsPerBar);
                
                for(let i = 0; i < numBars; i++) {
                    let isContentBar = false;
                    const barStart = i * slotsPerBar;
                    const barEnd = (i + 1) * slotsPerBar;

                    // FIX: Check for OVERLAP, not just event starts.
                    // This ensures bars with only sustaining notes are considered "Active",
                    // preventing the Verticalizer from slicing the song prematurely.
                    for (const trackEvents of Object.values(originalPattern.tracks)) {
                        if (trackEvents.some(e => e.time < barEnd && (e.time + e.duration) > barStart)) {
                            isContentBar = true;
                            break;
                        }
                    }

                    if (!isContentBar) {
                        // Truly empty bar -> Insert REST
                        newChain.push({ id: getRestPatternId(), transposition: 0 });
                    } else {
                        // Content bar (Notes or Sustain) -> Create Pattern Slice
                        const newId = `${chainItem.id}_b${i}_${Math.random().toString(36).substr(2, 4)}`;
                        
                        const newPattern: ParsedPattern = { id: newId, duration: slotsPerBar, tracks: {}, trackModifiers: originalPattern.trackModifiers };
                        
                        for (const [trackName, events] of Object.entries(originalPattern.tracks)) {
                            const eventsInBar = events
                                .filter(e => e.time >= barStart && e.time < barEnd)
                                .map(e => ({ ...e, time: e.time - barStart }));
                            
                            if (eventsInBar.length > 0) {
                                newPattern.tracks[trackName] = eventsInBar;
                            }
                        }
                        newPatterns[newId] = newPattern;
                        newChain.push({ ...chainItem, id: newId });
                    }
                    currentBarIndex++;
                }
            }

            // PAD END OF LAYER IF SHORT (Aligns all layers to maxBars)
            while (currentBarIndex < maxBars) {
                newChain.push({ id: getRestPatternId(), transposition: 0 });
                currentBarIndex++;
            }

            newLayers.push({ items: newChain });
        }
        
        newPlaylist.push({ type: 'pattern', layers: newLayers });
    }

    track.patterns = newPatterns;
    track.playlist = newPlaylist;
    return track;
}

function degreeToSemitone(degree: number, intervals: number[]): number {
    const zeroBasedDegree = degree - 1;
    const octave = Math.floor(zeroBasedDegree / 7);
    const scaleIndex = (zeroBasedDegree % 7 + 7) % 7; 
    return intervals[scaleIndex] + (octave * 12);
}

function pruneUnusedInstruments(track: ParsedTrack): ParsedTrack {
    const usedTrackNames = new Set<string>();
    Object.values(track.patterns).forEach(pattern => {
        Object.keys(pattern.tracks).forEach(trackName => usedTrackNames.add(trackName));
    });
    const newInstruments: Record<string, any> = {};
    for (const instrumentName of Object.keys(track.instruments)) {
        if (usedTrackNames.has(instrumentName)) {
            newInstruments[instrumentName] = track.instruments[instrumentName];
        }
    }
    track.instruments = newInstruments;
    return track;
}

function renamePatterns(track: ParsedTrack): ParsedTrack {
    const renameMap = new Map<string, string>();
    const instrumentCounters: Record<string, number> = {};
    const newPatterns: Record<string, ParsedPattern> = {};
    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const layer of playlistItem.layers) {
            for (const chainItem of layer.items) {
                const oldId = chainItem.id;
                if (renameMap.has(oldId)) {
                    chainItem.id = renameMap.get(oldId)!;
                } else {
                    const pattern = track.patterns[oldId];
                    if (!pattern) continue;
                    
                    let baseName = 'pattern';
                    if (oldId.startsWith('REST')) baseName = 'Rest';
                    else baseName = Object.keys(pattern.tracks)[0]?.replace(/_L\d+$/, '') || 'pattern';
                    
                    instrumentCounters[baseName] = (instrumentCounters[baseName] || 0) + 1;
                    const newId = `${baseName}_${instrumentCounters[baseName]}`;
                    renameMap.set(oldId, newId);
                    chainItem.id = newId;
                }
            }
        }
    }
    for (const [oldId, newId] of renameMap.entries()) {
        const patternData = track.patterns[oldId];
        if (patternData) newPatterns[newId] = { ...patternData, id: newId };
    }
    track.patterns = newPatterns;
    return track;
}

function absoluteNoteToDegree(absolutePitch: string, targetScale: any): NoteDef {
    const pc = Note.pitchClass(absolutePitch);
    const octave = Note.octave(absolutePitch) ?? 4;
    const referenceOctave = 4; 

    const degreeIndex = targetScale.notes.indexOf(pc);

    if (degreeIndex > -1) {
        return { 
            degree: degreeIndex + 1, 
            octaveShift: octave - referenceOctave, 
            accidental: 0, 
            isNatural: false 
        };
    } else {
        const pitchMidi = Note.midi(`${pc}4`);
        if (pitchMidi === null) return { degree: 1, octaveShift: 0, accidental: 0, isNatural: false };

        let bestMatch = { degree: 1, accidental: 0 };
        let minDiff = 12;

        targetScale.notes.forEach((scalePc: string, idx: number) => {
            const scaleMidi = Note.midi(`${scalePc}4`)!;
            let diff = pitchMidi - scaleMidi;
            if (diff > 6) diff -= 12;
            if (diff < -6) diff += 12;

            if (Math.abs(diff) < Math.abs(minDiff)) {
                minDiff = diff;
                bestMatch = { degree: idx + 1, accidental: diff };
            }
        });

        return { 
            ...bestMatch, 
            octaveShift: octave - referenceOctave, 
            isNatural: false 
        };
    }
}

// --- DEDUPLICATION (Transpositional & Repeated) ---

function extractTransposedPatterns(track: ParsedTrack): ParsedTrack {
    const patternFingerprints = new Map<string, { id: string, anchorDegree: number }>();
    const canonicalPatterns = new Set<string>();
    
    const modeKey = track.config.scaleMode.charAt(0).toUpperCase() + track.config.scaleMode.slice(1);
    const scaleIntervals = MODES[modeKey] || MODES['Major'];

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const layer of playlistItem.layers) {
            for (const chainItem of layer.items) {
                const pattern = track.patterns[chainItem.id];
                if (!pattern) continue;
                
                const { hash, anchorDegree } = generateTranspositionalHash(pattern, scaleIntervals);
                if (!hash) continue; 
                
                if (patternFingerprints.has(hash)) {
                    const canonical = patternFingerprints.get(hash)!;
                    const transposeAmount = anchorDegree - canonical.anchorDegree;
                    
                    chainItem.id = canonical.id;
                    chainItem.transposition = (chainItem.transposition || 0) + transposeAmount;
                } else {
                    patternFingerprints.set(hash, { id: chainItem.id, anchorDegree: anchorDegree });
                    canonicalPatterns.add(chainItem.id);
                }
            }
        }
    }
    
    const newPatterns: Record<string, ParsedPattern> = {};
    for (const patId of canonicalPatterns) {
        if (track.patterns[patId]) newPatterns[patId] = track.patterns[patId];
    }
    track.patterns = newPatterns;
    return track;
}

function extractRepeatedPatterns(track: ParsedTrack, aggressiveness: 0 | 1 | 2 | 3): ParsedTrack {
    const patternHashes = new Map<string, string>();
    const canonicalPatterns = new Set<string>();
    const sustainCounts = new Map<string, number>();

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const layer of playlistItem.layers) {
            for (const chainItem of layer.items) {
                const pattern = track.patterns[chainItem.id];
                if (!pattern) continue;

                const hash = generateFuzzyPatternHash(pattern, aggressiveness, track.config);
                
                if (patternHashes.has(hash)) {
                    const canonicalId = patternHashes.get(hash)!;
                    
                    let currentSustains = 0;
                    for (const trackName in pattern.tracks) {
                        const events = pattern.tracks[trackName];
                        const totalDurationInSlots = events.reduce((sum, event) => sum + event.duration, 0);
                        currentSustains += Math.round(totalDurationInSlots) - events.length;
                    }

                    if (currentSustains > (sustainCounts.get(canonicalId) || 0)) {
                        sustainCounts.set(canonicalId, currentSustains);
                        const canonicalPattern = track.patterns[canonicalId];
                        if (canonicalPattern) canonicalPattern.tracks = pattern.tracks; 
                    }
                    chainItem.id = canonicalId;
                } else {
                    patternHashes.set(hash, chainItem.id);
                    canonicalPatterns.add(chainItem.id);

                    let currentSustains = 0;
                    for (const trackName in pattern.tracks) {
                        const events = pattern.tracks[trackName];
                        const totalDurationInSlots = events.reduce((sum, event) => sum + event.duration, 0);
                        currentSustains += Math.round(totalDurationInSlots) - events.length;
                    }
                    sustainCounts.set(chainItem.id, currentSustains);
                }
            }
        }
    }

    const newPatterns: Record<string, ParsedPattern> = {};
    for (const patId of canonicalPatterns) {
        if (track.patterns[patId]) newPatterns[patId] = track.patterns[patId];
    }
    track.patterns = newPatterns;
    return track;
}

function generateFuzzyPatternHash(pattern: ParsedPattern, aggressiveness: 0 | 1 | 2 | 3, config: ParsedTrack['config']): string {
    // *** FIX: Include Duration in Hash ***
    let hashString = `DUR:${pattern.duration}||`; 
    
    const sortedTrackNames = Object.keys(pattern.tracks).sort();
    for (const trackName of sortedTrackNames) {
        hashString += `${trackName}:`;
        const events = [...pattern.tracks[trackName]].sort((a, b) => a.time - b.time);
        switch (aggressiveness) {
            case 0: 
                for (const event of events) {
                    const noteStr = event.notes.map(n => `${n.degree},${n.octaveShift},${n.accidental}`).sort().join(' ');
                    hashString += `|${event.time.toFixed(3)}:${event.duration.toFixed(3)}:${noteStr}`;
                }
                break;
            case 1: 
                const slots = new Set<number>();
                for (const event of events) slots.add(Math.round(event.time));
                const noteSequence = events.map(e => getNoteSignature(e.notes)).join(',');
                hashString += Array.from(slots).sort((a,b)=>a-b).join(',') + `_` + noteSequence;
                break;
            case 2: 
                const { grid, timeSig } = config;
                const slotsPerBeat = grid * (4 / timeSig[1]);
                const beats: string[] = [];
                for(let i = 0; i < timeSig[0]; i++) {
                    const beatStart = i * slotsPerBeat;
                    const beatEnd = (i + 1) * slotsPerBeat;
                    const eventsInBeat = events.filter(e => e.time >= beatStart && e.time < beatEnd);
                    if (eventsInBeat.length === 0) continue;
                    const firstNotePos = Math.round((eventsInBeat[0].time - beatStart) / slotsPerBeat * 4);
                    beats.push(`${eventsInBeat.length}n@${firstNotePos}`);
                }
                hashString += beats.join('_');
                break;
            case 3: 
                hashString += events.map(e => getNoteSignature(e.notes)).join(',');
                break;
        }
        hashString += '//';
    }
    return hashString;
}

function generateTranspositionalHash(pattern: ParsedPattern, scaleIntervals: number[]): { hash: string, anchorDegree: number } {
    let anchorInfo: { note: NoteDef, time: number } | null = null;
    for (const trackName of Object.keys(pattern.tracks)) {
        for (const event of pattern.tracks[trackName]) {
            if (event.notes && event.notes.length > 0) {
                if (!anchorInfo || event.time < anchorInfo.time) {
                    anchorInfo = { note: event.notes[0], time: event.time };
                }
            }
        }
    }
    if (!anchorInfo) return { hash: '', anchorDegree: 0 };
    const anchorNote = anchorInfo.note;
    const anchorDegree = (anchorNote.degree - 1) + (anchorNote.octaveShift * 7);
    const anchorSemitone = degreeToSemitone(anchorNote.degree, scaleIntervals) + (anchorNote.octaveShift * 12) + anchorNote.accidental;

    // *** FIX: Include Duration in Hash ***
    let hashString = `DUR:${pattern.duration}||`; 
    
    const sortedTrackNames = Object.keys(pattern.tracks).sort();
    for (const trackName of sortedTrackNames) {
        hashString += `${trackName}:`;
        const events = [...pattern.tracks[trackName]].sort((a, b) => a.time - b.time);
        for (const event of events) {
            const noteIntervals = event.notes
                .map(n => {
                    const noteSemitone = degreeToSemitone(n.degree, scaleIntervals) + (n.octaveShift * 12) + n.accidental;
                    return noteSemitone - anchorSemitone;
                })
                .sort((a, b) => a - b)
                .join(',');
            hashString += `|${event.time.toFixed(3)}:${event.duration.toFixed(3)}:${noteIntervals}`;
        }
        hashString += '//';
    }
    return { hash: hashString, anchorDegree: anchorDegree };
}

export function rescaleBPM(source: string, factor: number, mockQualities: PlayerQualities = {}): string {
    if (factor <= 0) return source;

    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);

    // 1. Rescale Config
    parsedTrack.config.bpm = Math.round(parsedTrack.config.bpm * factor);

    // 2. Rescale Patterns
    for (const pattern of Object.values(parsedTrack.patterns)) {
        pattern.duration *= factor;
        for (const trackName in pattern.tracks) {
            for (const event of pattern.tracks[trackName]) {
                event.time *= factor;
                event.duration *= factor;
            }
        }
    }

    // 3. Serialize
    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

export function refactorScale(
    source: string, 
    newScaleRoot: string, 
    newScaleMode: string, 
    mockQualities: PlayerQualities = {}
): string {
    const parser = new LigatureParser();
    const parsedTrack = parser.parse(source, mockQualities);

    const originalScaleRoot = parsedTrack.config.scaleRoot;
    const originalScaleMode = parsedTrack.config.scaleMode;

    const newScale = Scale.get(`${newScaleRoot} ${newScaleMode.toLowerCase()}`);
    if (newScale.empty) {
        throw new Error(`Invalid target scale: ${newScaleRoot} ${newScaleMode}`);
    }

    const allNoteDefs: NoteDef[] = [];
    Object.values(parsedTrack.patterns).forEach(p => Object.values(p.tracks).forEach(t => t.forEach(e => allNoteDefs.push(...e.notes))));
    Object.values(parsedTrack.definitions).forEach(d => allNoteDefs.push(...d));

    for (const note of allNoteDefs) {
        const absolutePitch = resolveNote(
            note.degree, originalScaleRoot, originalScaleMode, 
            note.octaveShift, note.accidental, note.isNatural
        );
        const newNoteDef = absoluteNoteToDegree(absolutePitch, newScale);
        
        Object.assign(note, newNoteDef);
    }

    parsedTrack.config.scaleRoot = newScaleRoot;
    parsedTrack.config.scaleMode = newScaleMode.charAt(0).toUpperCase() + newScaleMode.slice(1).toLowerCase();

    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

function verticalizePlaylist(track: ParsedTrack): ParsedTrack {
    const newPlaylist: PlaylistItem[] = [];
    
    for (const item of track.playlist) {
        if (item.type === 'command') { newPlaylist.push(item); continue; }

        const layers = item.layers;
        if (layers.length === 0) continue;

        const totalBars = layers[0].items.length;
        if (totalBars === 0) continue;

        const getTextureSignature = (barIndex: number): string => {
            return layers.map(layer => {
                const item = layer.items[barIndex];
                return (item && !item.id.startsWith('REST')) ? '1' : '0';
            }).join('');
        };

        let currentBlockStart = 0;
        let currentTexture = getTextureSignature(0);

        // MINIMUM SECTION LENGTH (Phrasing)
        // We force sections to be at least 4 bars long, unless the song ends.
        // This keeps "fills" in bar 4 attached to the main phrase.
        const MIN_PHRASE_LENGTH = 4;

        for (let i = 1; i < totalBars; i++) {
            const newTexture = getTextureSignature(i);
            const currentLength = i - currentBlockStart;
            
            if (newTexture !== currentTexture) {
                // Only split if we've met the minimum length, OR if it's a "Silence" break (texture 0000)
                const isSilence = newTexture.indexOf('1') === -1;
                
                if (currentLength >= MIN_PHRASE_LENGTH || isSilence) {
                    newPlaylist.push(createSlice(layers, currentBlockStart, i));
                    currentBlockStart = i;
                    currentTexture = newTexture;
                }
                // Else: Ignore the texture change (e.g., drum fill entering at bar 4) 
                // and extend the current block.
            }
        }
        
        newPlaylist.push(createSlice(layers, currentBlockStart, totalBars));
    }

    track.playlist = newPlaylist;
    return track;
}

function pruneSilentLayers(track: ParsedTrack): ParsedTrack {
    for (const item of track.playlist) {
        if (item.type !== 'pattern') continue;
        item.layers = item.layers.filter(layer => {
            const isSilent = layer.items.every(chainItem => chainItem.id.startsWith('REST'));
            return !isSilent;
        });
    }
    return track;
}

function createSlice(sourceLayers: Layer[], start: number, end: number): PatternPlaylistItem {
    const newLayers: Layer[] = [];
    
    for (const layer of sourceLayers) {
        // Extract the sub-chain for this section
        // We accept RESTs here because they maintain the grid alignment
        const sliceItems = layer.items.slice(start, end);
        newLayers.push({ items: sliceItems });
    }

    return { type: 'pattern', layers: newLayers };
}

function optimizeChains(track: ParsedTrack): ParsedTrack {
    const newPatterns = { ...track.patterns };

    for (const item of track.playlist) {
        if (item.type !== 'pattern') continue;

        item.layers.forEach(layer => {
            if (layer.items.length <= 1) return;

            // Strategy A: Reduce Repeats
            const firstId = layer.items[0].id;
            const firstTrans = layer.items[0].transposition;
            const allSame = layer.items.every(it => it.id === firstId && it.transposition === firstTrans);
            
            if (allSame) {
                layer.items = [layer.items[0]];
                return;
            }

            // Strategy B: Merge Sequential Segments
            const cleanChain = layer.items.every(it => (!it.volume || it.volume === 0));
            const isRestChain = layer.items.every(it => it.id.startsWith('REST'));

            if (cleanChain && !isRestChain) {
                
                // Smart Naming: Find first non-REST pattern to name this segment
                const firstRealPattern = layer.items.find(it => !it.id.startsWith('REST'));
                const baseName = firstRealPattern ? firstRealPattern.id : layer.items[0].id;
                
                // Unique ID for the merged pattern
                const combinedId = `${baseName}_seq_${Math.random().toString(36).substr(2, 4)}`; 
                
                const combinedPattern: ParsedPattern = {
                    id: combinedId,
                    duration: 0,
                    tracks: {},
                    trackModifiers: {}
                };

                let currentTimeOffset = 0;
                
                for (const chainItem of layer.items) {
                    const p = track.patterns[chainItem.id];
                    if (!p) continue;

                    combinedPattern.duration += p.duration;

                    for (const [trackName, events] of Object.entries(p.tracks)) {
                        if (!combinedPattern.tracks[trackName]) combinedPattern.tracks[trackName] = [];
                        
                        const shiftedEvents = events.map(e => ({
                            ...e,
                            time: e.time + currentTimeOffset,
                            notes: e.notes.map(n => ({
                                ...n,
                                degree: n.degree + (chainItem.transposition || 0)
                            }))
                        }));
                        combinedPattern.tracks[trackName].push(...shiftedEvents);
                    }
                    if (p.trackModifiers) {
                        for(const [t, m] of Object.entries(p.trackModifiers)) {
                            combinedPattern.trackModifiers[t] = m;
                        }
                    }
                    currentTimeOffset += p.duration;
                }

                newPatterns[combinedId] = combinedPattern;
                
                // Replace the chain with the single new pattern
                layer.items = [{ id: combinedId, transposition: 0 }];
            }
        });
    }

    track.patterns = newPatterns;
    return track;
}

