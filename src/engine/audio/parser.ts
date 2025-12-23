import { ParsedTrack, PatternModifier, NoteDef, Layer, ChainItem, NoteGroup, EffectCommand } from './models';
import { PlayerQualities, QualityDefinition } from '@/engine/models';
import { evaluateText } from '@/engine/textProcessor';
import { MODES } from './scales'; 
import { LIGATURE_TOKEN_REGEX } from './constants'; 

export class LigatureParser {
    
    private preParseScribeScript(
        source: string, 
        mockQualities: PlayerQualities,
        mockDefs: Record<string, QualityDefinition>
    ): string {
        const scribeRegex = /\{((?:[^{}]|\{[^{}]*\})*?)\}/g;
        return source.replace(scribeRegex, (fullMatch, expression) => {
            if (!expression.match(/[\$@%]/)) return fullMatch; 
            try {
                // Pass mockDefs to the evaluator
                return evaluateText(fullMatch, mockQualities, mockDefs, null, 0);
            } catch (e) {
                console.warn(`Ligature ScribeScript Pre-Pass Error:`, e);
                return fullMatch; 
            }
        });
    }

    public parse(
        rawSource: string, 
        mockQualities: PlayerQualities = {},
        mockDefs: Record<string, QualityDefinition> = {}
    ): ParsedTrack {
        const processedSource = this.preParseScribeScript(rawSource, mockQualities, mockDefs);
        const lines = processedSource.split('\n')
            .map(l => l.split('//')[0].trimEnd())
            .filter(l => l.trim().length > 0);

        const track: ParsedTrack = {
            config: { 
                bpm: 120, grid: 4, timeSig: [4, 4], 
                scaleRoot: 'C', scaleMode: 'Major', swing: 0, humanize: 0
            },
            instruments: {}, definitions: {}, patterns: {}, playlist: []
        };

        let currentSection = '';
        let currentPatternId = '';
        let lastPatternTrackName = '';

        for (const line of lines) {
            const trimmedLine = line.trim();
            const sectionMatch = trimmedLine.match(/^\[(.*?)\]$/);
            
            if (sectionMatch) {
                const header = sectionMatch[1].trim();
                const headerParts = header.split(':');
                const headerKey = headerParts[0].toUpperCase();
                
                if (['PATTERN', 'PAT', 'P'].includes(headerKey)) {
                    currentSection = 'PATTERN';
                    currentPatternId = (headerParts[1] || '').trim();
                    if (currentPatternId) {
                        track.patterns[currentPatternId] = { 
                            id: currentPatternId, duration: 0, tracks: {}, trackModifiers: {} 
                        };
                        lastPatternTrackName = ''; 
                    }
                } else {
                    currentSection = headerKey;
                    currentPatternId = '';
                }
                continue;
            }

            if (['CONFIG', 'CFG', 'CONF', 'C'].includes(currentSection)) this.parseConfig(trimmedLine, track);
            else if (['INSTRUMENTS', 'INST', 'INS', 'I'].includes(currentSection)) this.parseInstrument(trimmedLine, track);
            else if (['DEFINITIONS', 'DEF', 'DEFS', 'D'].includes(currentSection)) this.parseDefinition(trimmedLine, track);
            else if (currentSection === 'PATTERN' && currentPatternId) {
                lastPatternTrackName = this.parsePatternRow(line, track, currentPatternId, lastPatternTrackName);
            }
            else if (['PLAYLIST', 'PLAY', 'SEQ', 'LIST', 'L', 'TRACK', 'T'].includes(currentSection)) this.parsePlaylistRow(trimmedLine, track);
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
            track.config.scaleMode = scaleParts.slice(1).join(' ') || 'Major';
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
        
        const match = rest.match(/^([a-zA-Z0-9_]+)\s*(?:\((.*)\))?/);
        if (!match) return;
        
        const id = match[1];
        const propsRaw = match[2];

        const overrides: any = {};
        
        if (propsRaw) {
            const modParts = propsRaw.split(',');
            modParts.forEach(p => {
                const [key, val] = p.split(':').map(s => s.trim());
                if (key && val) {
                    const k = key.toLowerCase();
                    const v = parseFloat(val);
                    if (!isNaN(v)) {
                        if (['v', 'vol', 'volume'].includes(k)) overrides.volume = v;
                        if (['a', 'att', 'attack'].includes(k)) overrides.attack = v;
                        if (['d', 'dec', 'decay'].includes(k)) overrides.decay = v;
                        if (['s', 'sus', 'sustain'].includes(k)) overrides.sustain = v;
                        if (['r', 'rel', 'release'].includes(k)) overrides.release = v;
                        if (['o', 'oct', 'octave'].includes(k)) overrides.octaveOffset = v;
                        if (['rev', 'reverb'].includes(k)) overrides.reverb = v;
                        if (['del', 'delay'].includes(k)) overrides.delay = v;
                        if (['dist', 'distortion'].includes(k)) overrides.distortion = v;
                        if (['bit', 'crush', 'bitcrush'].includes(k)) overrides.bitcrush = v;
                    }
                }
            });
        }
        
        track.instruments[name] = { id, overrides };
    }

    private parseDefinition(line: string, track: ParsedTrack) {
        const match = line.match(/(@\w+)\s*=\s*\[(.*?)\](?:\((.*)\))?(?:\^\[(.*)\])?/);
        if (!match) return;

        const alias = match[1].substring(1);
        const content = match[2];
        const propsRaw = match[3];
        const effectsRaw = match[4];

        const parts = content.split(/\s+/).filter(Boolean);
        const noteGroup: NoteGroup = parts.map(p => this.parseNoteToken(p));

        if (propsRaw || effectsRaw) {
            const mods = this.parseModifiers(propsRaw || '', track);
            const effects = effectsRaw ? this.parseEffectsArray(effectsRaw) : [];
            noteGroup.forEach(n => {
                if (mods.volume) n.volume = (n.volume || 0) + mods.volume;
                if (effects.length > 0) n.effects = [...(n.effects || []), ...effects];
            });
        }
        track.definitions[alias] = noteGroup;
    }

   private parsePatternRow(line: string, track: ParsedTrack, patternId: string, lastTrackName: string): string {
        const pipeIndex = line.indexOf('|');
        if (pipeIndex === -1) return lastTrackName;

        const leftSide = line.substring(0, pipeIndex).trim();
        const content = line.substring(pipeIndex);
        
        let trackName = leftSide;
        let modifiers: PatternModifier | undefined;

        if (!trackName && lastTrackName) {
            trackName = lastTrackName;
        } else if (!trackName) {
            return '';
        }

        const match = leftSide.match(/^([a-zA-Z0-9_]+)\s*(?:\((.*)\))?(?:\^\[(.*)\])?$/);
        if (match) {
            trackName = match[1];
            const propsRaw = match[2];
            const effectsRaw = match[3];

            if (propsRaw || effectsRaw) {
                modifiers = this.parseModifiers(propsRaw || '', track);
                if (effectsRaw) {
                    modifiers.effects = this.parseEffectsArray(effectsRaw);
                }
            }
        }

        const pattern = track.patterns[patternId];
        if (!pattern) return trackName;

        // --- Handle Duplicate Lanes (Audio Fix) ---
        let storageKey = trackName;
        if (pattern.tracks[storageKey]) {
            let counter = 2;
            while (pattern.tracks[`${trackName}_#${counter}`]) {
                counter++;
            }
            storageKey = `${trackName}_#${counter}`;
        }

        if (!pattern.tracks[storageKey]) pattern.tracks[storageKey] = [];
        
        if (modifiers) {
            if (!pattern.trackModifiers) pattern.trackModifiers = {};
            pattern.trackModifiers[storageKey] = modifiers;
        }

        const sequence = pattern.tracks[storageKey];
        const { grid, timeSig } = track.config;
        
        // Use Centralized Regex
        const tokens = content.match(LIGATURE_TOKEN_REGEX) || [];
        let currentTime = 0; 
        
        for (const token of tokens) {
            if (token === '|') continue;
            if (token === '.') { currentTime++; continue; }
            if (token === '-') {
                 if (sequence.length > 0) {
                    const lastEvent = sequence[sequence.length - 1];
                    if (lastEvent && Math.abs((lastEvent.time + lastEvent.duration) - currentTime) < 0.01) {
                        lastEvent.duration++;
                    }
                }
                currentTime++;
                continue;
            }
            if (token.startsWith('(')) {
                // Remove outer parens
                const inner = token.substring(1, token.length - 1);
                const subMatches = inner.split(/\s+/).filter(Boolean);
                if (subMatches.length > 0) {
                    const count = subMatches.length;
                    const durationPerNote = 1.0 / count; 
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
                currentTime++; 
                continue;
            }
            
            const notes = this.resolveNotes(token, track.definitions);
            if (notes.length > 0) {
                sequence.push({ time: currentTime, duration: 1, notes });
            }
            currentTime++;
        }

        const slotsPerBeat = grid * (4 / timeSig[1]);
        const barCount = (content.match(/\|/g) || []).length - 1;
        const expectedDurationInSlots = barCount > 0 ? barCount * (slotsPerBeat * timeSig[0]) : currentTime;
        pattern.duration = Math.max(pattern.duration, expectedDurationInSlots);

        return trackName; // Return original name for next line context
    }

    private parsePlaylistRow(line: string, track: ParsedTrack) {
        const trimmed = line.trim();
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

        const layerStrings: string[] = [];
        let currentLayerToken = '';
        let layerParenDepth = 0;
        for (const char of trimmed) {
            if (char === '(') layerParenDepth++;
            else if (char === ')') layerParenDepth--;

            if (char === ',' && layerParenDepth === 0) {
                if (currentLayerToken.trim()) layerStrings.push(currentLayerToken.trim());
                currentLayerToken = '';
            } else {
                currentLayerToken += char;
            }
        }
        if (currentLayerToken.trim()) layerStrings.push(currentLayerToken.trim());

        const layers: Layer[] = [];

        layerStrings.forEach(layerStr => {
            const chainStrings: string[] = [];
            let currentChainToken = '';
            let chainParenDepth = 0;
            for (const char of layerStr) {
                if (char === '(') chainParenDepth++;
                else if (char === ')') chainParenDepth--;

                if (char === '+' && chainParenDepth === 0) {
                    if (currentChainToken.trim()) chainStrings.push(currentChainToken.trim());
                    currentChainToken = '';
                } else {
                    currentChainToken += char;
                }
            }
            if (currentChainToken.trim()) chainStrings.push(currentChainToken.trim());
            
            const chain: ChainItem[] = [];

            chainStrings.forEach(itemStr => {
                const match = itemStr.match(/^([a-zA-Z0-9_]+)(?:\((.*)\))?$/);
                if (match) {
                    const patId = match[1];
                    let mods = this.parseModifiers(match[2] || '', track);
                    chain.push({ 
                        id: patId, 
                        transposition: mods.transpose,
                        volume: mods.volume
                    });
                }
            });
            if (chain.length > 0) layers.push({ items: chain });
        });
        if (layers.length > 0) track.playlist.push({ type: 'pattern', layers });
    }

    private parseEffectsArray(raw: string): EffectCommand[] {
        const clean = raw.replace(/[\[\]]/g, '');
        const items = clean.split(',').map(s => s.trim()).filter(Boolean);
        return items.map(item => {
            const code = item.charAt(0).toUpperCase();
            const valStr = item.substring(1);
            const val = parseInt(valStr);
            return { code, value: isNaN(val) ? 0 : val };
        });
    }

    private parseModifiers(raw: string, track: ParsedTrack): PatternModifier {
        const mods: PatternModifier = { transpose: 0, volume: 0, pan: 0 };
        const parts = raw.split(',').map(s => s.trim());
        
        parts.forEach(p => {
            if (/^[+-]?\d+$/.test(p)) {
                mods.transpose = parseInt(p);
                return;
            }
            const [key, val] = p.split(':').map(s => s.trim());
            
            if (key === 't') {
                mods.effects = this.parseEffectsArray(val);
                return;
            }

            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
                if (['v', 'vol'].includes(key)) mods.volume = numVal;
                if (['p', 'pan'].includes(key)) mods.pan = numVal;
                if (['t', 'trans'].includes(key)) mods.transpose += numVal;
                if (['o', 'oct'].includes(key)) {
                    const modeKey = Object.keys(MODES).find(k => k.toLowerCase() === track.config.scaleMode.toLowerCase()) || 'Major';
                    const intervals = MODES[modeKey];
                    mods.transpose += (numVal * intervals.length); 
                }
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
        // Updated regex handling to match constant if needed, but manual breakdown here is fine
        // as long as it parses the token extracted by TOKEN_REGEX
        const match = token.match(/^(\d+)(['#b%,]*)(?:\(([^)]*)\))?(?:\^\[(.*?)\])?$/);
        
        if (!match) return { degree: 1, octaveShift: 0, accidental: 0, isNatural: false };
        
        const degree = parseInt(match[1]);
        const mods = match[2];
        const propsRaw = match[3];
        const effectsRaw = match[4];
        
        let octaveShift = 0; let accidental = 0; let isNatural = false;
        for (const char of mods) {
            if (char === "'") octaveShift++;
            if (char === ',') octaveShift--;
            if (char === '#') accidental++;
            if (char === 'b') accidental--;
            if (char === '%') isNatural = true;
        }

        const noteDef: NoteDef = { degree, octaveShift, accidental, isNatural };
        
        if (propsRaw) {
            const parts = propsRaw.split(',');
            parts.forEach(p => {
                const [k, v] = p.split(':').map(s => s.trim());
                if (k === 'v' || k === 'vol') {
                    noteDef.volume = parseFloat(v);
                }
            });
        }

        if (effectsRaw) {
            noteDef.effects = this.parseEffectsArray(effectsRaw);
        }
        
        return noteDef;
    }
}