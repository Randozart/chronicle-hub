// src/engine/audio/linter.ts

import { AUDIO_PRESETS } from './presets';

export interface LintError {
    line: number;
    message: string;
    severity: 'error' | 'warning';
    context?: string; // e.g. "Pattern: Intro"
}

// Regex helpers matching the Parser
const HEADER_REGEX = /^\[(.*?)\]$/;
const TOKEN_REGEX = /(\(.*?\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|\d+['#b%,]*|[-.|])/g;

export function lintLigature(source: string): LintError[] {
    const errors: LintError[] = [];
    const lines = source.split('\n');

    // 1. First Pass: Gathering Definitions
    // We need to know what exists before we can validate references.
    const definedInstruments = new Set<string>(Object.keys(AUDIO_PRESETS)); // Start with presets
    const definedPatterns = new Set<string>();
    const definedChords = new Set<string>();
    
    // Config State
    let grid = 4;
    let timeSig = [4, 4];
    
    // Scan context
    let currentSection = '';

    lines.forEach((line, index) => {
        const trimmed = line.split('//')[0].trim();
        if (!trimmed) return;

        const headerMatch = trimmed.match(HEADER_REGEX);
        if (headerMatch) {
            const headerContent = headerMatch[1].trim();
            const headerKey = headerContent.split(':')[0].toUpperCase();
            
            // Normalize Section Name
            if (['CONFIG', 'CFG', 'CONF', 'C'].includes(headerKey)) currentSection = 'CONFIG';
            else if (['INSTRUMENTS', 'INST', 'INS', 'I'].includes(headerKey)) currentSection = 'INSTRUMENTS';
            else if (['DEFINITIONS', 'DEF', 'DEFS', 'D'].includes(headerKey)) currentSection = 'DEFINITIONS';
            else if (['PLAYLIST', 'PLAY', 'SEQ', 'LIST', 'L', 'TRACK', 'T'].includes(headerKey)) currentSection = 'PLAYLIST';
            else if (['PATTERN', 'PAT', 'P'].includes(headerKey)) {
                currentSection = 'PATTERN';
                const patName = headerContent.split(':')[1]?.trim();
                if (patName) definedPatterns.add(patName);
            }
            return;
        }

        // Gather Definitions
        if (currentSection === 'INSTRUMENTS') {
            const parts = trimmed.split(':');
            if (parts.length >= 2) {
                definedInstruments.add(parts[0].trim());
            }
        }
        else if (currentSection === 'DEFINITIONS') {
            const match = trimmed.match(/^(@\w+)\s*=/);
            if (match) definedChords.add(match[1]);
        }
        else if (currentSection === 'CONFIG') {
            // We need Grid/Time for the second pass
            if (trimmed.startsWith('Grid:')) grid = parseInt(trimmed.split(':')[1]) || 4;
            if (trimmed.startsWith('Time:')) {
                const parts = trimmed.split(':')[1].split('/');
                if(parts.length === 2) timeSig = [parseInt(parts[0]), parseInt(parts[1])];
            }
        }
    });

    // 2. Second Pass: Validation
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const expectedSlotsPerBar = slotsPerBeat * timeSig[0];

    currentSection = '';
    let currentPattern = '';

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.split('//')[0].trim();
        if (!trimmed) return;

        // Header Check
        const headerMatch = trimmed.match(HEADER_REGEX);
        if (headerMatch) {
            const headerContent = headerMatch[1].trim();
            const headerKey = headerContent.split(':')[0].toUpperCase();
            
            if (['PATTERN', 'PAT', 'P'].includes(headerKey)) {
                currentSection = 'PATTERN';
                currentPattern = headerContent.split(':')[1]?.trim() || 'Unnamed';
                if (!currentPattern || currentPattern === 'Unnamed') {
                    errors.push({ line: lineNumber, message: "Pattern header missing name.", severity: 'error' });
                }
            } else if (['CONFIG', 'CFG', 'CONF', 'C', 'INSTRUMENTS', 'INST', 'INS', 'I', 'DEFINITIONS', 'DEF', 'DEFS', 'D', 'PLAYLIST', 'PLAY', 'SEQ', 'LIST', 'L', 'TRACK', 'T'].includes(headerKey)) {
                currentSection = headerKey; // Simplified for loose matching
            } else {
                 // Unknown header warning? maybe too strict.
            }
            return;
        }

        // Logic Block Check (Loose check for ScribeScript syntax)
        if (trimmed.includes('{') && trimmed.includes('}')) {
             // We assume ScribeScript is valid, or handled by a different system
             return;
        }

        // --- SECTION SPECIFIC VALIDATION ---

        if (currentSection === 'PATTERN') {
            // Check Pattern Rows
            if (trimmed.includes('|')) {
                const pipeIndex = trimmed.indexOf('|');
                const namePart = trimmed.substring(0, pipeIndex).trim();
                const contentPart = trimmed.substring(pipeIndex);

                // 1. Validate Instrument Reference
                let trackName = namePart;
                // Handle modifiers: "Bass(v:1)"
                const modMatch = namePart.match(/^([a-zA-Z0-9_]+)\s*(?:\(.*\))?$/);
                if (modMatch) trackName = modMatch[1];

                if (trackName && !definedInstruments.has(trackName)) {
                    // It might be a "Stacked" row (empty name), which implies previous instrument.
                    // If it has a name and it's unknown, that's an error.
                    errors.push({ 
                        line: lineNumber, 
                        message: `Unknown instrument '${trackName}'. Define it in [INSTRUMENTS].`, 
                        severity: 'error',
                        context: currentPattern
                    });
                }

                // 2. Validate Bar Lengths
                // Split by pipe, ignore first/last empty elements
                const bars = contentPart.split('|');
                // Remove empty strings resulting from split (usually index 0 if line starts with |)
                const barContents = bars.slice(1, bars.length - 1); 

                barContents.forEach((barStr, barIdx) => {
                    const tokens = barStr.match(TOKEN_REGEX) || [];
                    let slotCount = 0;
                    
                    tokens.forEach(token => {
                        // Tuplets count as 1 slot in V2
                        // Notes, Rests, Sustains count as 1 slot
                        slotCount++;
                        
                        // Check for unknown definition usage inside pattern
                        if (token.startsWith('@')) {
                            const defName = token.match(/^(@\w+)/)?.[1];
                            if (defName && !definedChords.has(defName)) {
                                errors.push({
                                    line: lineNumber,
                                    message: `Undefined chord/macro '${defName}'.`,
                                    severity: 'error',
                                    context: currentPattern
                                });
                            }
                        }
                    });

                    if (slotCount !== expectedSlotsPerBar && slotCount > 0) {
                         errors.push({ 
                            line: lineNumber, 
                            message: `Bar ${barIdx + 1} has ${slotCount} slots. Expected ${expectedSlotsPerBar} (Grid ${grid} * ${timeSig[0]} beats).`, 
                            severity: 'warning',
                            context: currentPattern
                        });
                    }
                });
            }
        }
        else if (currentSection === 'PLAYLIST') {
             if (trimmed.includes('=')) return; 
             
             // FIX: Smart Tokenizer for Playlist Rows
             // We cannot just split by comma or plus because they might be inside modifiers (+12).
             const tokens: string[] = [];
             let currentToken = '';
             let depth = 0;

             for (let i = 0; i < trimmed.length; i++) {
                 const char = trimmed[i];
                 
                 if (char === '(') depth++;
                 else if (char === ')') depth--;

                 // Only split on separator if we are at depth 0 (outside parens)
                 if (depth === 0 && (char === ',' || char === '+')) {
                     if (currentToken.trim()) tokens.push(currentToken.trim());
                     currentToken = '';
                 } else {
                     currentToken += char;
                 }
             }
             if (currentToken.trim()) tokens.push(currentToken.trim());

             tokens.forEach(ref => {
                 // Strip modifiers: "Pattern(v:10)" -> "Pattern"
                 // "Pattern(+12)" -> "Pattern"
                 const patName = ref.split('(')[0].trim();
                 
                 if (patName.startsWith('REST_')) return;
                 if (!definedPatterns.has(patName)) {
                     errors.push({ 
                        line: lineNumber, 
                        message: `Pattern '${patName}' not found.`, 
                        severity: 'error' 
                    });
                 }
             });
        }
    });

    return errors;
}