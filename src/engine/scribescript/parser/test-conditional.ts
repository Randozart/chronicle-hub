import { evaluateTextNew } from './index';

const context = {
  variables: new Map([['strength', 15]]),
  worldVariables: new Map(),
  aliases: new Map(),
};

const expr = '{$strength > 10 : "Strong" | "Weak"}';
console.log('Testing:', expr);
try {
  const result = evaluateTextNew(expr, context);
  console.log('Result:', result);
} catch (e) {
  console.error('Error:', e);
}