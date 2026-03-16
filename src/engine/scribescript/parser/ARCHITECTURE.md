# ScribeScript Parser Architecture

## Overview

This document describes the architecture of the Chevrotain-based ScribeScript parser, which replaces the legacy regex-based parser in `textProcessor.ts`. The parser implements a complete ScribeScript interpreter with full support for the Quality-Based Narrative (QBN) scripting language.

**Status**: Phase 3 Complete (Advanced Features Implemented)

## Complete ScribeScript Syntax Reference

### Variable Types and Sigils
| Sigil | Type | Example | Description |
|-------|------|---------|-------------|
| `$` | Character Quality | `{$strength}` | Player character quality (numeric) |
| `@` | Alias | `{@player_name}` | Named reference to any value |
| `#` | World Quality | `{#is_night}` | World/global state variable |
| `$.` | Self Reference | `{$.}` | Reference to current quality context |
| `.` | Property Access | `{$item.name}` | Access object properties |
| `[]` | Level Spoof | `{$skill[$level]}` | Dynamic quality level override |

### Literals
| Type | Syntax | Examples |
|------|--------|----------|
| Number | `-?\d+(\.\d+)?` | `5`, `-3.14`, `100` |
| String | `"text"` | `"Hello"`, `"A name"` |
| Boolean | `true`/`false` | `true`, `false` |
| Identifier | `[a-zA-Z_][a-zA-Z0-9_]*` | `weapons`, `category` |

### Operators (Precedence Highest to Lowest)
| Precedence | Operators | Description |
|------------|-----------|-------------|
| 1 | `!`, `-` | Logical NOT, Unary minus |
| 2 | `*`, `/` | Multiplication, Division |
| 3 | `+`, `-` | Addition, Subtraction |
| 4 | `>`, `<`, `>=`, `<=` | Comparison |
| 5 | `==`, `!=` | Equality |
| 6 | `&&` | Logical AND |
| 7 | `||` | Logical OR |
| 8 | `>>`, `<<`, `><`, `<>` | Challenge operators |
| 9 | `~` | Range operator |

### Special Forms
| Form | Syntax | Example | Description |
|------|--------|---------|-------------|
| Range | `{min~max}` | `{1~6}`, `{$min~$max}` | Random number between min and max |
| Choice | `{a\|b\|c}` | `{"A"\|"B"\|"C"}` | Random selection from options |
| Conditional | `{cond : result \| else}` | `{$str>10:"Strong"\|"Weak"}` | If/else branching |
| Multi-Conditional | `{c1:r1\|c2:r2\|else}` | `{$lvl≥5:"Adv"\|$lvl≥2:"Int"\|"Beg"}` | Multiple condition branches |
| Percentage | `{number%}` | `{60%}`, `{25%}` | Shorthand for `%random[value]` |
| Assignment | `{@alias = expr}` | `{@roll = {1~6}}` | Assign value to alias |
| Parentheses | `{(expr)}` | `{($a + $b) * 2}` | Expression grouping |

### Macros
| Macro | Syntax | Example | Description |
|-------|--------|---------|-------------|
| List | `%list[category]` | `%list[weapons]` | List items in category |
| Count | `%count[type]` | `%count[items]` | Count items of type |
| Pick | `%pick[set]` | `%pick[locations]` | Pick random from set |
| Random | `%random[chance]` | `%random[60]` | Random chance (0-100) |
| Chance | `%chance[challenge]` | `%chance[$skill>>50]` | Calculate probability |
| New | `%new[type]` | `%new[item]` | Create new instance |
| Roll | `%roll[dice]` | `%roll[2d6]` | Dice roll |
| Schedule | `%schedule[event]` | `%schedule[meeting]` | Schedule event |

