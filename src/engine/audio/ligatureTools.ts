// src/engine/audio/ligatureTools.ts
import { Note, Scale } from 'tonal';
import { LigatureParser } from './parser';
import { serializeParsedTrack } from './serializer';
import { formatLigatureSource } from './formatter';
import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, PatternPlaylistItem } from './models';
import { PlayerQualities } from '../models';
// --- NEW IMPORT --- Using your official scale definitions for accuracy
import { MODES, resolveNote  } from './scales';

interface LigatureToolOptions {
    foldLanes?: boolean;
    extractPatterns?: boolean;
    foldAggressiveness?: 'low' | 'high';
    patternSimilarity?: 'exact' | 'rhythmic' | 'transpositional';
    // NEW: A numeric level for fuzzy matching
    patternAggressiveness?: 0 | 1 | 2 | 3;
}

// --- MAIN ROUTER FUNCTION ---
export function processLigature(
    source: string, 
    options: LigatureToolOptions,
    mockQualities: PlayerQualities = {}
): string {
    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);
    parsedTrack = normalizePatternsToBars(parsedTrack);
    if (options.foldLanes) {
        parsedTrack = foldInstrumentLanes(parsedTrack);
    }
    if (options.extractPatterns) {
        if (options.patternSimilarity === 'transpositional') {
            parsedTrack = extractTransposedPatterns(parsedTrack);
        } else {
            // Pass the numeric aggressiveness level to the pattern extractor
            parsedTrack = extractRepeatedPatterns(parsedTrack, options.patternAggressiveness || 0);
        }
    }
    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

// --- HELPER to create a unique signature for a set of notes ---
function getNoteSignature(notes: NoteDef[]): string {
    return notes
      .map(n => `${n.degree},${n.octaveShift},${n.accidental},${n.isNatural}`)
      .sort()
      .join(';');
}

// --- FOLD LANES (Now with intelligent de-duplication) ---
function foldInstrumentLanes(track: ParsedTrack): ParsedTrack {
    const trackGroups: Record<string, string[]> = {};
    Object.keys(track.instruments).forEach(trackName => {
        const baseName = trackName.replace(/_L\d+$/, '');
        if (!trackGroups[baseName]) trackGroups[baseName] = [];
        trackGroups[baseName].push(trackName);
    });

    // *** FIX 1: Create a reverse-map of existing chord definitions ***
    const definitionsMap = new Map<string, string>();
    if (track.definitions) {
        for (const [alias, notes] of Object.entries(track.definitions)) {
            definitionsMap.set(getNoteSignature(notes), alias);
        }
    }
    let chordCounter = Object.keys(track.definitions || {}).length + 1;

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const baseName in trackGroups) {
            const lanes = trackGroups[baseName];
            if (lanes.length <= 1) continue;
            // ... (rest of the setup is the same)
            const baseLaneName = lanes.find(l => !l.match(/_L\d+$/)) || lanes[0];
            const otherLaneNames = lanes.filter(l => l !== baseLaneName);
            const basePat = playlistItem.patterns.find(p => track.patterns[p.id]?.tracks[baseLaneName]);
            if (!basePat) continue;
            const baseEvents = track.patterns[basePat.id].tracks[baseLaneName];

            for (const otherLane of otherLaneNames) {
                const otherPat = playlistItem.patterns.find(p => track.patterns[p.id]?.tracks[otherLane]);
                if (!otherPat) continue;
                const otherEvents = track.patterns[otherPat.id].tracks[otherLane];
                for (const otherEvent of otherEvents) {
                    const existingEvent = baseEvents.find(e => Math.abs(e.time - otherEvent.time) < 0.01);
                    if (existingEvent) {
                        const combinedNotes = [...existingEvent.notes, ...otherEvent.notes];
                        const uniqueNoteDefs: NoteDef[] = [];
                        const noteSignatures = new Set<string>();
                        for (const note of combinedNotes) {
                            const sig = `${note.degree},${note.octaveShift},${note.accidental}`;
                            if (!noteSignatures.has(sig)) { uniqueNoteDefs.push(note); noteSignatures.add(sig); }
                        }
                        uniqueNoteDefs.sort((a, b) => a.degree - b.degree || a.octaveShift - b.octaveShift);
                        existingEvent.notes = uniqueNoteDefs;

                        // *** FIX 1 (cont.): Only create a definition if it's a new shape ***
                        if (uniqueNoteDefs.length > 1) {
                            const signature = getNoteSignature(uniqueNoteDefs);
                            if (!definitionsMap.has(signature)) {
                                if (!track.definitions) track.definitions = {};
                                const newAlias = `@chord${chordCounter++}`;
                                track.definitions[newAlias] = uniqueNoteDefs;
                                definitionsMap.set(signature, newAlias);
                            }
                        }
                    } else {
                        baseEvents.push(otherEvent);
                    }
                }
                playlistItem.patterns = playlistItem.patterns.filter(p => p.id !== otherPat.id);
                delete track.patterns[otherPat.id];
            }
            baseEvents.sort((a, b) => a.time - b.time);
        }
    }
    return track;
}

