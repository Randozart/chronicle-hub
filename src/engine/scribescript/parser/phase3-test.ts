// src/engine/scribescript/parser/phase3-test.ts
// Comprehensive Phase 3 feature test

import { evaluateTextNew, validateSyntax, parseToAST, AstEvaluator, CstToAstTransformer } from './index';
import { scribeScriptLexer, parser } from './grammar';

console.log('=== ScribeScript Phase 3 Feature Test ===\n');

// Test context with sample data
const context = {
  variables: new Map<string, any>([
    ['strength', 15],
    ['dexterity', 12],
    ['intelligence', 18],
    ['swordsmanship', 65],
    ['stealth', 30],
    ['diplomacy', 40],
    ['gold', 100],
    ['level', 5],
  ]),
  worldVariables: new Map<string, any>([
    ['is_night', 1],
    ['weather', 'rain'],
  ]),
  aliases: new Map<string, any>([
    ['player_name', 'Aria'],
    ['location', 'tavern'],
  ]),
};

// Comprehensive test cases for Phase 3 features
const testCases = [
  // Phase 1 & 2 features (already implemented)
  { expr: '{5}', desc: 'Simple number literal' },
  { expr: '{$strength}', desc: 'Variable reference' },
  { expr: '{@player_name}', desc: 'Alias reference' },
  { expr: '{#is_night}', desc: 'World variable' },
  { expr: '{$strength > 10}', desc: 'Comparison' },
  { expr: '{$strength + $dexterity}', desc: 'Arithmetic' },
  { expr: '{$intelligence >= 15 && $strength < 20}', desc: 'Logical expression' },

  // Phase 3 features
  // Ranges
  { expr: '{1~6}', desc: 'Simple range (dice roll)' },
  { expr: '{10~20}', desc: 'Number range' },
  { expr: '{$level * 10 ~ $level * 20}', desc: 'Expression range' },

  // Choices
  { expr: '{"A"|"B"|"C"}', desc: 'String choices' },
  { expr: '{$gold|$level|$strength}', desc: 'Variable choices' },
  { expr: '{"attack"|"defend"|"flee"}', desc: 'Action choices' },

  // Conditionals
  { expr: '{$strength > 10 : "Strong" | "Weak"}', desc: 'If/else conditional' },
  { expr: '{$level >= 5 : "Advanced" | $level >= 2 : "Intermediate" | "Beginner"}', desc: 'Multiple conditionals' },
  { expr: '{#is_night : "night" | "day"}', desc: 'World variable conditional' },

  // Percentage shorthand
  { expr: '{60%}', desc: 'Percentage shorthand' },
  { expr: '{25%}', desc: 'Low percentage' },

  // Assignment
  { expr: '{@roll = {1~6}}', desc: 'Assignment with range' },
  { expr: '{@total = $strength + $dexterity}', desc: 'Assignment with expression' },

  // Challenges (operators)
  { expr: '{$swordsmanship >> 50}', desc: 'Challenge: higher is better' },
  { expr: '{$stealth << 30}', desc: 'Challenge: lower is better' },
  { expr: '{$diplomacy >< 40}', desc: 'Challenge: precision' },
  { expr: '{$diplomacy <> 40}', desc: 'Challenge: avoidance' },

  // Macros (basic syntax - evaluation may be stubs)
  { expr: '{%list[weapons]}', desc: 'List macro' },
  { expr: '{%count[items]}', desc: 'Count macro' },
  { expr: '{%pick[locations]}', desc: 'Pick macro' },
  { expr: '{%random[60]}', desc: 'Random macro' },
  { expr: '{%chance[$swordsmanship >> 50]}', desc: 'Chance macro' },

  // Complex expressions
  { expr: 'You have {$gold} gold pieces.', desc: 'Text with variable' },
  { expr: 'Strength: {$strength}, Roll: {@roll = {1~6}}', desc: 'Multiple expressions' },
  { expr: '{$strength > 10 && $dexterity > 10 : "Competent" | "Needs training"}', desc: 'Complex conditional' },
];