### Challenge Operators
| Operator | Name | Example | Description |
|----------|------|---------|-------------|
| `>>` | Higher is Better | `{$skill >> 50}` | Skill must exceed target |
| `<<` | Lower is Better | `{$stealth << 30}` | Skill must be below target |
| `><` | Precision | `{$aim >< 40}` | Skill must be close to target |
| `<>` | Avoidance | `{$luck <> 20}` | Skill must NOT be close to target |

### Challenge Options
Challenges support optional parameters in brackets:
```scribescript
{$skill >> 50[margin:10, min:20, max:80, pivot:50]}
```
- `margin`: Acceptable margin of error
- `min`: Minimum allowed value
- `max`: Maximum allowed value
- `pivot`: Center point for precision/avoidance

## Parsing Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ScribeScript Text                         │
│                    "Hello {$name}!"                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [Lexical Analysis]
                    (Chevrotain Lexer)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Token Stream                              │
│                    [String, LBrace, Variable, RBrace, String]│
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [Syntax Analysis]
                    (Chevrotain Parser)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Concrete Syntax Tree (CST)                │
│                    (Chevrotain-native structure)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [AST Transformation]
                    (CstToAstTransformer)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Abstract Syntax Tree (AST)                │
│                    (TypeScript interfaces)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    [Evaluation]
                    (AstEvaluator)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Result Value                              │
│                    "Hello John!"                             │
└─────────────────────────────────────────────────────────────┘
```

## Token Reference

### Variable Sigils
| Token | Pattern | Example | Description |
|-------|---------|---------|-------------|
| `Variable` | `\$[a-zA-Z_][a-zA-Z0-9_]*` | `$strength` | Character quality |
| `Alias` | `@[a-zA-Z_][a-zA-Z0-9_]*` | `@player_name` | Named alias |
| `WorldVar` | `#[a-zA-Z_][a-zA-Z0-9_]*` | `#is_night` | World variable |
| `SelfRef` | `\$\.` | `$.` | Self reference |
| `PropertyAccess` | `\.[a-zA-Z_][a-zA-Z0-9_]*` | `.name` | Property access |

### Brackets and Braces
| Token | Pattern | Description |
|-------|---------|-------------|
| `LBrace` | `\{` | Opening brace `{` |
| `RBrace` | `\}` | Closing brace `}` |
| `LBracket` | `\[` | Opening bracket `[` |
| `RBracket` | `\]` | Closing bracket `]` |
| `LParen` | `\(` | Opening parenthesis `(` |
| `RParen` | `\)` | Closing parenthesis `)` |

### Operators
| Token | Pattern | Description |
|-------|---------|-------------|
| `Plus` | `\+` | Addition `+` |
| `Minus` | `-` | Subtraction/Negative `-` |
| `Multiply` | `\*` | Multiplication `*` |
| `Divide` | `/` | Division `/` |
| `Equals` | `=` | Assignment `=` |
| `DoubleEquals` | `==` | Equality `==` |
| `NotEquals` | `!=` | Inequality `!=` |
| `GreaterThan` | `>` | Greater than `>` |
| `LessThan` | `<` | Less than `<` |
| `GreaterEquals` | `>=` | Greater or equal `>=` |
| `LessEquals` | `<=` | Less or equal `<=` |
| `LogicalAnd` | `&&` | Logical AND `&&` |
| `LogicalOr` | `\|\|` | Logical OR `\|\|` |
| `LogicalNot` | `!` | Logical NOT `!` |
| `ChallengeOp` | `>>\|<<\|><\|<>` | Challenge operators |
| `Tilde` | `~` | Range operator `~` |

### Separators
| Token | Pattern | Description |
|-------|---------|-------------|
| `Colon` | `:` | Conditional separator `:` |
| `Semicolon` | `;` | Macro argument separator `;` |
| `Comma` | `,` | List separator `,` |
| `Pipe` | `\|` | Choice/conditional separator `\|` |
| `Percent` | `%` | Percentage/macro `%` |

