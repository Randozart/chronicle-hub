// src/engine/audio/linter.ts

import { AUDIO_PRESETS } from './presets';

export interface LintError {
    line: number;
    message: string;
    severity: 'error' | 'warning';
    context?: string;
}

const HEADER_REGEX = /^\[(.*?)\]$/;
const TOKEN_REGEX = /(\(.*?\)|@\w+(?:\(\s*[+-]?\d+\s*\))?|(\d+['#b%,]*(?:\([^)]*\))?(?:\^\[.*?\])?)|[-.|])/g;


export function lintLigature(source: string): LintError[] {
    const errors: LintError[] = [];
    const lines = source.split('\n');

    // Pass 1: Gather Definitions
    const definedInstruments = new Set<string>(Object.keys(AUDIO_PRESETS));
    const definedPatterns = new Set<string>();
    const definedChords = new Set<string>();
    
    let grid = 4;
    let timeSig = [4, 4];
    let currentSection = '';

    lines.forEach((line) => {
        const trimmed = line.split('//')[0].trim();
        if (!trimmed) return;
        const headerMatch = trimmed.match(HEADER_REGEX);
        if (headerMatch) {
            const headerContent = headerMatch[1].trim();
            const headerKey = headerContent.split(':')[0].toUpperCase();
            
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
        if (currentSection === 'INSTRUMENTS') {
            const parts = trimmed.split(':');
            if (parts.length >= 2) definedInstruments.add(parts[0].trim());
        } else if (currentSection === 'DEFINITIONS') {
            const match = trimmed.match(/^(@\w+)\s*=/);
            if (match) definedChords.add(match[1]);
        } else if (currentSection === 'CONFIG') {
            if (trimmed.toUpperCase().startsWith('GRID:')) grid = parseInt(trimmed.split(':')[1]) || 4;
            if (trimmed.toUpperCase().startsWith('TIME:')) {
                const parts = trimmed.split(':')[1].split('/');
                if(parts.length === 2) timeSig = [parseInt(parts[0]), parseInt(parts[1])];
            }
        }
    });

    // Pass 2: Validation
    const slotsPerBeat = grid * (4 / timeSig[1]);
    const expectedSlotsPerBar = slotsPerBeat * timeSig[0];
    currentSection = '';
    let currentPattern = '';

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.split('//')[0].trim();
        if (!trimmed) return;

        const headerMatch = trimmed.match(HEADER_REGEX);
        if (headerMatch) {
            const headerContent = headerMatch[1].trim();
            const headerKey = headerContent.split(':')[0].toUpperCase();
            if (['PATTERN', 'PAT', 'P'].includes(headerKey)) {
                currentSection = 'PATTERN';
                currentPattern = headerContent.split(':')[1]?.trim() || 'Unnamed';
                if (!currentPattern || currentPattern === 'Unnamed') errors.push({ line: lineNumber, message: "Pattern header missing name.", severity: 'error' });
            } else if (['PLAYLIST', 'PLAY', 'SEQ', 'LIST', 'L', 'TRACK', 'T'].includes(headerKey)) {
                currentSection = 'PLAYLIST';
            } else { currentSection = ''; }
            return;
        }

        if (currentSection === 'PATTERN') {
            if (trimmed.includes('|')) {
                const pipeIndex = trimmed.indexOf('|');
                const namePart = trimmed.substring(0, pipeIndex).trim();
                const contentPart = trimmed.substring(pipeIndex);

                // Matches the initial word, ignoring any subsequent (props) or ^[effects]
                const nameMatch = namePart.match(/^([a-zA-Z0-9_]+)/);
                const trackName = nameMatch ? nameMatch[1] : '';

                if (trackName && !definedInstruments.has(trackName)) {
                    errors.push({ 
                        line: lineNumber, 
                        message: `Unknown instrument '${trackName}'.`, 
                        severity: 'error',
                        context: currentPattern
                    });
                }

                const bars = contentPart.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
                bars.forEach((barStr, barIdx) => {
                    const tokens = barStr.match(TOKEN_REGEX) || [];
                    let slotCount = 0;
                    tokens.forEach(token => {
                        slotCount++;
                        if (token.startsWith('@')) {
                            const defName = token.match(/^(@\w+)/)?.[1];
                            if (defName && !definedChords.has(defName)) {
                                errors.push({ line: lineNumber, message: `Undefined chord '${defName}'.`, severity: 'error', context: currentPattern });
                            }
                        }
                    });
                    if (slotCount !== expectedSlotsPerBar && slotCount > 0) {
                         errors.push({ 
                            line: lineNumber, 
                            message: `Bar ${barIdx + 1} has ${slotCount} slots. Expected ${expectedSlotsPerBar}.`, 
                            severity: 'warning',
                            context: currentPattern
                        });
                    }
                });
            }
        }
        else if (currentSection === 'PLAYLIST') {
             if (trimmed.includes('=')) return; 
             const tokens: string[] = [];
             let currentToken = '';
             let depth = 0;
             for (let i = 0; i < trimmed.length; i++) {
                 const char = trimmed[i];
                 if (char === '(') depth++;
                 else if (char === ')') depth--;
                 if (depth === 0 && (char === ',' || char === '+')) {
                     if (currentToken.trim()) tokens.push(currentToken.trim());
                     currentToken = '';
                 } else {
                     currentToken += char;
                 }
             }
             if (currentToken.trim()) tokens.push(currentToken.trim());
             tokens.forEach(ref => {
                 const patName = ref.split('(')[0].trim();
                 if (patName.startsWith('REST_')) return;
                 if (!definedPatterns.has(patName)) {
                     errors.push({ line: lineNumber, message: `Pattern '${patName}' not found.`, severity: 'error' });
                 }
             });
        }
    });

    return errors;
}

type ScribeContext = 'effect' | 'text' | 'condition';

interface ScopeState {
    type: 'brace';
    hasSeenColon: boolean;
}

export function lintScribeScript(source: string, mode: ScribeContext): LintError[] {
    const errors: LintError[] = [];
    const lines = source.split('\n');

    let braceDepth = 0;
    let bracketDepth = 0;
    const scopeStack: ScopeState[] = []; // Track state of current brace scope

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1] || '';
            const prevChar = line[i - 1] || '';

            // 1. Bracket Tracking
            if (char === '{') {
                braceDepth++;
                scopeStack.push({ type: 'brace', hasSeenColon: false });
            } else if (char === '}') {
                braceDepth--;
                scopeStack.pop();
                if (braceDepth < 0) {
                    errors.push({ line: lineNumber, message: "Unexpected closing brace '}'.", severity: 'error' });
                    braceDepth = 0;
                }
            } else if (char === '[') {
                bracketDepth++;
            } else if (char === ']') {
                bracketDepth--;
                if (bracketDepth < 0) {
                    errors.push({ line: lineNumber, message: "Unexpected closing bracket ']'.", severity: 'error' });
                    bracketDepth = 0;
                }
            }

            // 2. Colon Tracking (for Conditional Effects)
            if (char === ':' && braceDepth > 0 && bracketDepth === 0) {
                if (scopeStack.length > 0) {
                    scopeStack[scopeStack.length - 1].hasSeenColon = true;
                }
            }

            // 3. Logic Checks
            if (char === '=' && nextChar !== '=' && prevChar !== '!' && prevChar !== '>' && prevChar !== '<' && prevChar !== '=') {
                
                // INSIDE LOGIC BLOCK
                if (braceDepth > 0 && bracketDepth === 0) {
                    const currentScope = scopeStack[scopeStack.length - 1];
                    
                    // --- FIX: Robust Alias/Definition Detection ---
                    // Look backwards from the '=' to find what variable we are assigning to.
                    // We grab the text before the '=', trim it, and get the last "word".
                    const textBefore = line.substring(0, i).trimEnd();
                    
                    // Split by characters that break a variable name (space, braces, parens, operators)
                    // We only care about the last token immediately preceding the '='
                    const lastToken = textBefore.split(/[^a-zA-Z0-9_$@#.]/).pop() || "";
                    
                    const isAliasDef = lastToken.startsWith('@');
                    const isWorldDef = lastToken.startsWith('#');
                    const isEffectInBranch = currentScope?.hasSeenColon;

                    // It is a valid assignment if:
                    // 1. It is an Alias definition (@var = ...)
                    // 2. It is a World definition (#var = ...)
                    // 3. We are in the "Result" branch of a conditional ( { cond : $var = 1 } )
                    const isAllowed = isEffectInBranch || isAliasDef || isWorldDef;

                    if (!isAllowed) {
                         errors.push({ 
                            line: lineNumber, 
                            message: "Ambiguous assignment '=' inside logic. Did you mean '=='?", 
                            severity: 'warning' 
                        });
                    }
                }
                
                // OUTSIDE LOGIC BLOCK (Condition Field)
                if (braceDepth === 0 && mode === 'condition') {
                     errors.push({ 
                        line: lineNumber, 
                        message: "Assignments '=' are not allowed in Condition fields. Use '==' for comparison.", 
                        severity: 'error' 
                    });
                }
            }
        }
    });

    if (braceDepth > 0) errors.push({ line: lines.length, message: "Unclosed logic block '{'.", severity: 'error' });
    if (bracketDepth > 0) errors.push({ line: lines.length, message: "Unclosed macro bracket '['.", severity: 'error' });

    return errors;
}