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

export function lintScribeScript(
    source: string, 
    mode: ScribeContext,
    definitions?: QualityDefinition[] 
): LintError[] {
    const errors: LintError[] = [];
    const lines = source.split('\n');

    let braceDepth = 0;
    let bracketDepth = 0;
    
    // Comment Tracking
    let commentDepth = 0; 

    const scopeStack: ScopeState[] = []; 

    const validIds = definitions ? new Set(definitions.map(d => d.id)) : null;
    const localVars = new Set<string>();

    // Pass 1: Detect Local Assignments (Global Source Scan)
    // FIX: Updated regex to handle metadata blocks [desc:...] between name and =
    const assignmentMatches = [...source.matchAll(/(?:^|[^@])([\$#])([a-zA-Z0-9_]+)(?:\[[\s\S]*?\])?\s*=/g)];
    for (const m of assignmentMatches) {
        localVars.add(m[2]);
    }
    // Detect Aliases (@var =)
    const aliasMatches = [...source.matchAll(/(@[a-zA-Z0-9_]+)\s*=/g)];
    for (const m of aliasMatches) {
        localVars.add(m[1].substring(1));
    }

    // Pass 2: Line-by-Line Validation
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        
        // 1. Variable Spell-Checking
        // Only check if we are NOT inside a multi-line comment block logic (handled roughly below)
        // Note: Ideally we'd strip comments before checking vars, but for now we rely on the character loop to track comment state
        // and only push errors if we determine we aren't in a comment. 
        // However, regex match happens on the whole line string. 
        // Simple Fix: Don't check vars on lines that start with // or appear to be inside a comment block?
        // Since comment blocks { // ... } are structural, it's safer to trust the character loop for everything.
        // BUT, `varMatches` logic below runs independently.
        // Let's rely on the fact that if a line is pure comment, we likely won't match much, or we accept minor noise.
        // Better: We will SKIP variable checking here and move it into the character loop? 
        // No, that's too complex for regex.
        // Compromise: We check vars, but we check if the line looks like a comment.
        
        if (validIds && commentDepth === 0 && !line.trim().startsWith('//')) {
            const varMatches = [...line.matchAll(/(?:^|[^@])([\$#])([a-zA-Z0-9_]+)/g)];
            for (const m of varMatches) {
                const varName = m[2];
                
                if (varName === 'level') continue;

                const isGlobal = validIds.has(varName);
                const isLocal = localVars.has(varName);
                
                if (!isGlobal && !isLocal) {
                    errors.push({
                        line: lineNumber,
                        message: `Unknown variable '${varName}'. Is it defined?`,
                        severity: 'warning'
                    });
                }
            }
        }

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1] || '';
            const prevChar = line[i - 1] || '';

            // 0. Comment Block Tracking
            // Start { //
            if (commentDepth === 0 && char === '{' && line.substr(i, 3) === '{//') {
                commentDepth = 1;
                // We don't skip i here because we still want to count the { for balance if needed? 
                // Actually, sanitization removes it. Linter must respect it.
                // If we enter comment mode, we effectively stop checking logic until we exit.
            }
            
            // If inside comment...
            if (commentDepth > 0) {
                if (char === '{') commentDepth++;
                else if (char === '}') commentDepth--;
                
                // While in comment, skip all other checks
                continue; 
            }

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

            // 2. Colon Tracking
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
                    const textBefore = line.substring(0, i).trimEnd();
                    const lastToken = textBefore.split(/[^a-zA-Z0-9_$@#.]/).pop() || "";
                    
                    const isAliasDef = lastToken.startsWith('@');
                    const isWorldDef = lastToken.startsWith('#');
                    const isVarDef = lastToken.startsWith('$'); // Fixed: Allow $var =
                    const isEffectInBranch = currentScope?.hasSeenColon;

                    const isAllowed = isEffectInBranch || isAliasDef || isWorldDef || isVarDef;

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