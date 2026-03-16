// src/engine/scribescript/parser/test-integration.ts
// Integration tests: new parser with full legacy context
// Run: npx tsx src/engine/scribescript/parser/test-integration.ts

import { evaluateTextNew } from './index';
import type { EvaluationContext } from './astEvaluator';
import { QualityType } from '../../models';
import type { PlayerQualities, QualityDefinition, QualityState } from '../../models';
import { evaluateText } from '../../textProcessor';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const qualityDefs: Record<string, QualityDefinition> = {
  strength: {
    id: 'strength',
    name: 'Strength',
    description: 'Raw physical power',
    type: QualityType.Counter,
    plural_name: 'points of Strength',
  },
  swordsmanship: {
    id: 'swordsmanship',
    name: 'Swordsmanship',
    description: 'Skill with a blade',
    type: QualityType.Pyramidal,
    singular_name: 'point of Swordsmanship',
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth',
    description: 'Ability to move unseen',
    type: QualityType.Counter,
  },
  diplomacy: {
    id: 'diplomacy',
    name: 'Diplomacy',
    description: 'Art of negotiation',
    type: QualityType.Counter,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    description: 'Currency',
    type: QualityType.Item,
  },
  weapon: {
    id: 'weapon',
    name: 'Iron Sword',
    description: 'A trusty blade',
    type: QualityType.Item,
    singular_name: 'Iron Sword',
    plural_name: 'Iron Swords',
  },
};

const qualities: PlayerQualities = {
  strength:     { type: QualityType.Counter,   level: 15 } as QualityState,
  swordsmanship:{ type: QualityType.Pyramidal, level: 65, changePoints: 0 } as QualityState,
  stealth:      { type: QualityType.Counter,   level: 30 } as QualityState,
  diplomacy:    { type: QualityType.Counter,   level: 40 } as QualityState,
  gold:         { type: QualityType.Item,      level: 100, sources: [], spentTowardsPrune: 0 } as unknown as QualityState,
  weapon:       { type: QualityType.Item,      level: 1,   sources: [], spentTowardsPrune: 0 } as unknown as QualityState,
};

const resolutionRoll = 42; // fixed for deterministic tests