### Literals
| Token | Pattern | Description |
|-------|---------|-------------|
| `NumberLiteral` | `-?\d+(\.\d+)?` | Numeric values |
| `StringLiteral` | `"(?:[^"\\]\|\\.)*"` | Quoted strings |
| `BooleanLiteral` | `true\|false` | Boolean values |
| `Identifier` | `[a-zA-Z_][a-zA-Z0-9_]*` | Unquoted identifiers |
| `Macro` | `%[a-zA-Z_]+` | Macro commands |

### Whitespace
| Token | Pattern | Description |
|-------|---------|-------------|
| `WhiteSpace` | `\s+` | Skipped during parsing |

**Critical Token Ordering**: Longer patterns must come first in the `allTokens` array:
1. `ChallengeOp` before `GreaterThan`/`LessThan`
2. `DoubleEquals` before `Equals`
3. `GreaterEquals`/`LessEquals` before `GreaterThan`/`LessThan`
4. `BooleanLiteral` before `Identifier`

## Grammar Rules (EBNF Notation)

### Top-Level Rules
```
script          ::= textBlock*
textBlock       ::= (StringLiteral | braceExpression)*
braceExpression ::= "{" (assignment | expression) "}"
assignment      ::= Alias "=" expression
```

### Expression Hierarchy
```
expression      ::= branch ("|" branch)*
branch          ::= logicalOr (":" logicalOr)?
logicalOr       ::= logicalAnd ("||" logicalAnd)*
logicalAnd      ::= equality ("&&" equality)*
equality        ::= comparison (("==" | "!=") comparison)*
comparison      ::= additive ((">" | "<" | ">=" | "<=" | ChallengeOp | "~") additive)*
additive        ::= multiplicative (("+" | "-") multiplicative)*
multiplicative  ::= unary (("*" | "/") unary)*
unary           ::= ("!" | "-") unary | primary
primary         ::= variable | percentageShorthand | literal | parenthesized | macro
```

### Special Forms
```
variable            ::= (Variable | Alias | WorldVar | SelfRef) ("[" expression "]")? PropertyAccess*
percentageShorthand ::= NumberLiteral "%"
literal             ::= NumberLiteral | StringLiteral | BooleanLiteral | Identifier
parenthesized       ::= "(" expression ")"
macro               ::= Macro "[" macroArgs "]"
macroArgs           ::= expression (";" expression)*
```

## AST Node Types Reference

### Base Interface
```typescript
interface BaseNode {
  type: string;
  location?: SourceLocation;  // {start: {line, column, offset}, end: {...}}
}
```

### Text and Blocks
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `TextBlockNode` | `parts: Array<ASTNode \| string>` | Container for mixed text/expressions |
| `BraceExpressionNode` | `expression: ASTNode` | Wrapper for `{expression}` |

### Variables and Properties
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `VariableNode` | `sigil: '$' \| '@' \| '#' \| '$.'`<br>`identifier: string`<br>`levelSpoof?: ASTNode`<br>`propertyChain: string[]` | Variable reference with optional level spoof `[expr]` and property chain `.prop.sub` |

### Expressions
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `BinaryExpressionNode` | `operator: '==' \| '!=' \| '>' \| '<' \| '>=' \| '<=' \| '+' \| '-' \| '*' \| '/' \| '\|\|' \| '&&'`<br>`left: ASTNode`<br>`right: ASTNode` | Binary operation |
| `UnaryExpressionNode` | `operator: '!' \| '-'`<br>`operand: ASTNode` | Unary operation |

### Control Flow
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `ConditionalNode` | `branches: ConditionalBranch[]`<br>`elseBranch?: ASTNode` | If/else conditional |
| `ConditionalBranch` | `condition: ASTNode`<br>`result: ASTNode` | Single condition→result pair |
| `AssignmentNode` | `alias: string`<br>`value: ASTNode` | Alias assignment `@name = value` |

### Macros
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `MacroNode` | `command: string`<br>`mainArg: ASTNode \| string`<br>`options: Array<ASTNode \| string>` | Macro invocation `%cmd[arg; opt1, opt2]` |

