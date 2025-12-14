import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, NoteGroup, PatternPlaylistItem, CommandPlaylistItem } from './models';
import { PlayerQualities } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';

export class LigatureParser {
    
    // REGEX for tokenizing a pattern row
    private static TOKEN_REGEX = /(\(.*?\)|@\w+(?:\([0-9]+\))?|\d+['#b%,]*|[-.|])/g;

    public parse(rawSource: string, mockQualities: PlayerQualities = {}): ParsedTrack {
        
        // --- 1. SCRIBESCRIPT PRE-PASS ---
        let processedSource = rawSource;
        try {
            // Evaluate the entire file as a text template.
            // This resolves {{ $combat ? 120 : 100 }} before parsing.
            processedSource = evaluateText(rawSource, mockQualities, {}, null, 0);
        } catch (e) {
            console.warn("Ligature ScribeScript Pre-Pass Error:", e);
        }
        // --------------------------------

        const lines = processedSource.split('\n')
            .map(l => l.split('//')[0].trim()) // Strip comments
            .filter(l => l.length > 0);        // Remove empty lines

        const track: ParsedTrack = {
            config: { 
                bpm: 120, grid: 4, timeSig: [4, 4], 
                scaleRoot: 'C', scaleMode: 'Major', swing: 0, humanize: 0
            },
            instruments: {},
            definitions: {},
            patterns: {},
            playlist: []
        };

        let currentSection = '';
        let currentPatternId = '';

        for (const line of lines) {
            const sectionMatch = line.match(/^\[(.*?)\]$/);
            if (sectionMatch) {
                const header = sectionMatch[1].trim();
                
                if (header.startsWith('PATTERN:')) {
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

            switch (currentSection) {
                case 'CONFIG': this.parseConfig(line, track); break;
                case 'INSTRUMENTS': this.parseInstrument(line, track); break;
                case 'DEFINITIONS': this.parseDefinition(line, track); break;
                case 'PATTERN': 
                    if (currentPatternId) this.parsePatternRow(line, track, currentPatternId); 
                    break;
                case 'PLAYLIST': this.parsePlaylistRow(line, track); break;
            }
        }

        return track;
    }

    // --- SECTION PARSERS ---

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
        const [name, id] = line.split(':').map(s => s.trim());
        if (name && id) track.instruments[name] = id;
    }

    private parseDefinition(line: string, track: ParsedTrack) {
        const [aliasRaw, valRaw] = line.split('=').map(s => s.trim());
        if (!aliasRaw || !valRaw || !aliasRaw.startsWith('@')) return;
        // Logic aliases are handled by pre-pass, so we ignore {{...}} here
        if (valRaw.startsWith('{{')) return; 
        
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
        let modifiers: any = undefined;

        // Parse modifiers: "Bass(v:-5)"
        const match = leftSide.match(/^([a-zA-Z0-9_]+)(?:\((.*)\))?$/);
        if (match) {
            trackName = match[1];
            if (match[2]) {
                modifiers = { transpose: 0, volume: 0, pan: 0 };
                const modParts = match[2].split(',');
                modParts.forEach((p: string) => {
                    const cleanP = p.trim();
                    if (/^[+-]?\d+$/.test(cleanP)) { modifiers.transpose = parseInt(cleanP); return; }
                    const [k, v] = cleanP.split(':').map((s: string) => s.trim());
                    const num = parseFloat(v);
                    if (!isNaN(num)) {
                        if (['v', 'vol', 'volume'].includes(k)) modifiers.volume = num;
                        if (['t', 'trans', 'transpose'].includes(k)) modifiers.transpose = num;
                        if (['p', 'pan'].includes(k)) modifiers.pan = num;
                        if (['o', 'oct', 'octave'].includes(k)) modifiers.transpose += (num * 12);
                    }
                });
            }
        }

        const pattern = track.patterns[patternId];
        if (!pattern) return;
        if (!pattern.tracks[trackName]) pattern.tracks[trackName] = [];
        const sequence = pattern.tracks[trackName];

        if (modifiers) {
            if (!pattern.trackModifiers) pattern.trackModifiers = {};
            pattern.trackModifiers[trackName] = modifiers;
        }

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
                const inner = token.substring(1, token.length - 1);
                const subMatches = inner.match(/(\d+['#b%,]*|@\w+)/g); 
                
                if (subMatches && subMatches.length > 0) {
                    const count = subMatches.length;
                    const durationPerNote = slotsPerBeat / count; 
                    
                    subMatches.forEach((subToken, idx) => {
                        const notes = this.resolveNotes(subToken, track.definitions);
                        if (notes.length > 0) {
                            sequence.push({
                                time: currentTime + (idx * durationPerNote),
                                duration: durationPerNote,
                                notes
                            });
                        }
                    });
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
                const key = parts[0].trim();
                const value = parts[1].trim();
                if (key === 'BPM' || key === 'Scale') {
                    track.playlist.push({ type: 'command', command: key, value: value });
                    return; 
                }
            }
        }

        const items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        const patterns: { id: string; transposition: number }[] = [];

        items.forEach(item => {
            const match = item.match(/^([a-zA-Z0-9_]+)(?:\(\s*([+-]?\d+)\s*\))?$/);
            if (match) {
                patterns.push({
                    id: match[1],
                    transposition: match[2] ? parseInt(match[2]) : 0
                });
            } else {
                 patterns.push({ id: item, transposition: 0 });
            }
        });

        if (patterns.length > 0) {
            track.playlist.push({
                type: 'pattern',
                patterns: patterns
            });
        }
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

        let octaveShift = 0;
        let accidental = 0;
        let isNatural = false;

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