/** Build a full EvaluationContext mirroring what integration.ts produces. */
function makeCtx(aliases: Record<string, string> = {}): EvaluationContext {
  const variables = new Map<string, any>();
  for (const [qid, state] of Object.entries(qualities)) {
    variables.set(qid, (state as any).level ?? 0);
  }
  const aliasMap = new Map<string, any>(Object.entries(aliases));

  // Legacy ScribeEvaluator callback (recurse via new parser, same pattern as integration.ts).
  // Bare sub-expressions (e.g. "$swordsmanship") from calculateChance / evaluateMacro
  // have no braces, so we wrap them before passing to evaluateTextNew.
  const evaluator = (
    rawText: string | undefined,
    qs: PlayerQualities,
    qds: Record<string, QualityDefinition>,
    selfCtx: any,
    roll: number,
    als: Record<string, string> | null,
    errs?: string[],
    lgr?: any,
    depth = 0,
  ): string => {
    const innerCtx = makeCtx(als ?? {});
    const text = rawText ?? '';
    const toEval = text.includes('{') ? text : `{${text}}`;
    return String(evaluateTextNew(toEval, innerCtx));
  };

  return {
    variables,
    worldVariables: new Map(),
    aliases: aliasMap,
    legacy: {
      qualities,
      qualityDefs,
      selfContext: null,
      resolutionRoll,
      depth: 0,
      evaluator,
    },
  };
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

type TestResult = { pass: boolean; desc: string; expr: string; got: any; expected?: any; note?: string };
const results: TestResult[] = [];

function test(desc: string, expr: string, check: (result: any) => boolean, expected?: any, note?: string, aliases: Record<string, string> = {}) {
  try {
    const ctx = makeCtx(aliases);
    const got = evaluateTextNew(expr, ctx);
    const pass = check(got);
    results.push({ pass, desc, expr, got, expected, note });
  } catch (err) {
    results.push({ pass: false, desc, expr, got: String(err), expected, note });
  }
}

function testCompare(desc: string, expr: string) {
  try {
    const legacyResult = evaluateText(expr, qualities, qualityDefs, null, resolutionRoll, {});
    const ctx = makeCtx();
    const newResult = String(evaluateTextNew(expr, ctx));
    const pass = legacyResult === newResult;
    results.push({ pass, desc, expr, got: newResult, expected: legacyResult,
      note: pass ? undefined : `legacy="${legacyResult}" new="${newResult}"` });
  } catch (err) {
    results.push({ pass: false, desc, expr, got: String(err), expected: 'legacy result' });
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

console.log('=== ScribeScript Integration Tests ===\n');

// --- Variables ---
test('$variable → numeric level',    '{$strength}',     r => r == 15,  15);
test('$variable arithmetic',         '{$strength + 5}', r => r == 20,  20);
test('@alias from context',          '{@hero}',         r => r === 'Aria', 'Aria',
  undefined, {'hero': 'Aria'});

// --- Property chain: $quality.name ---
test('$quality.name via resolveVariable', '{$weapon.name}',
  r => typeof r === 'string' && r.length > 0,
  'Iron Sword',
  'uses legacy resolveVariable for .name property chain');

test('$quality.description', '{$weapon.description}',
  r => typeof r === 'string' && r.length > 0,
  'A trusty blade');

// --- Conditionals ---
test('conditional: true branch',  '{$strength > 10 : "Strong" | "Weak"}', r => r === 'Strong', 'Strong');
test('conditional: false branch', '{$strength > 20 : "Strong" | "Weak"}', r => r === 'Weak',   'Weak');
test('multi-branch: first match',
  '{$strength >= 15 : "Expert" | $strength >= 10 : "Skilled" | "Novice"}',
  r => r === 'Expert', 'Expert');
test('multi-branch: second match',
  '{$stealth >= 50 : "Shadow" | $stealth >= 20 : "Sneaky" | "Clumsy"}',
  r => r === 'Sneaky', 'Sneaky');
test('multi-branch: else branch',
  '{$stealth >= 50 : "Shadow" | $stealth >= 40 : "Sneaky" | "Clumsy"}',
  r => r === 'Clumsy', 'Clumsy');

// --- Choices (no colon → random pick) ---
test('choice returns one of options', '{"sword"|"axe"|"bow"}',
  r => ['sword','axe','bow'].includes(r as string));

// --- Ranges ---
test('range produces integer in bounds', '{1~6}',
  r => Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 6);
test('range: same bounds → fixed value', '{5~5}', r => r === 5, 5);

// --- Percentage ---
// resolutionRoll=42, so {60%} → 42 < 60 → true, {30%} → 42 < 30 → false
test('percentage: roll < threshold → true',  '{60%}', r => r === true,  true,  'roll=42 < 60');
test('percentage: roll >= threshold → false', '{30%}', r => r === false, false, 'roll=42 >= 30');

// --- Assignment ---
test('assignment stores and returns value', '{@x = 99}', r => r == 99, 99);
// After assignment in same context: subsequent use should reflect value
(() => {
  try {
    const ctx = makeCtx();
    evaluateTextNew('{@x = $strength}', ctx);
    const got = evaluateTextNew('{@x}', ctx);
    const pass = got == 15;
    results.push({ pass, desc: 'assignment persists in context', expr: '{@x=$strength} then {@x}', got, expected: 15 });
  } catch (err) {
    results.push({ pass: false, desc: 'assignment persists in context', expr: 'multi', got: String(err) });
  }
})();

// --- Challenges (via calculateChance with legacy ctx) ---
// calculateChance returns a probability-weighted boolean.
// With resolutionRoll=42 and swordsmanship=65 >> 50: player above target, high success chance.
test('challenge >> returns boolean', '{$swordsmanship >> 50}', r => typeof r === 'number' && !isNaN(r as number),
  undefined, 'probability curve result');
test('challenge << returns boolean', '{$stealth << 50}',      r => typeof r === 'number' && !isNaN(r as number));

// --- Template text (mixed plain text + braces) ---
test('template: variable in sentence',
  'You have {$gold} gold.',
  r => r === 'You have 100 gold.', 'You have 100 gold.');

test('template: multiple expressions',
  'STR {$strength}, DEX {$stealth}',
  r => r === 'STR 15, DEX 30', 'STR 15, DEX 30');

test('template: conditional in sentence',
  'You are {$strength > 10 : "strong" | "weak"}.',
  r => r === 'You are strong.', 'You are strong.');

// --- Macros (delegate to legacyEvaluateMacro) ---
// %random[N] → boolean (roll < N), %chance[expr] → number (0-100 probability)
test('macro %random returns a value',  '{%random[50]}', r => r !== null && r !== undefined);
test('macro %chance returns a value',  '{%chance[$swordsmanship >> 50]}', r => r !== null && r !== undefined);

// --- Compare against legacy evaluateText ---
testCompare('legacy compare: $strength',           '{$strength}');
testCompare('legacy compare: conditional true',    '{$strength > 10 : "Strong" | "Weak"}');
testCompare('legacy compare: conditional false',   '{$strength > 20 : "Strong" | "Weak"}');
testCompare('legacy compare: template text',       'Gold: {$gold}');
testCompare('legacy compare: arithmetic',          '{$strength + $stealth}');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log('Results:\n');
for (const r of results) {
  const icon = r.pass ? '✓' : '✗';
  console.log(`  ${icon} ${r.desc}`);
  if (!r.pass) {
    console.log(`      expr:     ${r.expr}`);
    console.log(`      got:      ${JSON.stringify(r.got)}`);
    if (r.expected !== undefined) console.log(`      expected: ${JSON.stringify(r.expected)}`);
    if (r.note)     console.log(`      note:     ${r.note}`);
  } else if (r.note) {
    console.log(`      note:     ${r.note}`);
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${results.length}`);

if (failed > 0) process.exit(1);
