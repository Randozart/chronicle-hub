// Test the new ScribeScript parser setup
import { scribeScriptLexer, parser } from './grammar';
import { evaluateTextNew, validateSyntax, parseToAST } from './index';

console.log('=== ScribeScript Parser Test ===\n');

// Test lexer
console.log('1. Lexer Test');
const lexResult = scribeScriptLexer.tokenize('{$strength}');
console.log('Tokens:', lexResult.tokens.map(t => `${t.tokenType.name}: "${t.image}"`));
console.log('Errors:', lexResult.errors);

// Test parser
console.log('\n2. Parser Test');
parser.input = lexResult.tokens;
// @ts-expect-error - dynamic method
const cst = parser.script();
console.log('CST structure:', JSON.stringify(cst, null, 2).substring(0, 200) + '...');
console.log('Parser errors:', parser.errors);

// Test validation
console.log('\n3. Syntax Validation Test');
const testCases = [
  '{5}',
  '{$strength}',
  '{@alias = 10}',
  '{$strength > 10}',
  '{condition : result}',
  '{%list[category]}',
  '{$skill >> 50}',
  '{10~20}',
  '{a|b|c}',
];

for (const test of testCases) {
  const errors = validateSyntax(test);
  console.log(`  "${test.substring(0, 30)}..." - ${errors.length > 0 ? `ERROR: ${errors[0]}` : 'OK'}`);
}

// Test evaluation (stub)
console.log('\n4. Evaluation Test (Stub)');
const context = {
  variables: new Map([['strength', 15]]),
  worldVariables: new Map(),
  aliases: new Map([['alias', 'test']]),
};

for (const test of testCases.slice(0, 5)) {
  try {
    const result = evaluateTextNew(test, context);
    console.log(`  "${test}" -> "${result}"`);
  } catch (error) {
    console.log(`  "${test}" -> ERROR: ${(error as Error).message}`);
  }
}

// Test AST parsing
console.log('\n5. AST Parsing Test');
const simpleExpr = '{$strength}';
try {
  const ast = parseToAST(simpleExpr);
  console.log(`  "${simpleExpr}" -> AST structure exists`);
  console.log('  AST keys:', Object.keys(ast).join(', '));
} catch (error) {
  console.log(`  "${simpleExpr}" -> ERROR: ${(error as Error).message}`);
}

console.log('\n=== Test Complete ===');
console.log('\nNext steps:');
console.log('1. Set SCRIBESCRIPT_USE_NEW_PARSER=true environment variable');
console.log('2. Run game with new parser (will fall back to old parser on error)');
console.log('3. Check logs for "[New Parser]" messages');