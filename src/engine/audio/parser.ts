import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, NoteGroup, PatternPlaylistItem, CommandPlaylistItem } from './models';

export class LigatureParser {
    
    private static TOKEN_REGEX = /(\(.*?\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|\d+['#b%,]*|[-.|])/g;

    public parse(rawSource: string): ParsedTrack {
        const lines = rawSource.split('\n')
            .map(l => l.split('//')[0].trim()) // Strip comments
            .filter(l => l.length > 0);        // Remove empty lines

        const track: ParsedTrack = {
            config: { 
                bpm: 120, 
                grid: 4, 
                timeSig: [4, 4], 
                scaleRoot: 'C', 
                scaleMode: 'Major', 
                swing: 0,
                humanize: 0 // <--- ADD THIS FIX
            },
            instruments: {},
            definitions: {},
            patterns: {},
            playlist: []
        };

        // ... (rest of the file remains the same)
        
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
                        duration: 0, // Will be calculated by rows
                        tracks: {},
                        trackModifiers: {}
                    };
                } else {
                    currentSection = header.toUpperCase(); // Normalize header names
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

    // ... (keep the rest of the existing methods: parseConfig, parseInstrument, parseDefinition, parsePatternRow, parsePlaylistRow, resolveNotes, parseNoteToken)
    
    private parseConfig(line: string, track: ParsedTrack) {
        const parts = line.split(':');
        if (parts.length < 2) return;
        
        const key = parts[0].trim();
        const val = parts[1].trim();

        if (key === 'BPM') track.config.bpm = parseFloat(val) || 120;
        if (key === 'Grid' || key === 'Res') track.config.grid = parseInt(val) || 4;
        
        // Humanize & Swing parsing (0-100 range in text -> 0.0-1.0 in float)
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
        
        const alias = aliasRaw.substring(1);
        const cleanVal = valRaw.replace(/[\[\]]/g, '');
        const parts = cleanVal.split(',').map(s => s.trim()).filter(Boolean);
        
        const noteGroup: NoteGroup = parts.map(p => this.parseNoteToken(p));
        track.definitions[alias] = noteGroup;
    }

    private parsePatternRow(line: string, track: ParsedTrack, patternId: string) {
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) return;

        const trackName = line.substring(0, pipeIndex).trim();
        const content = line.substring(pipeIndex);
        
        // Parse modifiers: "Bass(v:-5)"
        const nameMatch = trackName.match(/^(\w+)(?:\((.*)\))?$/);
        const actualTrackName = nameMatch ? nameMatch[1] : trackName;
        // (Modifiers parsing logic stub - if implemented)

        const pattern = track.patterns[patternId];
        if (!pattern) return;
        if (!pattern.tracks[actualTrackName]) pattern.tracks[actualTrackName] = [];
        const sequence = pattern.tracks[actualTrackName];

        const { grid, timeSig } = track.config;
        const quarterNotesPerBeat = 4 / timeSig[1];
        const slotsPerBeat = grid * quarterNotesPerBeat;
        const slotsPerBar = slotsPerBeat * timeSig[0];

        const tokens = content.match(LigatureParser.TOKEN_REGEX) || [];
        let currentTime = 0; // In Grid Slots

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