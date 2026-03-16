# ScribeScript Parser (Chevrotain-based)

This is the new Chevrotain-based parser for ScribeScript, replacing the legacy regex-based parser in `textProcessor.ts`.

## Architecture

### Files
- `grammar.ts` - Lexer and parser definitions using Chevrotain
- `ast.ts` - TypeScript interfaces for Abstract Syntax Tree nodes
- `visitor.ts` - AST visitor for evaluation (stub implementation)
- `index.ts` - Public API (`evaluateTextNew`, `parseToAST`, `validateSyntax`)
- `integration.ts` - Integration layer for non-destructive migration
- `test-setup.ts` - Basic test setup

### Phase 1: Non-destructive Implementation

The new parser is implemented alongside the existing regex parser with a feature flag:

1. **Feature Flag**: `SCRIBESCRIPT_USE_NEW_PARSER=true` environment variable
2. **Fallback**: If new parser fails or returns empty, automatically falls back to old parser
3. **Logging**: Trace logging when new parser is used (enabled via logger)

### How to Test

1. Set environment variable:
   ```bash
   export SCRIBESCRIPT_USE_NEW_PARSER=true
   ```

2. Run the test script:
   ```bash
   npx tsx src/engine/scribescript/parser/test-setup.ts
   ```

3. The existing `evaluateText()` function in `textProcessor.ts` will automatically try the new parser first when the feature flag is enabled.

## Grammar Coverage

### Implemented (Phase 1)
- Variables: `$var`, `@alias`, `#world`, `$.`
- Property access: `$var.property.subproperty`
- Level spoof: `$var[expression]`
- Basic expressions: arithmetic, comparisons, logical operators
- Literals: numbers, strings, booleans

### TODO (Future Phases)
- Macros: `%list[category]`, `%count[type]`, etc.
- Challenges: `$skill >> 50`
- Conditionals: `{condition : result}`
- Ranges: `{10~20}`
- Choices: `{a|b|c}`
- Percentage: `50%`

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

5. Add AST interface in `ast.ts` if new node type.

6. Add evaluation logic in `visitor.ts`.

### Testing

Run TypeScript checks:
```bash
npx tsc --noEmit src/engine/scribescript/parser/*.ts
```

Run test script:
```bash
npx tsx src/engine/scribescript/parser/test-setup.ts
```

## Migration Strategy

### Phase 1 (Current)
- Install Chevrotain
- Create basic grammar and AST
- Non-destructive integration with feature flag

### Phase 2
- Implement evaluation visitor for all DSL constructs
- Comprehensive test suite matching existing behavior
- Performance benchmarking

### Phase 3
- Gradual rollout with A/B testing
- Side-by-side validation of all game content
- Optimization and caching

### Phase 4
- Remove old regex parser
- Update documentation
- Enable by default

## Performance Considerations

- Chevrotain lexer/parser is optimized for performance
- AST caching for repeated expressions
- Incremental parsing for large texts
- Memory usage monitoring

## Error Handling

The new parser provides detailed error messages with:
- Line and column numbers
- Expected tokens
- Recovery from common errors
- Validation warnings for deprecated syntax