console.log('1. Syntax Validation Test');
console.log('=======================');
let syntaxErrors = 0;
for (const test of testCases) {
  const errors = validateSyntax(test.expr);
  if (errors.length > 0) {
    console.log(`  ❌ ${test.desc}`);
    console.log(`     Expression: ${test.expr}`);
    console.log(`     Error: ${errors[0]}`);
    syntaxErrors++;
  } else {
    console.log(`  ✓ ${test.desc}`);
  }
}
console.log(`\nSyntax validation: ${testCases.length - syntaxErrors}/${testCases.length} passed\n`);

console.log('2. AST Parsing Test');
console.log('===================');
let astErrors = 0;
for (const test of testCases.slice(0, 10)) { // Test first 10 for brevity
  try {
    const ast = parseToAST(test.expr);
    console.log(`  ✓ ${test.desc}`);
    // Log AST type for first few
    if (testCases.indexOf(test) < 3) {
      console.log(`     AST type: ${ast.type}`);
    }
  } catch (error) {
    console.log(`  ❌ ${test.desc}`);
    console.log(`     Expression: ${test.expr}`);
    console.log(`     Error: ${(error as Error).message}`);
    astErrors++;
  }
}
console.log(`\nAST parsing: ${10 - astErrors}/10 passed\n`);

console.log('3. Evaluation Test');
console.log('==================');
let evalErrors = 0;
let evalTests = 0;
const evalTestCases = testCases.filter(t =>
  !t.expr.includes('%') // Skip macros for now as they're stubs
);

for (const test of evalTestCases) {
  evalTests++;
  try {
    const result = evaluateTextNew(test.expr, context);
    console.log(`  ${test.desc}`);
    console.log(`     Expression: ${test.expr}`);
    console.log(`     Result: ${result} (${typeof result})`);
  } catch (error) {
    console.log(`  ❌ ${test.desc}`);
    console.log(`     Expression: ${test.expr}`);
    console.log(`     Error: ${(error as Error).message}`);
    evalErrors++;
  }
}
console.log(`\nEvaluation: ${evalTests - evalErrors}/${evalTests} passed\n`);

console.log('4. Feature Demonstration');
console.log('========================');
console.log('\nKey features demonstrated:');
console.log('- Variables: $var, @alias, #world');
console.log('- Expressions: arithmetic, comparisons, logical operators');
console.log('- Ranges: {min~max} for random numbers');
console.log('- Choices: {a|b|c} for random selection');
console.log('- Conditionals: {condition : result | else}');
console.log('- Percentage shorthand: {60%}');
console.log('- Assignment: {@name = value}');
console.log('- Challenges: $skill >> target, $skill << target, etc.');
console.log('- Macros: %list[], %count[], %pick[], %random[], %chance[]');

console.log('\n5. Performance Test');
console.log('==================');
const performanceTestExpr = '{$strength + $dexterity}';
const iterations = 1000;
console.log(`Running ${iterations} evaluations of: ${performanceTestExpr}`);

const start = Date.now();
for (let i = 0; i < iterations; i++) {
  evaluateTextNew(performanceTestExpr, context);
}
const end = Date.now();
const duration = end - start;
const avgTime = duration / iterations;

console.log(`Total time: ${duration}ms`);
console.log(`Average time per evaluation: ${avgTime.toFixed(3)}ms`);
console.log(`Evaluations per second: ${Math.round(1000 / avgTime)}`);

console.log('\n=== Phase 3 Test Complete ===');
console.log('\nSummary:');
console.log(`- Syntax validation: ${testCases.length - syntaxErrors}/${testCases.length}`);
console.log(`- AST parsing: ${10 - astErrors}/10`);
console.log(`- Evaluation: ${evalTests - evalErrors}/${evalTests}`);
console.log(`- Performance: ${avgTime.toFixed(3)}ms per evaluation`);

console.log('\nNext steps for Phase 3:');
console.log('1. Implement macro evaluation (integrate with macros.ts)');
console.log('2. Implement challenge evaluation (integrate with math.ts)');
console.log('3. Add error recovery and better error messages');
console.log('4. Comprehensive comparison with old regex parser');