// --- TRANSPOSITIONAL DEDUPLICATION (Now with accurate semitone logic) ---
function extractTransposedPatterns(track: ParsedTrack): ParsedTrack {
    const patternFingerprints = new Map<string, { id: string, anchorDegree: number }>();
    const canonicalPatterns = new Set<string>();
    
    // *** FIX 2: Use the official scale definitions for accurate semitone calculation ***
    const modeKey = track.config.scaleMode.charAt(0).toUpperCase() + track.config.scaleMode.slice(1);
    const scaleIntervals = MODES[modeKey] || MODES['Major'];

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const pat of playlistItem.patterns) {
            const pattern = track.patterns[pat.id];
            if (!pattern) continue;
            const { hash, anchorDegree } = generateTranspositionalHash(pattern, scaleIntervals);
            if (!hash) continue; 
            if (patternFingerprints.has(hash)) {
                const canonical = patternFingerprints.get(hash)!;
                const transposeAmount = anchorDegree - canonical.anchorDegree;
                pat.id = canonical.id;
                pat.transposition = (pat.transposition || 0) + transposeAmount;
            } else {
                patternFingerprints.set(hash, { id: pat.id, anchorDegree: anchorDegree });
                canonicalPatterns.add(pat.id);
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

// *** FIX 2 (cont.): Helper to convert Ligature degree to absolute semitone ***
function degreeToSemitone(degree: number, intervals: number[]): number {
    const zeroBasedDegree = degree - 1;
    const octave = Math.floor(zeroBasedDegree / 7);
    const scaleIndex = (zeroBasedDegree % 7 + 7) % 7; // safe modulo for negative degrees
    return intervals[scaleIndex] + (octave * 12);
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

    let hashString = '';
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


// --- NORMALIZATION AND NON-TRANSPOSED DEDUPLICATION (No changes needed here) ---
function normalizePatternsToBars(track: ParsedTrack): ParsedTrack {
    const newPatterns: Record<string, ParsedPattern> = {};
    const newPlaylist: PlaylistItem[] = [];
    const { grid, timeSig } = track.config;
    const slotsPerBar = grid * (4 / timeSig[1]) * timeSig[0];
    for (const playlistItem of track.playlist) {
        if (playlistItem.type === 'command') { newPlaylist.push(playlistItem); continue; }
        let maxBarsInRow = 0;
        for (const pat of playlistItem.patterns) {
            const pattern = track.patterns[pat.id];
            if (pattern) maxBarsInRow = Math.max(maxBarsInRow, Math.ceil(pattern.duration / slotsPerBar));
        }
        for (let i = 0; i < maxBarsInRow; i++) {
            const newPlaylistItem: PatternPlaylistItem = { type: 'pattern', patterns: [] };
            for (const pat of playlistItem.patterns) {
                const originalPattern = track.patterns[pat.id];
                if (!originalPattern) continue;
                const newPatternId = `${pat.id}_b${i}`;
                const newPattern: ParsedPattern = { id: newPatternId, duration: slotsPerBar, tracks: {}, trackModifiers: originalPattern.trackModifiers };
                for (const [trackName, events] of Object.entries(originalPattern.tracks)) {
                    const barStart = i * slotsPerBar;
                    const barEnd = (i + 1) * slotsPerBar;
                    const eventsInBar = events.filter(e => e.time >= barStart && e.time < barEnd).map(e => ({ ...e, time: e.time - barStart }));
                    if (eventsInBar.length > 0) newPattern.tracks[trackName] = eventsInBar;
                }
                if (Object.keys(newPattern.tracks).length > 0) {
                    newPatterns[newPatternId] = newPattern;
                    newPlaylistItem.patterns.push({ ...pat, id: newPatternId });
                }
            }
            if (newPlaylistItem.patterns.length > 0) newPlaylist.push(newPlaylistItem);
        }
    }
    track.patterns = newPatterns;
    track.playlist = newPlaylist;
    return track;
}
function extractRepeatedPatterns(track: ParsedTrack, aggressiveness: 0 | 1 | 2 | 3): ParsedTrack {
    const patternHashes = new Map<string, string>();
    const canonicalPatterns = new Set<string>();
    const sustainCounts = new Map<string, number>();

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const pat of playlistItem.patterns) {
            const pattern = track.patterns[pat.id];
            if (!pattern) continue;

            const hash = generateFuzzyPatternHash(pattern, aggressiveness, track.config);
            
            if (patternHashes.has(hash)) {
                const canonicalId = patternHashes.get(hash)!;
                
                // *** FIX IS HERE: Calculate sustain count directly ***
                let currentSustains = 0;
                for (const trackName in pattern.tracks) {
                    const events = pattern.tracks[trackName];
                    const totalDurationInSlots = events.reduce((sum, event) => sum + event.duration, 0);
                    currentSustains += Math.round(totalDurationInSlots) - events.length;
                }

                if (currentSustains > (sustainCounts.get(canonicalId) || 0)) {
                    sustainCounts.set(canonicalId, currentSustains);
                    const canonicalPattern = track.patterns[canonicalId];
                    if (canonicalPattern) {
                        canonicalPattern.tracks = pattern.tracks; 
                    }
                }
                pat.id = canonicalId; // Point to the canonical pattern
            } else {
                patternHashes.set(hash, pat.id);
                canonicalPatterns.add(pat.id);

                let currentSustains = 0;
                for (const trackName in pattern.tracks) {
                    const events = pattern.tracks[trackName];
                    const totalDurationInSlots = events.reduce((sum, event) => sum + event.duration, 0);
                    currentSustains += Math.round(totalDurationInSlots) - events.length;
                }
                sustainCounts.set(pat.id, currentSustains);
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
    let hashString = '';
    const sortedTrackNames = Object.keys(pattern.tracks).sort();
    
    for (const trackName of sortedTrackNames) {
        hashString += `${trackName}:`;
        const events = [...pattern.tracks[trackName]].sort((a, b) => a.time - b.time);

        switch (aggressiveness) {
            // Level 0: Exact Match
            case 0:
                for (const event of events) {
                    const noteStr = event.notes.map(n => `${n.degree},${n.octaveShift},${n.accidental}`).sort().join(';');
                    hashString += `|${event.time.toFixed(3)}:${event.duration.toFixed(3)}:${noteStr}`;
                }
                break;

            // Level 1: Quantize to Grid (ignore sustain vs. rest)
            case 1:
                const slots = new Set<number>();
                for (const event of events) {
                    slots.add(Math.round(event.time));
                }
                const noteSequence = events.map(e => getNoteSignature(e.notes)).join(',');
                hashString += Array.from(slots).sort((a,b)=>a-b).join(',') + `_` + noteSequence;
                break;
            
            // Level 2: Beat Fingerprint (note count & placement)
            case 2:
                const { grid, timeSig } = config;
                const slotsPerBeat = grid * (4 / timeSig[1]);
                const beats: string[] = [];
                for(let i = 0; i < timeSig[0]; i++) {
                    const beatStart = i * slotsPerBeat;
                    const beatEnd = (i + 1) * slotsPerBeat;
                    const eventsInBeat = events.filter(e => e.time >= beatStart && e.time < beatEnd);
                    if (eventsInBeat.length === 0) continue;
                    
                    const firstNotePos = Math.round((eventsInBeat[0].time - beatStart) / slotsPerBeat * 4); // Position as 0,1,2,3
                    beats.push(`${eventsInBeat.length}n@${firstNotePos}`);
                }
                hashString += beats.join('_');
                break;

            // Level 3: Melodic Only (ignore all rhythm)
            case 3:
                hashString += events.map(e => getNoteSignature(e.notes)).join(',');
                break;
        }
        hashString += '//';
    }
    return hashString;
}


function generatePatternHash(pattern: ParsedPattern, similarity: 'exact' | 'rhythmic'): string {
    let hashString = '';
    const sortedTrackNames = Object.keys(pattern.tracks).sort();
    for (const trackName of sortedTrackNames) {
        hashString += `${trackName}:`;
        const events = pattern.tracks[trackName];
        events.sort((a, b) => a.time - b.time);
        for (const event of events) {
            if (similarity === 'exact') {
                const noteStr = event.notes.map(n => `${n.degree},${n.octaveShift},${n.accidental}`).sort().join(';');
                hashString += `|${event.time.toFixed(2)}:${event.duration.toFixed(2)}:${noteStr}`;
            } else {
                hashString += `|${event.time.toFixed(2)}:${event.duration.toFixed(2)}`;
            }
        }
        hashString += '//';
    }
    return hashString;
}

export function rescaleBPM(source: string, factor: number, mockQualities: PlayerQualities = {}): string {
    if (factor <= 0) return source; // Avoid invalid scaling

    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);

    // 1. Rescale the BPM in the config
    parsedTrack.config.bpm = Math.round(parsedTrack.config.bpm * factor);

    // 2. Rescale all timings in every pattern
    for (const patternId in parsedTrack.patterns) {
        const pattern = parsedTrack.patterns[patternId];
        
        // Scale the total duration of the pattern
        pattern.duration *= factor;

        // Scale the time and duration of every single event
        for (const trackName in pattern.tracks) {
            pattern.tracks[trackName].forEach(event => {
                event.time *= factor;
                event.duration *= factor;
            });
        }
    }

    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

export function polishLigatureSource(source: string, mockQualities: PlayerQualities = {}): string {
    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);

    // Run the cleanup tasks in sequence
    parsedTrack = cleanupDefinitions(parsedTrack);
    parsedTrack = pruneUnusedInstruments(parsedTrack);
    parsedTrack = renamePatterns(parsedTrack);

    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}

// --- NEW, EXPANDED DICTIONARY ---
const INTERVAL_TO_CHORD_NAME: Record<string, string> = {
    // Dyads (2-note chords)
    '2': 'M2', '3': 'm3', '4': 'M3', '5': 'P4', '6': 'tri', '7': 'P5',
    '8': 'm6', '9': 'M6', '10': 'm7', '11': 'M7', '12': 'oct', '0': 'uni',
    // Triads (3-note chords)
    '4,7': 'maj', '3,7': 'min', '3,6': 'dim', '4,8': 'aug',
    '5,7': 'sus4', '2,7': 'sus2',
    // Sevenths (4-note chords)
    '4,7,10': '7', '3,7,10': 'm7', '4,7,11': 'maj7',
    '3,6,9': 'dim7', '3,6,10': 'm7b5' // half-diminished
};

/**
 * A new, comprehensive function that first deduplicates and then renames chord definitions,
 * now with inversion detection.
 */
function cleanupDefinitions(track: ParsedTrack): ParsedTrack {
    if (!track.definitions || Object.keys(track.definitions).length === 0) {
        return track;
    }

    const modeKey = track.config.scaleMode.charAt(0).toUpperCase() + track.config.scaleMode.slice(1);
    const scaleIntervals = MODES[modeKey] || MODES['Major'];
    
    // --- PASS 1: Deduplicate definitions to find unique chord shapes ---
    const canonicalDefinitions = new Map<string, NoteDef[]>(); // Map<signature, notes>
    for (const notes of Object.values(track.definitions)) {
        const signature = getNoteSignature(notes);
        if (!canonicalDefinitions.has(signature)) {
            canonicalDefinitions.set(signature, notes);
        }
    }

    // --- PASS 2: Rename the unique shapes with inversion detection ---
    const finalDefinitions: Record<string, NoteDef[]> = {};
    const nameCollisionCounter: Record<string, number> = {};
    let unrecognizedCounter = 1;

    for (const notes of canonicalDefinitions.values()) {
        let bestName: string | null = null;

        // Inversion Analysis Loop: Try each note as a potential root
        for (const potentialRoot of notes) {
            const rootSemitone = degreeToSemitone(potentialRoot.degree, scaleIntervals) + (potentialRoot.octaveShift * 12) + potentialRoot.accidental;

            const intervals = notes
                .filter(n => n !== potentialRoot) // Exclude the root itself
                .map(n => {
                    const noteSemitone = degreeToSemitone(n.degree, scaleIntervals) + (n.octaveShift * 12) + n.accidental;
                    // Normalize interval to be within an octave and positive
                    return ((noteSemitone - rootSemitone) % 12 + 12) % 12;
                })
                .sort((a, b) => a - b);
            
            // Unison (e.g., [5,5]) would have no intervals. Add a '0' to represent it.
            if (notes.length > 1 && intervals.length === 0) {
                 intervals.push(0);
            }
            
            const intervalSignature = intervals.join(',');
            const quality = INTERVAL_TO_CHORD_NAME[intervalSignature];

            if (quality) {
                const rootName = `${potentialRoot.degree}`.replace(/['#,b%]/g, '');
                bestName = `@${rootName}${quality}`;
                break; // Found a match, stop trying other inversions
            }
        }

        // If no match was found after trying all inversions, assign a fallback name
        if (!bestName) {
            bestName = `@chord_unrec_${unrecognizedCounter++}`;
        }
        
        // Handle potential naming collisions (e.g., two different chords are named @1maj)
        if (finalDefinitions[bestName]) {
            nameCollisionCounter[bestName] = (nameCollisionCounter[bestName] || 1) + 1;
            bestName = `${bestName}_${nameCollisionCounter[bestName]}`;
        }

        finalDefinitions[bestName] = notes;
    }
    
    track.definitions = finalDefinitions;
    return track;
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
        for (const pat of playlistItem.patterns) {
            const oldId = pat.id;
            if (renameMap.has(oldId)) {
                pat.id = renameMap.get(oldId)!;
            } else {
                const pattern = track.patterns[oldId];
                if (!pattern) continue;
                const baseName = Object.keys(pattern.tracks)[0]?.replace(/_L\d+$/, '') || 'pattern';
                instrumentCounters[baseName] = (instrumentCounters[baseName] || 0) + 1;
                const newId = `${baseName}_${instrumentCounters[baseName]}`;
                renameMap.set(oldId, newId);
                pat.id = newId;
            }
        }
    }
    for (const [oldId, newId] of renameMap.entries()) {
        const patternData = track.patterns[oldId];
        if (patternData) {
            newPatterns[newId] = { ...patternData, id: newId };
        }
    }
    track.patterns = newPatterns;
    return track;
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

/**
 * Helper function to convert an absolute pitch (e.g., "C#4") to a Ligature NoteDef
 * relative to a given target scale. (REWRITTEN)
 */
function absoluteNoteToDegree(absolutePitch: string, targetScale: any): NoteDef {
    const pc = Note.pitchClass(absolutePitch);
    const octave = Note.octave(absolutePitch) ?? 4;
    const referenceOctave = 4;

    const degreeIndex = targetScale.notes.indexOf(pc);

    if (degreeIndex > -1) {
        // The note is directly in the scale.
        const degree = degreeIndex + 1;
        const octaveShift = octave - referenceOctave;
        return { degree, octaveShift, accidental: 0, isNatural: false };
    } else {
        // The note is an accidental. Find the closest note in the scale.
        let minInterval = 12;
        let bestMatch = { degree: 1, accidental: 0 };
        const pitchMidi = Note.midi(pc + "4")!;

        targetScale.notes.forEach((scaleNotePc: string, index: number) => {
            const scaleNoteMidi = Note.midi(scaleNotePc + "4")!;
            let interval = pitchMidi - scaleNoteMidi;

            // Normalize to the smallest interval (-6 to +6)
            if (interval > 6) interval -= 12;
            if (interval < -6) interval += 12;

            if (Math.abs(interval) < Math.abs(minInterval)) {
                minInterval = interval;
                bestMatch = { degree: index + 1, accidental: interval };
            }
        });
        
        const octaveShift = octave - referenceOctave;
        return { ...bestMatch, octaveShift, isNatural: false };
    }
}