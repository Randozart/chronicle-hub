import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, NoteGroup } from './models';

export class LigatureParser {
    
    // REGEX for tokenizing a pattern row
    private static TOKEN_REGEX = /(\(.*?\)|@\w+(?:\([0-9]+\))?|\d+['#b%,]*|[-.|])/g;

    // REMOVED: noteCache, resolveAndCacheNote (These belong in AudioProvider)

    public parse(rawSource: string): ParsedTrack {
        // ... (parse method remains the same) ...
        const lines = rawSource.split('\n')
            .map(l => l.split('//')[0].trim()) 
            .filter(l => l.length > 0);   

        const track: ParsedTrack = {
            config: { 
                bpm: 120, grid: 4, timeSig: [4, 4], 
                scaleRoot: 'C', scaleMode: 'Major', swing: 0 
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
                        tracks: {} 
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

    // ... (parseConfig, parseInstrument, parseDefinition remain the same) ...
    private parseConfig(line: string, track: ParsedTrack) {
        const parts = line.split(':');
        if (parts.length < 2) return;
        const key = parts[0].trim();
        const val = parts[1].trim();
        if (key === 'BPM') track.config.bpm = parseFloat(val) || 120;
        if (key === 'Grid' || key === 'Res') track.config.grid = parseInt(val) || 4;
        if (key === 'Swing') track.config.swing = (parseInt(val) || 0) / 100;
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
        if (valRaw.startsWith('{{')) return; // Logic aliases handled by pre-parser
        
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

        const trackName = line.substring(0, pipeIndex).trim();
        const content = line.substring(pipeIndex);
        
        const pattern = track.patterns[patternId];
        if (!pattern) return;
        if (!pattern.tracks[trackName]) pattern.tracks[trackName] = [];
        const sequence = pattern.tracks[trackName];

        // --- TIMING CALCULATION ---
        const { grid, timeSig } = track.config;
        const quarterNotesPerBeat = 4 / timeSig[1];
        const slotsPerBeat = grid * quarterNotesPerBeat;
        // --------------------------

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

            // --- FIXED TUPLET LOGIC (Beat Duration) ---
            if (token.startsWith('(')) {
                const inner = token.substring(1, token.length - 1);
                const subMatches = inner.match(/(\d+['#b%,]*|@\w+)/g); 
                
                if (subMatches && subMatches.length > 0) {
                    const count = subMatches.length;
                    
                    // FIX: Divide the BEAT (slotsPerBeat), not 1.0
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
                
                // FIX: Advance by a full BEAT
                currentTime += slotsPerBeat; 
                continue;
            }
            // ------------------------------------------

            const notes = this.resolveNotes(token, track.definitions);
            if (notes.length > 0) {
                sequence.push({ time: currentTime, duration: 1, notes });
            }
            currentTime++;
        }
        
        const slotsPerBar = slotsPerBeat * timeSig[0];
        const barCount = (content.match(/\|/g) || []).length - 1;
        const expectedDurationInSlots = barCount > 0 ? barCount * slotsPerBar : currentTime;
        pattern.duration = Math.max(pattern.duration, expectedDurationInSlots);
    }

    // ... (parsePlaylistRow, resolveNotes, parseNoteToken remain the same) ...
    private parsePlaylistRow(line: string, track: ParsedTrack) {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Command check
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
            // Match: Name(transposition) e.g. Theme_A(+2)
            const match = item.match(/^([a-zA-Z0-9_]+)(?:\(\s*([+-]?\d+)\s*\))?$/);
            if (match) {
                patterns.push({
                    id: match[1],
                    transposition: match[2] ? parseInt(match[2]) : 0
                });
            }
        });

        if (patterns.length > 0) {
            track.playlist.push({
                type: 'pattern',
                patterns: patterns // <-- Matches your model structure
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