// src/engine/audio/linter.ts

import { AUDIO_PRESETS } from './presets';
import { QualityDefinition } from '@/engine/models';

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

export interface LintError {
    line: number;
    message: string;
    severity: 'error' | 'warning';
    context?: string;
}

interface ScopeState {
    type: 'brace';
    hasSeenColon: boolean;
}

export function lintScribeScript(
    source: string, 
    mode: ScribeContext,
    definitions?: QualityDefinition[] 
): LintError[] {
    const errors: LintError[] = [];
    const lines = source.split('\n');

    let braceDepth = 0;
    let bracketDepth = 0;
    let commentDepth = 0; // Tracks block comments { // ... } across lines

    const scopeStack: ScopeState[] = []; 

    const validIds = definitions ? new Set(definitions.map(d => d.id)) : null;
    const localVars = new Set<string>();

    // --- PASS 1: Discovery (Find local assignments) ---
    // We scan the whole text first to find variables defined locally (e.g. @alias = ...)
    lines.forEach(line => {
        // Regex to find @var =, $var =, #var = 
        const assignmentMatches = [...line.matchAll(/(?:^|[^@])([\$#@])([a-zA-Z0-9_]+)(?:\[[\s\S]*?\])?\s*=/g)];
        for (const m of assignmentMatches) {
            localVars.add(m[2]);
        }
    });

    // --- PASS 2: Validation ---
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // 1. Variable Spell-Checking
        // Only run if we are NOT inside a comment block and the line isn't a full comment
        if (validIds && commentDepth === 0 && !line.trim().startsWith('//')) {
            const varMatches = [...line.matchAll(/(?:^|[^@])([\$#])([a-zA-Z0-9_]+)/g)];
            for (const m of varMatches) {
                const varName = m[2];
                
                if (varName === 'level') continue; // Special property, ignore

                const isGlobal = validIds.has(varName);
                const isLocal = localVars.has(varName);
                
                // If it's neither global nor local, warn
                if (!isGlobal && !isLocal) {
                    errors.push({
                        line: lineNumber,
                        message: `Unknown variable '${varName}'. Is it defined?`,
                        severity: 'warning'
                    });
                }
            }
        }

        // 2. Structural Parsing (Char by Char)
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1] || '';
            const prevChar = line[i - 1] || '';

            // A. Comment Block Tracking: { //
            // Check for { followed immediately by //
            if (commentDepth === 0 && char === '{' && line.substr(i, 3) === '{//') {
                commentDepth = 1;
            }
            
            // If inside comment...
            if (commentDepth > 0) {
                if (char === '{') commentDepth++;
                else if (char === '}') commentDepth--;
                
                // While in comment, skip all other checks for this char
                continue; 
            }

            // B. Bracket Tracking
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

            // C. Colon Tracking (for Conditional branches)
            if (char === ':' && braceDepth > 0 && bracketDepth === 0) {
                if (scopeStack.length > 0) {
                    scopeStack[scopeStack.length - 1].hasSeenColon = true;
                }
            }

            // D. Logic Checks (Assignments)
            // Check for single '=' that isn't part of '==' '!=' '>=' '<='
            if (char === '=' && nextChar !== '=' && prevChar !== '!' && prevChar !== '>' && prevChar !== '<' && prevChar !== '=') {
                
                // CASE 1: Inside { ... }
                // Inside logic blocks, '=' is assignment. We want to check if assignment is valid here.
                if (braceDepth > 0 && bracketDepth === 0) {
                    const currentScope = scopeStack[scopeStack.length - 1];
                    
                    // Simple check: Assignments are only allowed in Effect Scope (after colon) 
                    // OR if defining an alias/variable at start of block.
                    
                    // Look backwards to see what's being assigned
                    const textBefore = line.substring(0, i).trimEnd();
                    const lastToken = textBefore.split(/[^a-zA-Z0-9_$@#.]/).pop() || "";
                    
                    const isAliasDef = lastToken.startsWith('@');
                    const isWorldDef = lastToken.startsWith('#');
                    const isVarDef = lastToken.startsWith('$'); // Allow $var = 5
                    const isEffectInBranch = currentScope?.hasSeenColon; // Allow { cond : $var = 5 }

                    const isAllowed = isEffectInBranch || isAliasDef || isWorldDef || isVarDef;

                    // If not allowed context, it might be a typo for '=='
                    if (!isAllowed) {
                         errors.push({ 
                            line: lineNumber, 
                            message: "Ambiguous assignment '=' inside logic. Did you mean '=='?", 
                            severity: 'warning' 
                        });
                    }
                }
                
                // CASE 2: Outside logic (Condition fields)
                // If we are in 'condition' mode and NOT inside any braces, '=' is almost certainly wrong.
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