### Special Forms
| Node Type | Fields | Description |
|-----------|--------|-------------|
| `LiteralNode` | `value: string \| number \| boolean` | Constant value |
| `RangeNode` | `min: ASTNode`<br>`max: ASTNode` | Random range `min~max` |
| `ChoiceNode` | `choices: ASTNode[]` | Random choice `a\|b\|c` |
| `ChallengeNode` | `skill: ASTNode`<br>`operator: '>>' \| '<<' \| '><' \| '<>'`<br>`target: ASTNode`<br>`options?: {margin?, min?, max?, pivot?}` | Challenge expression |
| `PercentageNode` | `value: number` | Percentage shorthand `60%` |

## Evaluation Semantics

### Evaluation Context
```typescript
interface EvaluationContext {
  variables: Map<string, any>;      // $variables (character qualities)
  worldVariables: Map<string, any>; // #world variables
  aliases: Map<string, any>;        // @aliases
}
```

### Node Evaluation Rules

#### TextBlockNode
- Concatenate all parts
- String parts used as-is
- AST nodes evaluated recursively, results converted to strings

#### BraceExpressionNode
- Evaluate inner expression
- Return result directly (not wrapped in braces)

#### VariableNode
1. Look up based on sigil:
   - `$`: `context.variables.get(identifier)`
   - `@`: `context.aliases.get(identifier)`
   - `#`: `context.worldVariables.get(identifier)`
   - `$.`: Self reference (TODO: implement)
2. Apply level spoof if present (evaluate expression, override level)
3. Traverse property chain: `value.prop1.prop2...`
4. Return final value or empty string if any step fails

#### BinaryExpressionNode
| Operator | Evaluation |
|----------|------------|
| `+`, `-`, `*`, `/` | Numeric arithmetic |
| `==`, `!=` | Strict equality comparison |
| `>`, `<`, `>=`, `<=` | Numeric comparison |
| `&&`, `\|\|` | Boolean logic (short-circuit) |

#### UnaryExpressionNode
| Operator | Evaluation |
|----------|------------|
| `!` | Boolean NOT |
| `-` | Numeric negation |

#### ConditionalNode
1. Evaluate branches in order
2. For each branch: evaluate condition → if truthy, evaluate and return result
3. If no branch matches, evaluate and return elseBranch
4. If no elseBranch, return empty string

#### AssignmentNode
1. Evaluate value expression
2. Store in `context.aliases` under alias name
3. Return stored value

#### RangeNode
1. Evaluate min and max expressions
2. Convert to numbers (parseFloat if needed)
3. Generate random integer: `Math.random() * (max - min + 1) + min`
4. Return integer result

#### ChoiceNode
1. Evaluate all choice expressions
2. Select random element: `choices[Math.floor(Math.random() * choices.length)]`
3. Return selected value

#### ChallengeNode
1. Evaluate skill and target expressions
2. Apply challenge operator:
   - `>>`: `skill > target` (higher is better)
   - `<<`: `skill < target` (lower is better)
   - `><`: `Math.abs(skill - target) <= (options.margin || 0)` (precision)
   - `<>`: `Math.abs(skill - target) > (options.margin || 0)` (avoidance)
3. Apply min/max bounds if specified
4. Return boolean result

#### PercentageNode
1. Convert to `%random[value]` macro
2. Evaluate as random chance: `Math.random() * 100 < value`
3. Return boolean result

#### MacroNode
1. Look up macro implementation by command
2. Evaluate mainArg and options
3. Call macro function with arguments
4. Return macro result

## Template Text Handling

### Processing Algorithm
```
Input: "You have {$gold} gold and {$health} health."
Output: "You have 100 gold and 75 health."

Algorithm:
1. Find innermost {..} block: {$gold}
2. Parse and evaluate: 100
3. Replace: "You have 100 gold and {$health} health."
4. Find next innermost: {$health}
5. Parse and evaluate: 75
6. Replace: "You have 100 gold and 75 health."
7. No more braces → return result
```

