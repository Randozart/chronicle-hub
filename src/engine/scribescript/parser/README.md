# ScribeScript Parser (Chevrotain-based)

This is the new Chevrotain-based parser for ScribeScript, replacing the legacy regex-based parser in `textProcessor.ts`.

**Status**: Phase 3 Complete (Advanced Features Implemented)

**Comprehensive Documentation**: See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture, debugging guide, and implementation details.

## Quick Reference Syntax Table

| Syntax | Example | Description |
|--------|---------|-------------|
| `{$var}` | `{$strength}` | Character quality |
| `{@alias}` | `{@player_name}` | Named alias |
| `{#world}` | `{#is_night}` | World variable |
| `{$.}` | `{$.}` | Self reference |
| `{$var.prop}` | `{$item.name}` | Property access |
| `{$var[expr]}` | `{$skill[$level]}` | Level spoof |
| `{a~b}` | `{1~6}` | Random range |
| `{a\|b\|c}` | `{"A"\|"B"\|"C"}` | Random choice |
| `{cond:res\|else}` | `{$str>10:"Strong"\|"Weak"}` | Conditional |
| `{number%}` | `{60%}` | Percentage chance |
| `{@name=expr}` | `{@roll={1~6}}` | Assignment |
| `{$skill>>50}` | `{$swordsmanship>>50}` | Challenge |
| `{%cmd[arg]}` | `{%list[weapons]}` | Macro |

## Architecture

### Files
- `grammar.ts` - Lexer and parser definitions using Chevrotain
- `ast.ts` - TypeScript interfaces for Abstract Syntax Tree nodes
- `transformer.ts` - CST-to-AST transformation
- `astEvaluator.ts` - AST evaluator with full Phase 3 feature support
- `index.ts` - Public API (`evaluateTextNew`, `parseToAST`, `validateSyntax`)
- `integration.ts` - Integration layer for non-destructive migration
- `phase3-test.ts` - Comprehensive test suite
- `visitor.ts` - Phase 2 CST evaluator (deprecated, use `astEvaluator.ts`)

### Phase 3: Advanced Features Complete

The new parser now supports all ScribeScript features:

1. **Variables**: `$var`, `@alias`, `#world`, `$.` with property chains and level spoof
2. **Expressions**: Full arithmetic, comparison, and logical operators
3. **Ranges**: `{min~max}` for random number generation
4. **Choices**: `{a|b|c}` for random selection
5. **Conditionals**: `{condition : result | else}` with multiple branches
6. **Percentage**: `{60%}` shorthand for random chance
7. **Assignment**: `{@alias = value}` for storing values
8. **Challenges**: `$skill >> target`, `<<`, `><`, `<>` operators
9. **Macros**: `%list[]`, `%count[]`, `%pick[]`, `%random[]`, `%chance[]` syntax

## How to Use

### Basic Evaluation
```typescript
import { evaluateTextNew } from './parser';

const context = {
  variables: new Map([['strength', 15]]),
  worldVariables: new Map([['is_night', 1]]),
  aliases: new Map([['player_name', 'Aria']]),
};

const result = evaluateTextNew('You have {$strength} strength.', context);
// Result: "You have 15 strength."
```

### Template Text Processing
The parser handles mixed text and expressions:
```typescript
const text = 'Roll: {@roll = {1~6}}, Result: {@roll > 3 : "Success" : "Failure"}';
const result = evaluateTextNew(text, context);
// Example: "Roll: 4, Result: Success"
```

### Debugging and Inspection
```typescript
import { parseToAST, validateSyntax } from './parser';

// Parse to AST for inspection
const ast = parseToAST("{$strength > 10}");
console.log(JSON.stringify(ast, null, 2));

// Validate syntax
const errors = validateSyntax("{$invalid[}");
if (errors.length > 0) console.error(errors);
```

## Migration Strategy

### Phase 1 (Completed)
- Install Chevrotain
- Create basic grammar and AST
- Non-destructive integration with feature flag
- Basic expression parsing

### Phase 2 (Completed)
- Implement evaluation visitor for basic DSL constructs
- Variable resolution and expression evaluation
- TypeScript compilation fixes and testing

### Phase 3 (Completed)
- Implement advanced features: macros, conditionals, challenges, ranges, choices
- CST-to-AST transformation layer
- Enhanced error reporting and recovery
- Comprehensive test suite with old parser comparison

### Phase 4 (Planned)
- Gradual rollout with A/B testing
- Side-by-side validation of all game content
- Performance optimization and caching
- Remove old regex parser, enable by default

## Testing

### Run Comprehensive Tests
```bash
npx tsx src/engine/scribescript/parser/phase3-test.ts
```

### Enable New Parser
Set environment variable to use new parser:
```bash
export SCRIBESCRIPT_USE_NEW_PARSER=true
```

The existing `evaluateText()` function in `textProcessor.ts` will automatically try the new parser first when the feature flag is enabled, with fallback to the old parser on failure.

## Performance Considerations

- Chevrotain lexer/parser is optimized for performance
- AST transformation adds overhead but enables better error reporting
- Template processing uses recursive regex matching (O(n²) worst case)
- Potential optimizations: AST caching, memoization of challenge results

## Error Handling

The new parser provides detailed error messages with:
- Line and column numbers
- Expected tokens
- Recovery from common errors
- Validation warnings for deprecated syntax

## Debugging

For comprehensive debugging information, see [ARCHITECTURE.md](ARCHITECTURE.md) which includes:
- Architecture overview and data flow diagrams
- Complete syntax reference with examples
- Token and grammar rule definitions
- AST node type reference with evaluation semantics
- Common issues and solutions
- Debugging tools: `parseToAST()`, `validateSyntax()`, `compareWithOldParser()`
- Performance optimization guidelines
- Extension points for adding new syntax

### Quick Debugging Commands:
```typescript
// Parse to AST for inspection
import { parseToAST } from './parser';
const ast = parseToAST("{$strength > 10}");
console.log(JSON.stringify(ast, null, 2));

// Validate syntax
import { validateSyntax } from './parser';
const errors = validateSyntax("{$invalid[}");
if (errors.length > 0) console.error(errors);

// Compare with old parser
import { compareWithOldParser } from './parser';
const result = compareWithOldParser("{$strength}", oldEvaluateText);
console.log(`Match: ${result.match}`);
```

## Development

### Adding New Grammar Rules

1. Add tokens to `grammar.ts`:
   ```typescript
   export const NewToken = createToken({
     name: 'NewToken',
     pattern: /.../
   });
   ```

2. Add token to `allTokens` array (in correct order).

3. Add grammar rule:
   ```typescript
   this.RULE('newRule', () => {
     // Grammar definition
   });
   ```

4. Add to `primary` rule or appropriate expression rule.

5. Add AST interface in `ast.ts`.

6. Add transformation in `transformer.ts`.

7. Add evaluation in `astEvaluator.ts`.

### Testing
Run TypeScript checks:
```bash
npx tsc --noEmit src/engine/scribescript/parser/*.ts
```

Run test script:
```bash
npx tsx src/engine/scribescript/parser/phase3-test.ts
```

## Related Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Comprehensive architecture and reference
- `textProcessor.ts` - Legacy regex parser (reference implementation)
- `macros.ts` - Macro implementations
- `math.ts` - Challenge probability calculations

---

*Last Updated: 2026-03-16*
*Version: Phase 3 Complete*