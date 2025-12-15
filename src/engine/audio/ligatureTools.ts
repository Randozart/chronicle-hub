// src/engine/audio/ligatureTools.ts

import { LigatureParser } from './parser';
import { serializeParsedTrack } from './serializer';
import { formatLigatureSource } from './formatter';
import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, PatternPlaylistItem } from './models';
import { PlayerQualities } from '../models';

interface LigatureToolOptions {
    foldLanes?: boolean;
    extractPatterns?: boolean;
    foldAggressiveness?: 'low' | 'high';
    patternSimilarity?: 'exact' | 'rhythmic';
}

/**
 * The main entry point for all Ligature post-processing tools.
 * It orchestrates the parsing, manipulation, and serialization steps.
 */
export function processLigature(
    source: string, 
    options: LigatureToolOptions,
    mockQualities: PlayerQualities = {}
): string {
    const parser = new LigatureParser();
    let parsedTrack = parser.parse(source, mockQualities);

    // STEP 1: Always normalize to single-bar patterns. This simplifies all subsequent tools.
    parsedTrack = normalizePatternsToBars(parsedTrack);

    // STEP 2: Fold instrument lanes if requested.
    if (options.foldLanes) {
        parsedTrack = foldInstrumentLanes(parsedTrack, options.foldAggressiveness || 'high');
    }

    // STEP 3: Extract (deduplicate) repeated patterns if requested.
    if (options.extractPatterns) {
        parsedTrack = extractRepeatedPatterns(parsedTrack, options.patternSimilarity || 'exact');
    }

    // Final Step: Serialize back to a string and format it.
    const finalSource = serializeParsedTrack(parsedTrack);
    return formatLigatureSource(finalSource);
}


function normalizePatternsToBars(track: ParsedTrack): ParsedTrack {
    const newPatterns: Record<string, ParsedPattern> = {};
    const newPlaylist: PlaylistItem[] = [];
    const { grid, timeSig } = track.config;
    const slotsPerBar = grid * (4 / timeSig[1]) * timeSig[0];

    for (const playlistItem of track.playlist) {
        if (playlistItem.type === 'command') {
            newPlaylist.push(playlistItem);
            continue;
        }
        let maxBarsInRow = 0;
        for (const pat of playlistItem.patterns) {
            const pattern = track.patterns[pat.id];
            if (pattern) {
                const bars = Math.ceil(pattern.duration / slotsPerBar);
                maxBarsInRow = Math.max(maxBarsInRow, bars);
            }
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

function foldInstrumentLanes(track: ParsedTrack, aggressiveness: 'low' | 'high'): ParsedTrack {
    const trackGroups: Record<string, string[]> = {};
    Object.keys(track.instruments).forEach(trackName => {
        const baseName = trackName.replace(/_L\d+$/, '');
        if (!trackGroups[baseName]) trackGroups[baseName] = [];
        trackGroups[baseName].push(trackName);
    });

    let chordCounter = 1;

    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;

        for (const baseName in trackGroups) {
            const lanes = trackGroups[baseName];
            if (lanes.length <= 1) continue;
            const baseLaneName = lanes.find(l => !l.match(/_L\d+$/)) || lanes[0];
            const otherLaneNames = lanes.filter(l => l !== baseLaneName);
            const basePat = playlistItem.patterns.find(p => track.patterns[p.id]?.tracks[baseLaneName]);
            if (!basePat) continue;
            const basePattern = track.patterns[basePat.id];
            const baseEvents = basePattern.tracks[baseLaneName];

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
                            if (!noteSignatures.has(sig)) {
                                uniqueNoteDefs.push(note);
                                noteSignatures.add(sig);
                            }
                        }
                        
                        // *** FIX ***: Sort notes to create a canonical representation for chords.
                        uniqueNoteDefs.sort((a, b) => a.degree - b.degree || a.octaveShift - b.octaveShift);
                        existingEvent.notes = uniqueNoteDefs;

                        if (uniqueNoteDefs.length > 1) {
                            if (!track.definitions) track.definitions = {};
                            const defName = `@chord${chordCounter++}`;
                            track.definitions[defName] = uniqueNoteDefs;
                        }
                    } else {
                        const interruptingSustain = baseEvents.find(e => e.time < otherEvent.time && (e.time + e.duration) > otherEvent.time);
                        if (interruptingSustain && aggressiveness === 'high') {
                            interruptingSustain.duration = otherEvent.time - interruptingSustain.time;
                        }
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

function extractRepeatedPatterns(track: ParsedTrack, similarity: 'exact' | 'rhythmic'): ParsedTrack {
    const patternHashes = new Map<string, string>();
    const canonicalPatterns = new Set<string>();
    for (const playlistItem of track.playlist) {
        if (playlistItem.type !== 'pattern') continue;
        for (const pat of playlistItem.patterns) {
            const pattern = track.patterns[pat.id];
            if (!pattern) continue;
            const hash = generatePatternHash(pattern, similarity);
            if (patternHashes.has(hash)) {
                pat.id = patternHashes.get(hash)!;
            } else {
                patternHashes.set(hash, pat.id);
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