### Implementation Details
- Uses recursive regex matching: `/\{([^{}]*?)\}/`
- Maximum 500 iterations to prevent infinite loops
- Unresolvable blocks replaced with empty string
- Pure brace expressions evaluated directly without template processing

## Conditional/Choice Disambiguation

### Grammar Ambiguity
The pipe (`|`) serves dual purposes:
1. **Conditional separator**: `{cond : result | else}`
2. **Choice separator**: `{a | b | c}`

### Resolution Algorithm
```
Parse expression with branches: branch ("|" branch)*
For each branch:
  If branch contains Colon → conditional branch
  Else → choice branch

If ANY branch has Colon → ConditionalNode
Else → ChoiceNode
```

### Examples
```
{a | b | c}                    → ChoiceNode (no colons)
{cond : result | else}         → ConditionalNode (has colon)
{cond1:r1 | cond2:r2 | else}   → ConditionalNode (has colons)
```

## Common Failure Modes and Diagnostics

### 1. Token Ordering Issues
**Symptom**: Valid syntax fails to parse
**Cause**: Longer token patterns must come before shorter ones
**Fix**: Ensure `allTokens` array order:
```typescript
// CORRECT order (longer patterns first)
ChallengeOp,      // >> before >
DoubleEquals,     // == before =
GreaterEquals,    // >= before >
LessEquals,       // <= before <
BooleanLiteral,   // true before Identifier
```

### 2. Challenge Operator Conflicts
**Symptom**: `>>` parsed as `>` `>`
**Cause**: `ChallengeOp` not before `GreaterThan` in token list
**Fix**: Move `ChallengeOp` before `GreaterThan`/`LessThan`

### 3. Variable Resolution Failures
**Symptom**: Variables return 0 or empty string
**Diagnosis**:
- Check sigil: `$` vs `@` vs `#`
- Verify context maps are populated
- Check property chain: `$item.name` vs `$item` `.name`

### 4. Macro Evaluation Stubs
**Symptom**: `[Macro: command]` in output
**Cause**: Macro evaluation not fully implemented
**Fix**: Integrate with `macros.ts` functions

### 5. Infinite Recursion
**Symptom**: Stack overflow in template processing
**Cause**: Self-referential expressions or missing base case
**Fix**: Limit recursion depth (500 iterations max)

### 6. Type Coercion Issues
**Symptom**: `"5" + 3 = "53"` instead of `8`
**Cause**: String/number mixing in arithmetic
**Fix**: Explicit type conversion in evaluation

## Debugging Tools

### `parseToAST(text: string): ASTNode`
Parse text to AST for inspection:
```typescript
const ast = parseToAST("{$strength > 10}");
console.log(JSON.stringify(ast, null, 2));
```

### `validateSyntax(text: string): string[]`
Validate syntax without evaluation:
```typescript
const errors = validateSyntax("{$invalid[}");
if (errors.length > 0) console.error(errors);
```

### `compareWithOldParser(text, oldParserFn)`
Compare with legacy parser:
```typescript
const result = compareWithOldParser("{$strength}", oldEvaluateText);
console.log(`Match: ${result.match}`);
```

### Environment Variables
```bash
SCRIBESCRIPT_USE_NEW_PARSER=true  # Enable new parser
SCRIBESCRIPT_DEBUG=true           # Enable debug logging
```

## Known Limitations

### Phase 3 Implementation Status
| Feature | Status | Notes |
|---------|--------|-------|
| Variables | ✅ Complete | All sigils supported |
| Expressions | ✅ Complete | Full operator hierarchy |
| Ranges | ✅ Complete | `{min~max}` |
| Choices | ✅ Complete | `{a\|b\|c}` |
| Conditionals | ✅ Complete | `{cond:result\|else}` |
| Percentage | ✅ Complete | `{60%}` |
| Assignment | ✅ Complete | `{@alias=value}` |
| Challenges | ⚠️ Partial | Operators parsed, evaluation stubbed |
| Macros | ⚠️ Partial | Syntax parsed, evaluation stubbed |
| Level Spoof | ⚠️ Partial | Syntax parsed, evaluation stubbed |
| Property Chains | ✅ Complete | `.prop.sub` |
| Self Reference | ⚠️ Partial | `$.` parsed, evaluation stubbed |

