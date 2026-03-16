import { evaluateTextNew, parseToAST } from './index';

const context = {
  variables: new Map([['strength', 15]]),
  worldVariables: new Map(),
  aliases: new Map(),
};

const ast = parseToAST('{$strength}');
console.log('AST:', JSON.stringify(ast, null, 2));

const result = evaluateTextNew('{$strength}', context);
console.log('Result:', result, typeof result);