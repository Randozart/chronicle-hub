// src/engine/textProcessor.ts

import { PlayerQualities, QualityDefinition, QualityState, QualityType } from './models';
import { GameEngine } from './gameEngine';

export type EvaluationContext = 'TEXT' | 'LOGIC' | 'EFFECT';

export interface Token {
    type: string;
    value: string;
}

export interface EvaluationState {
    qualities: PlayerQualities;
    worldQualities: PlayerQualities;
    defs: Record<string, QualityDefinition>;
    aliases: Record<string, string | number>;
    self: { qid: string; state: QualityState } | null;
    resolutionRoll: number;
    engine?: GameEngine;
}

type MacroHandler = (args: string[], options: string[], state: EvaluationState) => any;

// --- TOKENIZER (LEXER) ---

const tokenSpecification: [string, RegExp][] = [
    // FIX 1: Capture Whitespace as a token, don't discard it immediately.
    // The parser will decide when to ignore it.
    ['WHITESPACE', /^\s+/], 
    ['COMMENT', /^\/\*[\s\S]*?\*\/|^\/\/.*/],
    ['LOGIC_BLOCK_START', /^\{/],
    ['LOGIC_BLOCK_END', /^\}/],
    ['PARAM_BLOCK_START', /^\[/],
    ['PARAM_BLOCK_END', /^\]/],
    ['GROUP_START', /^\(/],
    ['GROUP_END', /^\)/],
    ['MACRO', /^%[a-zA-Z_]+/],
    ['SELF_REF', /^\$\./],
    ['WORLD_VAR', /^#[a-zA-Z0-9_]+/],
    ['ALIAS', /^@[a-zA-Z0-9_]+/],
    ['VARIABLE', /^\$[a-zA-Z0-9_]+/],
    ['NUMBER', /^\d+(?:\.\d+)?/],
    ['DOT_ACCESSOR', /^\./],
    ['KEYWORD', /^\b(true|false|recur|unique|invert|first|last|all)\b/],
    ['CONDITIONAL', /^:/],
    ['ALTERNATOR', /^\|/],
    ['SEPARATOR', /^;/],
    ['LIST_SEPARATOR', /^,/],
    ['LOGICAL_OP', /^(&&|\|\|)/],
    ['COMPARISON_OP', /^(==|!=|>=|<=|>>|<<|><|<>|>|<)/],
    ['ASSIGNMENT_OP', /^(\+\+|--|\+=|-=|\*=|=)/],
    ['MATH_OP', /^[+\-\*\/~%]/],
    // FIX 2: Text regex is less aggressive, allowing some punctuation that isn't logic
    ['TEXT', /^[^@#$%\s{}()[\]:;,.<>=!&|~+-\/]+/] 
];

export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let remaining = input;

    while (remaining.length > 0) {
        let matched = false;
        for (const [type, regex] of tokenSpecification) {
            const match = remaining.match(regex);
            if (match) {
                // Keep whitespace tokens now
                if (type !== 'COMMENT') {
                    tokens.push({ type, value: match[0] });
                }
                remaining = remaining.substring(match[0].length);
                matched = true;
                break;
            }
        }
        if (!matched) {
            tokens.push({ type: 'TEXT', value: remaining[0] });
            remaining = remaining.substring(1);
        }
    }
    return tokens;
}

// ... (MACROS registry remains the same) ...
const MACROS: Record<string, MacroHandler> = {
    random: (args, opts, state) => {
        const chance = Number(args[0]);
        const invert = opts.includes('invert');
        if (isNaN(chance)) return false;
        const success = state.resolutionRoll < chance;
        return invert ? !success : success;
    },
    chance: (args, opts, state) => {
        const exprStr = args[0];
        let margin: number | undefined; 
        let minCap = 0, maxCap = 100, pivot = 60;
        opts.forEach((opt, idx) => {
            const [k, v] = opt.split(':').map(s => s.trim());
            const val = Number(v || k); 
            if (k === 'margin' || idx === 0) margin = val;
            else if (k === 'min' || idx === 1) minCap = val;
            else if (k === 'max' || idx === 2) maxCap = val;
            else if (k === 'pivot' || idx === 3) pivot = val;
        });
        return calculateChanceInternal(exprStr, state, margin, minCap, maxCap, pivot);
    },
    schedule: (args, opts, state) => state.engine?.queueUpdate('schedule', args[0], opts),
    reset: (args, opts, state) => state.engine?.queueUpdate('reset', args[0], opts),
    update: (args, opts, state) => state.engine?.queueUpdate('update', args[0], opts),
    cancel: (args, opts, state) => state.engine?.queueUpdate('cancel', args[0], opts),
    all: (args, opts, state) => ({ __batch_category: args[0] })
};

// --- EVALUATOR ---

export class ScribeParser {
    private tokens: Token[];
    private position: number = 0;
    private state: EvaluationState;

    constructor(tokens: Token[], state: EvaluationState) {
        this.tokens = tokens;
        this.state = state;
    }

    private peek(): Token | null { 
        // Skip whitespace when peeking for logic structure
        let p = this.position;
        while (this.tokens[p] && this.tokens[p].type === 'WHITESPACE') {
            p++;
        }
        return this.tokens[p] || null; 
    }

    private consume(): Token { 
        // Consume whitespace blindly if next token is whitespace
        while (this.tokens[this.position] && this.tokens[this.position].type === 'WHITESPACE') {
            this.position++;
        }
        return this.tokens[this.position++]; 
    }

    private match(type: string): Token | null { 
        if (this.peek()?.type === type) { return this.consume(); } 
        return null; 
    }

    // NEW: Special consumer for text content that preserves spaces
    private consumeAsText(): string {
        let text = "";
        // Consume raw tokens including whitespace until we hit a logic delimiter
        while (this.tokens[this.position]) {
            const t = this.tokens[this.position];
            // Stop at delimiters that signify flow control in the current context
            if (['ALTERNATOR', 'CONDITIONAL', 'LOGIC_BLOCK_END', 'SEPARATOR'].includes(t.type)) {
                break;
            }
            // Variables inside text need to be resolved? 
            // In `{ $q >= 5 : Text }`, "Text" might contain other variables.
            // But the tokenizer flattens the block.
            // If the block contains nested {}, the main `evaluateText` loop handled it.
            // So here we are just grabbing the literals.
            
            // However, we MUST process variables if they appear here, OR return them as text?
            // "He looks at you..." is just TEXT and WHITESPACE tokens.
            text += t.value;
            this.position++;
        }
        return text;
    }

    public evaluate(context: EvaluationContext): any {
        if (context === 'EFFECT') {
            this.evaluateEffectList();
            return;
        }
        return this.evaluateExpression();
    }

    // ... (Effect Parsing remains same) ...
    private evaluateEffectList(): void {
        this.evaluateSingleEffect();
        while(this.match('LIST_SEPARATOR')) {
            this.evaluateSingleEffect();
        }
    }
    private evaluateSingleEffect(): void {
        const token = this.peek();
        if (!token) return;
        if (token.type === 'MACRO') { this.evaluateTerm(); return; }

        let qid = "";
        let isAlias = false;
        let isWorld = false;
        let batchCategory: string | null = null;
        let meta: any = {};

        if (token.type === 'VARIABLE') { qid = this.consume().value.substring(1); } 
        else if (token.type === 'WORLD_VAR') { qid = this.consume().value.substring(1); isWorld = true; } 
        else if (token.type === 'ALIAS') { qid = this.consume().value.substring(1); isAlias = true; } 
        else if (token.type === 'MACRO' && token.value === '%all') {
             const res = this.evaluateTerm();
             if (res && res.__batch_category) { batchCategory = res.__batch_category; }
        } else {
            this.evaluateExpression(); return;
        }

        if (!isAlias && this.match('PARAM_BLOCK_START')) {
            meta = this.parseMetadata();
            this.match('PARAM_BLOCK_END');
        }

        const opToken = this.match('ASSIGNMENT_OP');
        if (opToken) {
            const op = opToken.value;
            let value: any = 1;
            if (op !== '++' && op !== '--') { value = this.evaluateExpression(); }

            if (isAlias) {
                if (op === '=') this.state.aliases[qid] = value;
                else if (typeof this.state.aliases[qid] === 'number') {
                    let current = Number(this.state.aliases[qid]);
                    if (op === '+=') current += Number(value);
                    if (op === '-=') current -= Number(value);
                    this.state.aliases[qid] = current;
                }
            } else if (batchCategory) {
                this.state.engine?.batchChangeQuality(batchCategory, op, value, meta);
            } else {
                const targetQid = isWorld ? `world.${qid}` : qid;
                this.state.engine?.changeQuality(targetQid, op, value, meta);
            }
        }
    }
    private parseMetadata(): any {
        const meta: any = {};
        let currentKey = "";
        let buffer = "";
        while (this.peek() && this.peek()?.type !== 'PARAM_BLOCK_END') {
            const t = this.consume();
            if (t.type === 'CONDITIONAL') { currentKey = buffer.trim(); buffer = ""; } 
            else if (t.type === 'LIST_SEPARATOR') { if (currentKey) meta[currentKey] = buffer.trim(); currentKey = ""; buffer = ""; } 
            else { buffer += t.value; }
        }
        if (currentKey) meta[currentKey] = buffer.trim();
        return meta;
    }

    // --- EXPRESSION HANDLING ---

    private evaluateExpression(): any {
        // NEW: Check for Assignment (Alias Declaration) first
        // Pattern: ALIAS + ASSIGNMENT_OP + Expression
        // We peek to see if it's an alias assignment
        const t1 = this.peek();
        if (t1?.type === 'ALIAS') {
            // We need to look ahead without consuming. 
            // Since our parser is simple, we check tokens[pos+1]
            const t2 = this.tokens[this.position + 1];
            if (t2?.type === 'ASSIGNMENT_OP' && t2.value === '=') {
                const aliasKey = this.consume().value.substring(1);
                this.consume(); // Eat '='
                const val = this.evaluateConditional(); // Evaluate the value
                
                // Perform Assignment
                this.state.aliases[aliasKey] = val;
                
                // Bible says: "Returns empty string"
                return "";
            }
        }

        return this.evaluateConditional();
    }

    private evaluateConditional(): any {
        // We need to peek ahead to see if this is "TEXT | TEXT" or "LOGIC | LOGIC".
        // Heuristic: Logic usually starts with vars/ops. Text starts with TEXT/WHITESPACE.
        // But since we are inside {}, it defaults to LOGIC context unless we are in the result part of a condition.
        
        // Structure: { $q > 5 : Result A | Result B }
        // 1. Evaluate first term ($q > 5)
        const firstBranch = this.evaluateLogicalOr();
        
        // 2. Check for Conditional ':'
        if (this.peek()?.type === 'CONDITIONAL') {
            this.consume(); // Eat :
            
            // If True -> Eval and Return the content until | or End
            // If False -> Skip until | or End
            
            const isTrue = this.toBoolean(firstBranch);
            
            if (isTrue) {
                // Consume and Return True Branch (Text mode!)
                const result = this.consumeAsText(); 
                // Skip the rest of the chain
                while (this.match('ALTERNATOR')) {
                    this.skipBranch();
                }
                return result.trim();
            } else {
                // Skip True Branch
                this.skipBranch();
                
                if (this.match('ALTERNATOR')) {
                    // Recurse for the "Else" part (which might be another condition)
                    return this.evaluateConditional();
                }
                return ""; // No else
            }
        }
        
        // If we get here, there was no ':', so it's { A | B } random choice
        // But we already evaluated 'A' as logic. 
        // If A was just text "Hello", evaluateLogicalOr returned "Hello".
        
        const branches = [firstBranch];
        while(this.match('ALTERNATOR')) {
            // For random choices, we assume they are text-like or simple logic
            // But wait, `evaluateLogicalOr` tries to do math. 
            // If the content is "Hello World", it fails math.
            // Random choice usually implies text content.
            // Let's use consumeAsText for the subsequent branches.
            branches.push(this.consumeAsText().trim());
        }
        
        if (branches.length > 1) {
            const randomIndex = Math.floor(Math.random() * branches.length);
            return branches[randomIndex];
        }

        return branches[0];
    }
    
    private skipBranch() {
        // Fast forward until | or } or end
        let balance = 0;
        while(this.tokens[this.position]) {
            const t = this.tokens[this.position];
            if (t.type === 'ALTERNATOR' && balance === 0) break;
            if (t.type === 'LOGIC_BLOCK_END' && balance === 0) break; // Don't consume the end brace of parent
            
            // Nested blocks might confuse things, but token stream flattens them? 
            // No, findBlock extracts inner. This parser only sees current level.
            this.position++;
        }
    }

    private evaluateLogicalOr(): any { 
        let left = this.evaluateLogicalAnd(); 
        while (this.peek()?.value === '||') { this.consume(); let right = this.evaluateLogicalAnd(); left = this.toBoolean(left) || this.toBoolean(right); } 
        return left; 
    }

    private evaluateLogicalAnd(): any { let left = this.evaluateComparison(); while (this.peek()?.value === '&&') { this.consume(); let right = this.evaluateComparison(); left = this.toBoolean(left) && this.toBoolean(right); } return left; }

    private evaluateComparison(): any {
        let left = this.evaluateTerm();
        const opToken = this.match('COMPARISON_OP');
        if(opToken) {
            const right = this.evaluateTerm();
            
            // --- NEW: Challenge Shorthand with Arguments ---
            if (['>>', '<<', '><', '<>'].includes(opToken.value)) {
                
                let expr = `${left} ${opToken.value} ${right}`;
                let margin: number | undefined;
                let minCap = 0, maxCap = 100, pivot = 60;

                // Check for arguments separator ';'
                if (this.match('SEPARATOR')) {
                    const args: string[] = [];
                    let buffer = "";
                    
                    // Safe loop
                    let t = this.peek();
                    while (t) {
                        if (t.type === 'LOGIC_BLOCK_END' || t.type === 'ALTERNATOR' || t.type === 'CONDITIONAL') {
                            break; 
                        }
                        
                        this.consume(); // Eat token
                        
                        if (t.type === 'LIST_SEPARATOR') {
                            if (buffer.trim()) args.push(buffer.trim());
                            buffer = "";
                        } else {
                            buffer += t.value;
                        }

                        t = this.peek(); // Update for next iteration
                    }
                    if (buffer.trim()) args.push(buffer.trim());

                    // Parse the arguments
                    args.forEach((opt, idx) => {
                        const [k, v] = opt.split(':').map(s => s.trim());
                        const val = Number(v || k);
                        
                        if (k === 'margin' || idx === 0) margin = val;
                        else if (k === 'min' || idx === 1) minCap = val;
                        else if (k === 'max' || idx === 2) maxCap = val;
                        else if (k === 'pivot' || idx === 3) pivot = val;
                    });
                }
                
                return calculateChanceInternal(expr, this.state, margin, minCap, maxCap, pivot);
            }
            // -----------------------------------------------

            const lVal = this.toNumber(left);
            const rVal = this.toNumber(right);
            if (isNaN(lVal) || isNaN(rVal)) {
                if(opToken.value === '==') return String(left) == String(right);
                if(opToken.value === '!=') return String(left) != String(right);
                return false;
            }
            switch (opToken.value) {
                case '>':  return lVal > rVal; case '<':  return lVal < rVal; case '>=': return lVal >= rVal; case '<=': return lVal <= rVal;
                case '==': return lVal == rVal; case '!=': return lVal != rVal;
            }
        }
        return left;
    }

    private evaluateTerm(): any {
        const token = this.peek();
        if(!token) return "";

        if (this.match('GROUP_START')) { const result = this.evaluateExpression(); this.match('GROUP_END'); return result; }
        
        // Handle TEXT tokens that appeared in logic (e.g. "Hello" inside { A | "Hello" })
        if (token.type === 'TEXT' || token.type === 'WHITESPACE') {
            return this.consumeAsText().trim();
        }

        if (token.type === 'NUMBER') {
            const num = this.consume();
            if (this.peek()?.type === 'MATH_OP' && this.peek()?.value === '~') {
                this.consume(); const maxToken = this.match('NUMBER'); const min = Number(num.value); const max = maxToken ? Number(maxToken.value) : min;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            if (this.peek()?.type === 'MATH_OP' && this.peek()?.value === '%') {
                this.consume();
                return this.state.resolutionRoll < Number(num.value);
            }
            return Number(num.value);
        }

        if (token.type === 'MACRO') {
            // ... (Macro parsing logic unchanged) ...
             const m = this.consume();
            const name = m.value.substring(1);
            let args: string[] = [];
            let opts: string[] = [];
            
            if (this.match('PARAM_BLOCK_START')) {
                let buffer = "";
                let inOpts = false;
                let balance = 1; 
                while(this.peek() && balance > 0) {
                    const t = this.peek(); 
                    if(t?.type === 'PARAM_BLOCK_START') balance++;
                    if(t?.type === 'PARAM_BLOCK_END') balance--;
                    if (balance === 0) { this.consume(); break; }
                    this.consume(); 
                    if (balance === 1 && t?.type === 'LIST_SEPARATOR') { if(inOpts) opts.push(buffer.trim()); else args.push(buffer.trim()); buffer = ""; }
                    else if (balance === 1 && t?.type === 'SEPARATOR') { if(buffer.trim()) args.push(buffer.trim()); buffer = ""; inOpts = true; }
                    else { buffer += t?.value || ""; }
                }
                if(buffer.trim()) { if(inOpts) opts.push(buffer.trim()); else args.push(buffer.trim()); }
            }
            const handler = MACROS[name];
            if (handler) return handler(args, opts, this.state);
            return `[Unknown Macro: ${name}]`;
        }

        if (['VARIABLE', 'WORLD_VAR', 'ALIAS', 'SELF_REF'].includes(token.type)) { return this.resolveVariable(); }
        
        return this.consume().value;
    }

    private resolveVariable(): string | number {
        const token = this.consume();
        let qid: string | undefined;
        let targetState = this.state.qualities;

        // 1. Resolve Sigil
        if (token.type === 'VARIABLE') qid = token.value.substring(1);
        else if (token.type === 'WORLD_VAR') { qid = token.value.substring(1); targetState = this.state.worldQualities; }
        else if (token.type === 'ALIAS') {
            const aliasKey = token.value.substring(1);
            return this.state.aliases[aliasKey] ?? 0;
        }
        else if (token.type === 'SELF_REF') qid = this.state.self?.qid;

        if (!qid) return `[Unknown: ${token.value}]`;

        const def = this.state.defs[qid];
        if (!def) return `[Missing Def: ${qid}]`;

        let qState = targetState[qid] || (this.state.self?.qid === qid ? this.state.self.state : undefined);
        if (!qState) qState = { qualityId: qid, type: def.type, level: 0, stringValue: "", changePoints: 0, sources: [], customProperties: {} } as any;

        // 2. Level Spoofing: $var[10]
        if (this.match('PARAM_BLOCK_START')) {
            const spoofExpr = this.evaluateExpression();
            const spoofVal = this.toNumber(spoofExpr);
            this.match('PARAM_BLOCK_END');
            if (!isNaN(spoofVal)) {
                qState = { ...qState, level: spoofVal } as QualityState;
            }
        }

        let currentVal: any = qState;
        
        // 3. Properties
        while(this.match('DOT_ACCESSOR')) {
            const propToken = this.consume();
            const prop = propToken.value;
            
            // Formatters
            if (['capital', 'upper', 'lower'].includes(prop)) {
                 let s = String(currentVal);
                 if (prop === 'capital') s = s.charAt(0).toUpperCase() + s.slice(1);
                 else if (prop === 'upper') s = s.toUpperCase();
                 else if (prop === 'lower') s = s.toLowerCase();
                 currentVal = s;
                 continue;
            }
            
            // Ensure we are looking at a quality definition for these properties
            // (If we are deep in an object, these might not apply, but for v6 flat qualities they do)
            
            if (prop === 'plural' || prop === 'singular') {
                const level = (currentVal.level ?? 1);
                const isPlural = (prop === 'plural' && level !== 1) || (prop === 'singular' && level === 1);
                currentVal = isPlural ? (def.plural_name || def.name) : (def.singular_name || def.name);
            } 
            else if (def.text_variants && def.text_variants[prop] !== undefined) {
                 currentVal = evaluateText(def.text_variants[prop], this.state.qualities, this.state.defs, { qid: qid!, state: qState! }, this.state.resolutionRoll, this.state.engine);
            } 
            else if (prop === 'name') {
                currentVal = def.name;
            } 
            else if (prop === 'description') {
                currentVal = def.description;
            }
            // NEW: Item Source (Bible Feature)
            else if (prop === 'source') {
                 const sources = (qState as any).sources as string[] || [];
                 // Return the OLDEST source (Index 0), matching the pruning direction
                 currentVal = sources.length > 0 ? sources[0] : "found";
            }
            // NEW: Custom Properties (Bible Feature)
            else if (qState?.customProperties && qState.customProperties[prop] !== undefined) {
                 currentVal = qState.customProperties[prop];
            }
            // Fallback: Check direct property
            else {
                 currentVal = (qState as any)[prop] ?? (def as any)[prop];
            }
        }
        
        if (typeof currentVal === 'object' && currentVal !== null) {
            return currentVal.type === QualityType.String ? currentVal.stringValue : (currentVal.level ?? 0);
        }
        return currentVal?.toString() || "";
    }
    private toBoolean(val: any): boolean { 
        if (val === "__FALSE_BRANCH__") return false;
        if (typeof val === 'boolean') return val; 
        if (typeof val === 'number') return val !== 0; 
        if (typeof val === 'string') return val.toLowerCase() === 'true' || val.length > 0; 
        return false; 
    }
    private toNumber(val: any): number { if(typeof val === 'number') return val; if(typeof val === 'string') return parseFloat(val); return val ? 1 : 0; }
}

// ... (Helpers and Public API remain the same) ...
// (calculateChanceInternal, evaluateText, evaluateCondition, getChallengeDetails)

// Ensure to export everything needed
function calculateChanceInternal(expr: string, state: EvaluationState, margin?: number, min?: number, max?: number, pivot?: number): number {
    const match = expr.match(/(.*?)\s*(>>|<<|><|<>)\s*(.*)/);
    if (!match) return 0;
    const p = new ScribeParser(tokenize(match[1]), state);
    const skill = Number(p.evaluate('LOGIC'));
    const p2 = new ScribeParser(tokenize(match[3]), state);
    const target = Number(p2.evaluate('LOGIC'));
    const op = match[2];
    const _margin = margin ?? target; 
    const _min = min ?? 0;
    const _max = max ?? 100;
    const _pivot = (pivot ?? 60) / 100;
    let chance = 0;
    if (op === '>>') { 
        const lower = target - _margin;
        const upper = target + _margin;
        if (skill <= lower) chance = 0; else if (skill >= upper) chance = 1;
        else if (skill < target) chance = ((skill - lower) / _margin) * _pivot;
        else chance = _pivot + ((skill - target) / _margin) * (1 - _pivot);
    } else if (op === '<<') {
        const lower = target - _margin;
        if (skill <= lower) chance = 1; else if (skill >= target + _margin) chance = 0;
        else if (skill < target) chance = 1 - (((skill - lower) / _margin) * (1 - _pivot));
        else chance = _pivot * (1 - ((skill - target) / _margin));
    } else { 
        const dist = Math.abs(skill - target);
        if (dist >= _margin) chance = 0; else chance = 1.0 - (dist / _margin);
        if (op === '<>') chance = 1.0 - chance; 
    }
    let pct = chance * 100;
    const final = Math.max(_min, Math.min(_max, pct));
    return isNaN(final) ? 0 : Math.round(final); // Safety check
}

export function evaluateText(raw: string | undefined, quals: PlayerQualities, defs: Record<string, QualityDefinition>, self: any, roll: number, engine?: GameEngine): string {
    if (!raw) return '';
    const state: EvaluationState = { qualities: quals, worldQualities: engine?.getWorldQualities() || {}, defs, aliases: {}, self, resolutionRoll: roll, engine };
    let result = '';
    const tokens = tokenize(raw);
    let i = 0;
    while(i < tokens.length) {
        if(tokens[i].type === 'LOGIC_BLOCK_START') {
            let balance = 1;
            let j = i + 1;
            while(j < tokens.length && balance > 0) {
                if (tokens[j].type === 'LOGIC_BLOCK_START') balance++;
                if (tokens[j].type === 'LOGIC_BLOCK_END') balance--;
                j++;
            }
            const blockTokens = tokens.slice(i+1, j-1);
            const p = new ScribeParser(blockTokens, state);
            result += String(p.evaluate('LOGIC'));
            i = j;
        } else {
            result += tokens[i].value;
            i++;
        }
    }
    return result;
}

export function evaluateCondition(expr: string | undefined, quals: PlayerQualities, defs: Record<string, QualityDefinition>, aliases: any, self: any, roll: number, engine?: GameEngine): boolean {
    if (!expr || !expr.trim()) return true;
    const state: EvaluationState = { qualities: quals, worldQualities: engine?.getWorldQualities() || {}, defs, aliases, self, resolutionRoll: roll, engine };
    const p = new ScribeParser(tokenize(expr), state);
    const res = p.evaluate('LOGIC');
    if (typeof res === 'boolean') return res;
    if (typeof res === 'number') return res > 0;
    if (typeof res === 'string') return res.toLowerCase() === 'true' || res.length > 0;
    return false;
}

export function getChallengeDetails(str: string | undefined, quals: PlayerQualities, defs: Record<string, QualityDefinition>): { chance: number | null, text: string } {
    if (!str) return { chance: null, text: '' };
    const state: EvaluationState = { qualities: quals, worldQualities: {}, defs, aliases: {}, self: null, resolutionRoll: 0 };
    const cleanStr = str.startsWith('{') && str.endsWith('}') ? str.slice(1, -1) : str;
    const p = new ScribeParser(tokenize(cleanStr), state);
    const val = p.evaluate('LOGIC');
    // FIX: Explicit null check
    let chance: number | null = isNaN(Number(val)) ? null : Number(val);
    if (chance !== null) { chance = Math.max(0, Math.min(100, chance)); }

    let text = "Challenge";
    const match = str.match(/\$([a-zA-Z0-9_]+)/);
    if(match) {
        const id = match[1];
        text = defs[id]?.name || id;
        if (text.includes('{') || text.includes('$')) { text = evaluateText(text, quals, defs, null, 0); }
    }
    return { chance, text: `Test: ${text}` };
}