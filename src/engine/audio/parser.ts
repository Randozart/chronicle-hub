// src/engine/audio/parser.ts

import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, NoteGroup, CommandPlaylistItem, PatternPlaylistItem, PatternModifier } from './models';
import { PlayerQualities } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';

export class LigatureParser {
    
    private static TOKEN_REGEX = /(\(.*?\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|\d+['#b%,]*|[-.|])/g;

    private preParseScribeScript(source: string, mockQualities: PlayerQualities): string {
        const scribeRegex = /\{((?:[^{}]|\{[^{}]*\})*?)\}/g;
        return source.replace(scribeRegex, (fullMatch, expression) => {
            if (!expression.match(/[\$@%]/)) {
                return fullMatch; 
            }
            try {
                return evaluateText(fullMatch, mockQualities, {}, null, 0);
            } catch (e) {
                console.warn(`Ligature ScribeScript Pre-Pass Error on expression: "${expression}"`, e);
                return fullMatch; 
            }
        });
    }

    public parse(rawSource: string, mockQualities: PlayerQualities = {}): ParsedTrack {
        const processedSource = this.preParseScribeScript(rawSource, mockQualities);
        const lines = processedSource.split('\n')
            .map(l => l.split('//')[0].trim())
            .filter(l => l.length > 0);
        const track: ParsedTrack = {
            config: { 
                bpm: 120, grid: 4, timeSig: [4, 4], 
                scaleRoot: 'C', scaleMode: 'Major', swing: 0, humanize: 0
            },
            instruments: {}, definitions: {}, patterns: {}, playlist: []
        };
        let currentSection = '';
        let currentPatternId = '';
        for (const line of lines) {
            const sectionMatch = line.match(/^\[(.*?)\]$/);
            if (sectionMatch) {
                const header = sectionMatch[1].trim();
                const headerKey = header.split(':')[0].toUpperCase();
                if (['PATTERN', 'PAT', 'P'].includes(headerKey)) {
                    currentSection = 'PATTERN';
                    currentPatternId = header.split(':')[1].trim();
                    track.patterns[currentPatternId] = { 
                        id: currentPatternId, 
                        duration: 0,
                        tracks: {},
                        trackModifiers: {} 
                    };
                } else {
                    currentSection = header.toUpperCase();
                    currentPatternId = '';
                }
                continue;
            }
            if (['CONFIG', 'CFG', 'CONF'].includes(currentSection)) this.parseConfig(line, track);
            else if (['INSTRUMENTS', 'INST', 'INS'].includes(currentSection)) this.parseInstrument(line, track);
            else if (['DEFINITIONS', 'DEF', 'DEFS'].includes(currentSection)) this.parseDefinition(line, track);
            else if (currentSection === 'PATTERN' && currentPatternId) this.parsePatternRow(line, track, currentPatternId);
            else if (['PLAYLIST', 'PLAY', 'SEQ', 'LIST'].includes(currentSection)) this.parsePlaylistRow(line, track);
        }
        return track;
    }

    private parseConfig(line: string, track: ParsedTrack) {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const key = parts[0].trim();
        const val = parts[1].trim();
        if (key === 'BPM') track.config.bpm = parseFloat(val) || 120;
        if (key === 'Grid' || key === 'Res') track.config.grid = parseInt(val) || 4;
        if (key === 'Swing') track.config.swing = (parseInt(val) || 0) / 100;
        if (key === 'Humanize') track.config.humanize = (parseInt(val) || 0) / 100;
        if (key === 'Scale') {
            const scaleParts = val.split(' ');
            track.config.scaleRoot = scaleParts[0];
            track.config.scaleMode = scaleParts[1] || 'Major';
        }
        if (key === 'Time' || key === 'TimeSig') {
            const timeParts = val.split('/');
            track.config.timeSig = [parseInt(timeParts[0]) || 4, parseInt(timeParts[1]) || 4];
        }
    }

    private parseInstrument(line: string, track: ParsedTrack) {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const name = parts[0].trim();
        const rest = parts.slice(1).join(':').trim();
        const match = rest.match(/^([a-zA-Z0-9_]+)\s*(?:\((.*)\))?$/);
        if (!match) return;
        const id = match[1];
        const overrides: any = {};
        if (match[2]) {
            const modParts = match[2].split(',');
            modParts.forEach(p => {
                const parts = p.split(':');
                if (parts.length === 2) {
                    const k = parts[0].trim().toLowerCase();
                    const v = parseFloat(parts[1].trim());
                    if (!isNaN(v)) {
                        if (['v', 'vol', 'volume'].includes(k)) overrides.volume = v;
                        if (['a', 'att', 'attack'].includes(k)) overrides.attack = v;
                        if (['d', 'dec', 'decay'].includes(k)) overrides.decay = v;
                        if (['s', 'sus', 'sustain'].includes(k)) overrides.sustain = v;
                        if (['r', 'rel', 'release'].includes(k)) overrides.release = v;
                    }
                }
            });
        }
        track.instruments[name] = { id, overrides };
    }

    private parseDefinition(line: string, track: ParsedTrack) {
        const [aliasRaw, valRaw] = line.split('=').map(s => s.trim());
        if (!aliasRaw || !valRaw || !aliasRaw.startsWith('@')) return;
        if (valRaw.startsWith('{')) return; 
        if (valRaw.startsWith('[')) {
            const alias = aliasRaw.substring(1);
            const cleanVal = valRaw.replace(/[\[\]]/g, '');
            const parts = cleanVal.split(',').map(s => s.trim()).filter(Boolean);
            const noteGroup: NoteGroup = parts.map(p => this.parseNoteToken(p));
            track.definitions[alias] = noteGroup;
        }
    }

    private parsePatternRow(line: string, track: ParsedTrack, patternId: string) {
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) return;
        const leftSide = line.substring(0, pipeIndex).trim();
        const content = line.substring(pipeIndex);
        let trackName = leftSide;
        let modifiers: PatternModifier | undefined;
        const match = leftSide.match(/^([a-zA-Z0-9_]+)\s*(?:\((.*)\))?$/);
        if (match) {
            trackName = match[1];
            if (match[2]) {
                modifiers = this.parseModifiers(match[2]);
            }
        }
        const pattern = track.patterns[patternId];
        if (!pattern) return;
        if (!pattern.tracks[trackName]) pattern.tracks[trackName] = [];
        if (modifiers) {
            if (!pattern.trackModifiers) pattern.trackModifiers = {};
            pattern.trackModifiers[trackName] = modifiers;
        }
        const sequence = pattern.tracks[trackName];
        const { grid, timeSig } = track.config;
        const quarterNotesPerBeat = 4 / timeSig[1];
        const slotsPerBeat = grid * quarterNotesPerBeat;
        const slotsPerBar = slotsPerBeat * timeSig[0];
        const tokens = content.match(LigatureParser.TOKEN_REGEX) || [];
        let currentTime = 0; 
        for (const token of tokens) {
            if (token === '|') continue;
            if (token === '.') { currentTime++; continue; }
            if (token === '-') {
                if (sequence.length > 0) {
                    const lastEvent = sequence[sequence.length - 1];
                    if (lastEvent && lastEvent.time + lastEvent.duration >= currentTime) {
                        lastEvent.duration++;
                    }
                }
                currentTime++;
                continue;
            }
            if (token.startsWith('(')) {
                const inner = token.substring(1, token.length - 1).trim();
                // *** BUG FIX IS HERE ***
                // Split by whitespace instead of using a faulty regex to correctly capture all tokens.
                const subTokens = inner.split(/\s+/).filter(Boolean);
                
                if (subTokens.length > 0) {
                    const durationPerNote = slotsPerBeat / subTokens.length; 
                    let tupletTime = 0;
                    
                    for (const subToken of subTokens) {
                         if (subToken === '.') {
                            tupletTime += durationPerNote;
                            continue;
                        }
                        if (subToken === '-') {
                            if (sequence.length > 0) {
                                const lastEvent = sequence[sequence.length - 1];
                                // Check if the last note was part of this tuplet
                                if (lastEvent && lastEvent.time >= currentTime && lastEvent.time < (currentTime + slotsPerBeat)) {
                                    lastEvent.duration += durationPerNote;
                                }
                            }
                            tupletTime += durationPerNote;
                            continue;
                        }

                        const notes = this.resolveNotes(subToken, track.definitions);
                        if (notes.length > 0) {
                            sequence.push({
                                time: currentTime + tupletTime,
                                duration: durationPerNote,
                                notes
                            });
                        }
                        tupletTime += durationPerNote;
                    }
                }
                currentTime += slotsPerBeat; 
                continue;
            }
            const notes = this.resolveNotes(token, track.definitions);
            if (notes.length > 0) {
                sequence.push({ time: currentTime, duration: 1, notes });
            }
            currentTime++;
        }
        const barCount = (content.match(/\|/g) || []).length - 1;
        const expectedDurationInSlots = barCount > 0 ? barCount * slotsPerBar : currentTime;
        pattern.duration = Math.max(pattern.duration, expectedDurationInSlots);
    }

    private parsePlaylistRow(line: string, track: ParsedTrack) {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.includes('=')) {
            const parts = trimmed.split('=');
            if (parts.length === 2) {
                const key = parts[0].trim().toUpperCase();
                const value = parts[1].trim();
                if (key === 'BPM' || key === 'SCALE') {
                    track.playlist.push({ type: 'command', command: key as 'BPM' | 'Scale', value: value });
                    return;
                }
            }
        }
        const items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        const playlistItem: PatternPlaylistItem = {
            type: 'pattern',
            patterns: [],
            modifiers: {}
        };
        items.forEach(item => {
            const match = item.match(/^([a-zA-Z0-9_]+)(?:\((.*)\))?$/);
            if (match) {
                const patId = match[1];
                let mods = this.parseModifiers(match[2] || '');
                playlistItem.patterns.push({ 
                    id: patId, 
                    transposition: mods.transpose,
                    volume: mods.volume
                });
                if (!playlistItem.modifiers) playlistItem.modifiers = {};
                playlistItem.modifiers[patId] = mods;
            }
        });
        if (playlistItem.patterns.length > 0) {
            track.playlist.push(playlistItem);
        }
    }

    private parseModifiers(raw: string): PatternModifier {
        const mods: PatternModifier = { transpose: 0, volume: 0, pan: 0 };
        const parts = raw.split(',').map(s => s.trim());
        parts.forEach(p => {
            if (/^[+-]?\d+$/.test(p)) {
                mods.transpose = parseInt(p);
                return;
            }
            const [key, val] = p.split(':').map(s => s.trim());
            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
                if (['v', 'vol'].includes(key)) mods.volume = numVal;
                if (['p', 'pan'].includes(key)) mods.pan = numVal;
                if (['t', 'trans'].includes(key)) mods.transpose += numVal;
                if (['o', 'oct'].includes(key)) mods.transpose += (numVal * 12);
            }
        });
        return mods;
    }

    private resolveNotes(token: string, defs: Record<string, NoteGroup>): NoteDef[] {
        if (token.startsWith('@')) {
            const match = token.match(/^@(\w+)(?:\((\d+)\))?$/);
            if (match) {
                const aliasName = match[1];
                const shiftArg = match[2] ? parseInt(match[2]) : 1;
                const definition = defs[aliasName];
                if (!definition) return [];
                const degreeOffset = shiftArg - 1;
                return definition.map(n => ({ ...n, degree: n.degree + degreeOffset }));
            }
        }
        return [this.parseNoteToken(token)];
    }

    private parseNoteToken(token: string): NoteDef {
        const match = token.match(/^(\d+)(.*)$/);
        if (!match) return { degree: 1, octaveShift: 0, accidental: 0, isNatural: false };
        const degree = parseInt(match[1]);
        const mods = match[2];
        let octaveShift = 0; let accidental = 0; let isNatural = false;
        for (const char of mods) {
            if (char === "'") octaveShift++;
            if (char === ',') octaveShift--;
            if (char === '#') accidental++;
            if (char === 'b') accidental--;
            if (char === '%') isNatural = true;
        }
        return { degree, octaveShift, accidental, isNatural };
    }
}