### Edge Cases
1. **Nested Braces**: `{{$a} + {$b}}` - outer braces treated as text
2. **Empty Braces**: `{}` - evaluates to empty string
3. **Mixed Types**: `"5" + 3` - string concatenation, not numeric addition
4. **Undefined Variables**: Return `0` (numeric) or `""` (string) based on context
5. **Division by Zero**: Returns `Infinity` or `-Infinity`

### Performance Considerations
- **AST Caching**: Not yet implemented (potential optimization)
- **Memoization**: Challenge/macro results not cached
- **Lexer/Parser**: Chevrotain is optimized but initial parse has overhead
- **Template Processing**: Recursive regex matching O(n²) worst case

## Extension Guide

### Adding New Syntax
1. **Add Token** in `grammar.ts`:
   ```typescript
   export const NewToken = createToken({
     name: 'NewToken',
     pattern: /.../
   });
   ```
2. **Add to `allTokens`** in correct precedence order
3. **Add Grammar Rule**:
   ```typescript
   this.RULE('newRule', () => { ... });
   ```
4. **Add AST Interface** in `ast.ts`:
   ```typescript
   export interface NewNode extends BaseNode {
     type: 'New';
     // fields
   }
   ```
5. **Add Transformation** in `transformer.ts`:
   ```typescript
   private transformNewRule(cst: any): NewNode { ... }
   ```
6. **Add Evaluation** in `astEvaluator.ts`:
   ```typescript
   private evaluateNewNode(node: NewNode): any { ... }
   ```

### Adding New Macros
1. **Implement Function** in `macros.ts` (existing file)
2. **Update `evaluateMacro`** in `astEvaluator.ts`:
   ```typescript
   case 'newmacro':
     return evaluateNewMacro(mainArg, options);
   ```

### Adding New Operators
1. **Add Token** with pattern
2. **Add to operator hierarchy** in grammar rules
3. **Add to `BinaryExpressionNode.operator` type**
4. **Implement evaluation** in `evaluateBinaryExpression`

## Related Files

| File | Purpose |
|------|---------|
| `grammar.ts` | Lexer and parser definitions |
| `ast.ts` | AST type definitions |
| `transformer.ts` | CST to AST transformation |
| `astEvaluator.ts` | AST evaluation engine |
| `index.ts` | Public API |
| `integration.ts` | Legacy parser integration |
| `visitor.ts` | Phase 2 CST evaluator (deprecated) |
| `phase3-test.ts` | Comprehensive feature tests |
| `textProcessor.ts` | Legacy regex parser (reference) |
| `macros.ts` | Macro implementations |
| `math.ts` | Challenge probability calculations |

## Glossary

- **ScribeScript**: Domain-specific language for QBN narrative scripting
- **CST**: Concrete Syntax Tree (parser-native structure)
- **AST**: Abstract Syntax Tree (typed, simplified structure)
- **Sigil**: Prefix character (`$`, `@`, `#`, `$.`)
- **Level Spoof**: Dynamic quality level `$quality[expression]`
- **Property Chain**: Nested property access `$quality.property.sub`
- **Macro**: Built-in function `%command[arg; options]`
- **Challenge**: Skill check operator `>>`, `<<`, `><`, `<>`
- **Conditional**: If/else expression `condition : result | else`
- **Range**: Random number `min~max`
- **Choice**: Random selection `a|b|c`

---

*Last Updated: 2026-03-16*
*Version: Phase 3 Complete (Advanced Features)*
*Next: Phase 4 (Production Rollout)*