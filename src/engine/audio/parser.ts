import { ParsedTrack, ParsedPattern, SequenceEvent, NoteDef, PlaylistItem, NoteGroup } from './models';

export class LigatureParser {
    
    // REGEX BREAKDOWN:
    // 1. Tuplets: ( ... ) -> Non-greedy capture inside parens
    // 2. Aliases: @Name followed optionally by (Number)
    // 3. Notes: Digits followed by modifiers (', #, b, %)
    // 4. Grid Symbols: | (Bar), - (Sustain), . (Rest)
    // Note: We use ',' for Octave Down, so '.' is strictly Rest.
    private static TOKEN_REGEX = /(\(.*?\)|@\w+(?:\([0-9]+\))?|\d+['#b%,]*|[-.|])/g;

    public parse(rawSource: string): ParsedTrack {
        const lines = rawSource.split('\n')
            .map(l => l.split('//')[0].trim()) // Strip comments
            .filter(l => l.length > 0);        // Remove empty lines

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
            // 1. Header Detection: [SECTION]
            const sectionMatch = line.match(/^\[(.*?)\]$/);
            if (sectionMatch) {
                const header = sectionMatch[1].trim();
                
                // Check for PATTERN:ID syntax
                if (header.startsWith('PATTERN:')) {
                    currentSection = 'PATTERN';
                    currentPatternId = header.split(':')[1].trim();
                    // Initialize Pattern
                    track.patterns[currentPatternId] = { 
                        id: currentPatternId, 
                        duration: 0, 
                        tracks: {} 
                    };
                } else {
                    currentSection = header;
                    currentPatternId = '';
                }
                continue;
            }

            // 2. Dispatch Logic
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
        
        if (key === 'Scale') {
            // "C Minor" or "F# Dorian"
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
        // Syntax: @Power = [1, 5]
        // Note: ScribeScript evaluation happens BEFORE this parser runs, 
        // so we assume {{...}} has already been resolved to [1, 5] or similar.
        const [aliasRaw, valRaw] = line.split('=').map(s => s.trim());
        
        if (!aliasRaw.startsWith('@') || !valRaw.startsWith('[')) return;
        
        const alias = aliasRaw.substring(1); // remove @
        const cleanVal = valRaw.replace(/[\[\]]/g, ''); // remove []
        const parts = cleanVal.split(',').map(s => s.trim()).filter(Boolean);
        
        const noteGroup: NoteGroup = parts.map(p => this.parseNoteToken(p));
        track.definitions[alias] = noteGroup;
    }

    private parsePatternRow(line: string, track: ParsedTrack, patternId: string) {
        // Syntax: Bass | 1 . 1 . |
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) return; // Ignore invalid lines

        const trackName = line.substring(0, pipeIndex).trim();
        const content = line.substring(pipeIndex); // Keep the first pipe for regex matching if needed
        
        const pattern = track.patterns[patternId];
        if (!pattern.tracks[trackName]) pattern.tracks[trackName] = [];
        const sequence = pattern.tracks[trackName];

        // Tokenize
        const matches = content.match(LigatureParser.TOKEN_REGEX);
        if (!matches) return;

        let currentTime = 0; // In Grid Slots

        for (const token of matches) {
            // A. BAR LINE (Visual only)
            if (token === '|') continue;

            // B. REST
            if (token === '.') {
                currentTime++;
                continue;
            }

            // C. SUSTAIN
            if (token === '-') {
                // Find the last event in this track and extend it
                // We search backwards because the array is sorted by time
                if (sequence.length > 0) {
                    const lastEvent = sequence[sequence.length - 1];
                    // If the last event ends exactly where we are, extend it
                    if (lastEvent.time + lastEvent.duration === currentTime) {
                        lastEvent.duration++;
                    }
                }
                currentTime++;
                continue;
            }

            // D. TUPLET (1 2 3)
            if (token.startsWith('(')) {
                // Strip parens
                const inner = token.substring(1, token.length - 1);
                // Recursive regex match for notes inside
                const subMatches = inner.match(/(\d+['#b%,]*|@\w+)/g); 
                
                if (subMatches) {
                    const count = subMatches.length;
                    const durationPerNote = 1.0 / count; // Float math!
                    
                    subMatches.forEach((subToken, idx) => {
                        const notes = this.resolveNotes(subToken, track.definitions);
                        sequence.push({
                            time: currentTime + (idx * durationPerNote),
                            duration: durationPerNote,
                            notes
                        });
                    });
                }
                
                currentTime++; // Tuplets take up exactly 1 grid slot
                continue;
            }

            // E. STANDARD NOTE OR ALIAS
            // It's either "1", "1'", "@Chord", etc.
            const notes = this.resolveNotes(token, track.definitions);
            sequence.push({
                time: currentTime,
                duration: 1, // Default duration 1 slot
                notes
            });
            currentTime++;
        }
        
        // Update total pattern duration (max of all tracks)
        pattern.duration = Math.max(pattern.duration, currentTime);
    }

    private parsePlaylistRow(line: string, track: ParsedTrack) {
        // Syntax: Theme_A, Theme_B(+2)
        // Split by comma
        const items = line.split(',');
        const patternIds: string[] = [];
        // We only support ONE transposition per line for v1 simplification,
        // or we take the first one found. Ideally, this should be per-pattern struct.
        // For simplicity in Phase 1, we assume the whole line shares transposition or 0.
        // *Correction*: Let's parse just the IDs. Advanced transposition logic 
        // can be handled by defining a specific PlaylistItem struct later.
        
        let rowTransposition = 0;

        items.forEach(item => {
            const clean = item.trim();
            // Check for transposition syntax: Name(+2)
            const match = clean.match(/^([a-zA-Z0-9_]+)(?:\(\s*([+-]?\d+)\s*\))?$/);
            if (match) {
                patternIds.push(match[1]);
                if (match[2]) {
                    rowTransposition = parseInt(match[2]);
                }
            }
        });

        if (patternIds.length > 0) {
            track.playlist.push({
                patternIds,
                transposition: rowTransposition
            });
        }
    }

    // --- HELPERS ---

    private resolveNotes(token: string, defs: Record<string, NoteGroup>): NoteDef[] {
        // 1. Check Alias
        if (token.startsWith('@')) {
            // Format: @Name or @Name(2)
            const match = token.match(/^@(\w+)(?:\((\d+)\))?$/);
            if (match) {
                const aliasName = match[1];
                const shiftArg = match[2] ? parseInt(match[2]) : 1; // Default to Root 1
                
                const definition = defs[aliasName];
                if (!definition) return []; // Unknown alias

                // Apply logic: Scale degree shift
                // If definition is [1, 5] (Root, Fifth)
                // And we call @Chord(2) -> Shift is +1 scale degree (2 - 1)
                const degreeOffset = shiftArg - 1;

                return definition.map(n => ({
                    ...n,
                    degree: n.degree + degreeOffset 
                    // Note: Octave wrapping for degrees > 7 is handled in scales.ts
                }));
            }
        }

        // 2. Standard Note
        return [this.parseNoteToken(token)];
    }

    private parseNoteToken(token: string): NoteDef {
        // Regex: Digits (Degree) + Modifiers
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