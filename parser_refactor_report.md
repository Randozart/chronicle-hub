# ScribeScript Parser Refactor Technical Report

*Generated: 2026-03-16*
*Project: ChronicleHub Interactive Fiction Platform*

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture vs. Proposed Architecture](#current-architecture-vs-proposed-architecture)
3. [The Proposed AST (Abstract Syntax Tree) TypeScript Interfaces](#the-proposed-ast-abstract-syntax-tree-typescript-interfaces)
4. [Mapping Guide](#mapping-guide)
5. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)

---

## 1. Executive Summary

### Feasibility Assessment: **YES**

The refactor from regex-based parsing to a formal parser using Chevrotain is **highly feasible** and **strongly recommended**. The current system has reached its scalability limits with complex regex patterns that are difficult to maintain, debug, and extend.

### Estimated Effort: **3-4 Person-Weeks**

- **Week 1**: Design and implement core Chevrotain grammar
- **Week 2**: Build AST interfaces and transformation layer
- **Week 3**: Integration testing and performance optimization
- **Week 4**: Gradual rollout and validation

### Key Benefits

1. **Maintainability**: Replace 15+ complex regex patterns with declarative grammar rules
2. **Debuggability**: Full parse tree visualization and error reporting
3. **Extensibility**: Modular grammar that can be extended without breaking existing functionality
4. **Performance**: Optimized tokenization and parsing vs. repeated regex matching
5. **Type Safety**: Complete TypeScript interfaces for all AST nodes

### Key Risks

1. **Integration Complexity**: The parser is deeply embedded in `textProcessor.ts` (2490+ lines)
2. **Edge Case Coverage**: Must handle all existing ScribeScript syntax variations
3. **Performance Regression**: Initial implementation may be slower than optimized regex
4. **Testing Overhead**: Requires comprehensive test suite for all DSL constructs

### High-Level Recommendation

**Proceed with refactor using phased approach**. Start with a parallel implementation that can be gradually integrated, maintaining the existing regex parser as fallback during transition.

---

## 2. Current Architecture vs. Proposed Architecture

### Current Architecture (Regex-Based)

**File**: `src/engine/textProcessor.ts` (2490+ lines)
**Core Components**:
1. **Variable Resolution**: `VARIABLE_REGEX` (line 15) - complex regex with 5+ capture groups
2. **Expression Evaluation**: Manual string splitting and recursion
3. **Macro Processing**: `%macro[...]` pattern matching (line 610)
4. **Condition Parsing**: Manual operator detection (line 763-817)
5. **Recursive Evaluation**: Manual brace matching (line 118)

**Current Parsing Pipeline**:
```
Raw Text → sanitizeScribeScript() → evaluateRecursive() →
└─ Innermost brace matching (regex) → evaluateExpression() →
   ├─ Assignment detection (regex line 185)
   ├─ Conditional parsing (manual splitting)
   ├─ Macro evaluation (regex line 610)
   └─ Variable resolution (VARIABLE_REGEX)
```

**Key Issues**:
- **Fragile Regex**: `VARIABLE_REGEX` attempts to handle 10+ syntax variations in one pattern
- **Manual Parsing**: Operator precedence handled via string splitting order
- **No Error Recovery**: Failed matches return partial or incorrect results
- **Tight Coupling**: Parser logic mixed with game state evaluation

### Proposed Architecture (Chevrotain-Based)

**New Files**:
- `src/engine/scribescript/parser/grammar.ts` - Chevrotain grammar definition
- `src/engine/scribescript/parser/ast.ts` - TypeScript AST interfaces
- `src/engine/scribescript/parser/visitor.ts` - AST traversal and evaluation
- `src/engine/scribescript/parser/index.ts` - Public API

**Proposed Parsing Pipeline**:
```
Raw Text → Lexer (Chevrotain) → Parser (Chevrotain) →
└─ Concrete Syntax Tree → AST Transformer →
   └─ Abstract Syntax Tree → AST Visitor (Evaluation) → Result
```

**Architecture Diagram**:
```
┌─────────────────────────────────────────────────────────────┐
│                    ScribeScript Text                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Chevrotain Lexer                         │
│  - Tokenizes $variables, {braces}, operators, literals      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Chevrotain Parser                        │
│  - Grammar rules for expressions, conditionals, macros      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    AST Transformer                          │
│  - Converts CST to typed AST nodes                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Evaluation Visitor                       │
│  - Traverses AST with game state context                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Final Result                             │
└─────────────────────────────────────────────────────────────┘
```

### Side-by-Side Comparison

| Aspect | Current (Regex) | Proposed (Chevrotain) |
|--------|-----------------|----------------------|
| **Parsing Approach** | Manual regex matching and string splitting | Formal grammar with tokenization |
| **Error Handling** | Silent failures, partial results | Detailed syntax error messages |
| **Extensibility** | Difficult, requires regex modifications | Modular grammar rules |
| **Performance** | O(n²) regex matching on nested braces | O(n) tokenization + O(n) parsing |
| **Debugging** | Console logging, manual inspection | Parse tree visualization, step debugging |
| **Code Size** | 2490+ lines in single file | ~1500 lines across 4 modular files |
| **Type Safety** | Minimal TypeScript typing | Full AST type definitions |
| **Testability** | Integration tests only | Unit tests for each grammar rule |

---

## 3. The Proposed AST (Abstract Syntax Tree) TypeScript Interfaces

```typescript
// src/engine/scribescript/parser/ast.ts

export type ASTNode =
  | TextBlockNode
  | VariableNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | ConditionalNode
  | MacroNode
  | AssignmentNode
  | LiteralNode
  | RangeNode
  | ChoiceNode
  | ChallengeNode;

export interface BaseNode {
  type: string;
  location?: SourceLocation;
}

export interface SourceLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

// Text and Blocks
export interface TextBlockNode extends BaseNode {
  type: 'TextBlock';
  parts: Array<ASTNode | string>;
}

export interface BraceExpressionNode extends BaseNode {
  type: 'BraceExpression';
  expression: ASTNode;
}

// Variables and Properties
export interface VariableNode extends BaseNode {
  type: 'Variable';
  sigil: '$' | '@' | '#' | '$.';
  identifier: string | ASTNode; // Can be literal or expression
  levelSpoof?: ASTNode; // Optional [expression]
  propertyChain: string[]; // Array of property names
}

// Expressions
export interface BinaryExpressionNode extends BaseNode {
  type: 'BinaryExpression';
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | '=' | '+' | '-' | '*' | '/' | '||' | '&&';
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: 'UnaryExpression';
  operator: '!' | '-';
  operand: ASTNode;
}

// Control Flow
export interface ConditionalNode extends BaseNode {
  type: 'Conditional';
  branches: ConditionalBranch[];
  elseBranch?: ASTNode;
}

export interface ConditionalBranch {
  condition: ASTNode;
  result: ASTNode;
}

export interface AssignmentNode extends BaseNode {
  type: 'Assignment';
  alias: string;
  value: ASTNode;
}

// Macros
export interface MacroNode extends BaseNode {
  type: 'Macro';
  command: string;
  mainArg: ASTNode | string;
  options: Array<ASTNode | string>;
}

// Literals and Special Forms
export interface LiteralNode extends BaseNode {
  type: 'Literal';
  value: string | number | boolean;
}

export interface RangeNode extends BaseNode {
  type: 'Range';
  min: number;
  max: number;
}

export interface ChoiceNode extends BaseNode {
  type: 'Choice';
  choices: ASTNode[];
}

export interface ChallengeNode extends BaseNode {
  type: 'Challenge';
  skill: ASTNode;
  operator: '>>' | '<<' | '><' | '<>' | '==' | '!=';
  target: ASTNode;
  options?: {
    margin?: number;
    min?: number;
    max?: number;
    pivot?: number;
  };
}

// Percentage chance
export interface PercentageNode extends BaseNode {
  type: 'Percentage';
  value: number;
}
```

### AST Node Mapping to DSL Constructs

| DSL Construct | AST Node Type | Example |
|--------------|---------------|---------|
| `{$strength}` | `VariableNode` | `{sigil: '$', identifier: 'strength'}` |
| `{$strength > 10}` | `BinaryExpressionNode` | `{operator: '>', left: VariableNode, right: LiteralNode(10)}` |
| `{condition : result}` | `ConditionalNode` | Single branch conditional |
| `{@alias = $value}` | `AssignmentNode` | `{alias: 'alias', value: VariableNode}` |
| `{%list[category]}` | `MacroNode` | `{command: 'list', mainArg: 'category'}` |
| `{10~20}` | `RangeNode` | `{min: 10, max: 20}` |
| `{a\|b\|c}` | `ChoiceNode` | `{choices: [LiteralNode('a'), ...]}` |
| `{$skill >> 50}` | `ChallengeNode` | `{skill: VariableNode, operator: '>>', target: LiteralNode(50)}` |

---

## 4. Mapping Guide

### a. VARIABLE_REGEX → Chevrotain Grammar

**Current Regex** (line 15, textProcessor.ts):
```typescript
const VARIABLE_REGEX = /((?<!\\)[@#\$](?:\{.*?\}|[a-zA-Z0-9_]+|\(.*?\))|(?<!\\)\$\.)(?:\[([\s\S]*?)\])?((?:\.[a-zA-Z0-9_]+)*)/g;
```

**Proposed Chevrotain Grammar**:
```typescript
// In grammar.ts
const Variable = createToken({
  name: "Variable",
  pattern: /\$[a-zA-Z_][a-zA-Z0-9_]*/,
});

const Alias = createToken({
  name: "Alias",
  pattern: /@[a-zA-Z_][a-zA-Z0-9_]*/,
});

const WorldVar = createToken({
  name: "WorldVar",
  pattern: /#[a-zA-Z_][a-zA-Z0-9_]*/,
});

const SelfRef = createToken({
  name: "SelfRef",
  pattern: /\$\./,
});

const PropertyAccess = createToken({
  name: "PropertyAccess",
  pattern: /\.[a-zA-Z_][a-zA-Z0-9_]*/,
});

const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
const RBracket = createToken({ name: "RBracket", pattern: /\]/ });

// Grammar rule
this.RULE("variable", () => {
  const sigil = this.OR([
    { ALT: () => this.CONSUME(Variable) },
    { ALT: () => this.CONSUME(Alias) },
    { ALT: () => this.CONSUME(WorldVar) },
    { ALT: () => this.CONSUME(SelfRef) },
  ]);

  let levelSpoof = null;
  if (this.LA(1).tokenType === LBracket) {
    this.CONSUME(LBracket);
    levelSpoof = this.SUBRULE(this.expression);
    this.CONSUME(RBracket);
  }

  const properties = [];
  while (this.LA(1).tokenType === PropertyAccess) {
    const prop = this.CONSUME(PropertyAccess);
    properties.push(prop.image.slice(1)); // Remove leading dot
  }

  return {
    type: "Variable",
    sigil: sigil.image,
    identifier: this.extractIdentifier(sigil),
    levelSpoof,
    propertyChain: properties
  };
});
```

### b. Macro Parsing Regex → Chevrotain Grammar

**Current Regex** (line 610):
```typescript
const match = macroString.match(/^%([a-zA-Z_]+)\[(.*?)\]$/);
```

**Proposed Chevrotain Grammar**:
```typescript
const Macro = createToken({
  name: "Macro",
  pattern: /%[a-zA-Z_]+/,
});

this.RULE("macro", () => {
  const macroToken = this.CONSUME(Macro);
  this.CONSUME(LBracket);

  const command = macroToken.image.slice(1); // Remove %

  // Parse main argument (up to semicolon or closing bracket)
  let mainArg = this.SUBRULE(this.expression);

  const options = [];
  if (this.LA(1).tokenType === Semicolon) {
    this.CONSUME(Semicolon);
    while (this.LA(1).tokenType !== RBracket) {
      options.push(this.SUBRULE(this.expression));
      if (this.LA(1).tokenType === Comma) {
        this.CONSUME(Comma);
      }
    }
  }

  this.CONSUME(RBracket);

  return {
    type: "Macro",
    command,
    mainArg,
    options
  };
});
```

### c. Challenge Parsing Logic → Chevrotain Grammar

**Current Logic** (lines 879-934):
```typescript
const skillCheckMatch = skillCheckExpr.match(/^\s*(.*?)\s*(>>|<<|><|<>|==|!=)\s*(.*)\s*$/);
```

**Proposed Chevrotain Grammar**:
```typescript
const ChallengeOp = createToken({
  name: "ChallengeOp",
  pattern: />>|<<|><|<>/,
});

this.RULE("challengeExpression", () => {
  const skill = this.SUBRULE(this.expression);
  const operator = this.CONSUME(ChallengeOp);
  const target = this.SUBRULE(this.expression);

  let options = null;
  if (this.LA(1).tokenType === Semicolon) {
    this.CONSUME(Semicolon);
    options = this.SUBRULE(this.challengeOptions);
  }

  return {
    type: "Challenge",
    skill,
    operator: operator.image,
    target,
    options
  };
});

this.RULE("challengeOptions", () => {
  const options = {};

  while (this.LA(1).tokenType !== RBracket && this.LA(1).tokenType !== EOF) {
    if (this.LA(1).tokenType === Identifier) {
      const key = this.CONSUME(Identifier);
      this.CONSUME(Colon);
      const value = this.SUBRULE(this.expression);
      options[key.image] = value;
    } else {
      // Positional arguments
      const value = this.SUBRULE(this.expression);
      if (!options.margin) options.margin = value;
      else if (!options.min) options.min = value;
      else if (!options.max) options.max = value;
      else if (!options.pivot) options.pivot = value;
    }

    if (this.LA(1).tokenType === Comma) {
      this.CONSUME(Comma);
    }
  }

  return options;
});
```

### d. Assignment Regex → Chevrotain Grammar

**Current Regex** (line 185):
```typescript
const assignmentMatch = trimmedExpr.match(/^@([a-zA-Z0-9_]+)\s*=(?!=)\s*(.*)$/);
```

**Proposed Chevrotain Grammar**:
```typescript
const Assign = createToken({ name: "Assign", pattern: /=/ });

this.RULE("assignment", () => {
  const aliasToken = this.CONSUME(Alias);
  this.CONSUME(Assign);
  const value = this.SUBRULE(this.expression);

  return {
    type: "Assignment",
    alias: aliasToken.image.slice(1), // Remove @
    value
  };
});
```

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Create standalone parser with no integration

1. **Setup Chevrotain**:
   - Install `chevrotain` dependency
   - Create `src/engine/scribescript/parser/` directory structure
   - Set up basic lexer with core tokens

2. **Implement Core Grammar**:
   - Variable and property access grammar
   - Basic expression grammar (arithmetic, comparisons)
   - Macro syntax grammar
   - Test with isolated examples

3. **Build AST Interfaces**:
   - Complete TypeScript interfaces from Section 3
   - AST transformer from CST to typed AST
   - Basic visitor pattern skeleton

**Deliverables**:
- Working parser that can parse ScribeScript snippets
- AST output for test cases
- Unit test suite for grammar rules

### Phase 2: Evaluation Engine (Week 2)

**Goal**: Create evaluation visitor that matches current behavior

1. **Implement Evaluation Visitor**:
   - Variable resolution with game state context
   - Expression evaluation (math, comparisons)
   - Macro execution (%list, %count, %pick, etc.)
   - Conditional and choice evaluation

2. **Create Compatibility Layer**:
   - Adapter to convert between old and new evaluation contexts
   - Match existing `evaluateText()` API signature
   - Preserve trace logging and error reporting

3. **Comprehensive Testing**:
   - Test all DSL constructs from documentation
   - Edge cases and error conditions
   - Performance benchmarking vs. regex parser

**Deliverables**:
- Complete evaluation visitor
- API-compatible `evaluateTextNew()` function
- 90%+ test coverage of existing functionality

### Phase 3: Integration (Week 3)

**Goal**: Gradual integration with fallback mechanism

1. **Dual-Parser System**:
   - Modify `textProcessor.ts` to use new parser with fallback
   - Feature flag to switch between parsers
   - Side-by-side comparison logging

2. **Performance Optimization**:
   - Profile and optimize hot paths
   - Implement caching for repeated expressions
   - Memory usage optimization

3. **Error Handling & Reporting**:
   - Enhanced error messages with location info
   - Parse tree visualization for debugging
   - Validation warnings for deprecated syntax

**Deliverables**:
- Integrated parser with feature flag
- Performance parity or improvement
- Enhanced debugging tools

### Phase 4: Rollout & Validation (Week 4)

**Goal**: Complete transition and validation

1. **Gradual Rollout**:
   - Enable new parser for non-critical paths first
   - Monitor for regressions in game behavior
   - A/B testing with sample stories

2. **Validation Suite**:
   - Run existing game content through both parsers
   - Compare outputs for equivalence
   - Fix any discrepancies

3. **Cleanup & Documentation**:
   - Remove old regex parsing code
   - Update developer documentation
   - Create migration guide for custom macros

**Deliverables**:
- Full transition to new parser
- Validation report confirming equivalence
- Updated documentation

### Testing Strategy

1. **Unit Tests**: Each grammar rule and AST node type
2. **Integration Tests**: Full ScribeScript snippets
3. **Regression Tests**: All existing game content
4. **Performance Tests**: Load testing with complex expressions
5. **Fuzz Testing**: Random valid/invalid inputs

### Rollback Plan

1. **Feature Flag**: Parser selection via environment variable
2. **Monitoring**: Real-time comparison of parser outputs
3. **Automatic Fallback**: Switch to old parser on error detection
4. **Snapshot Testing**: Daily comparison of parser outputs

### Integration Points

**Primary Integration File**: `src/engine/textProcessor.ts`
- Replace `evaluateText()` implementation
- Maintain same public API
- Preserve error handling and logging

**Secondary Integration Points**:
- `src/engine/scribescript/logic.ts` - Condition evaluation
- `src/engine/scribescript/variables.ts` - Variable resolution
- `src/engine/mechanics/effectParser.ts` - Effect parsing
- Game editor components that use ScribeScript

### Risk Mitigation

| Risk | Mitigation Strategy |
|------|-------------------|
| **Performance regression** | Benchmarking, caching, gradual optimization |
| **Behavioral differences** | Comprehensive test suite, side-by-side validation |
| **Integration complexity** | Feature flags, gradual rollout, fallback mechanism |
| **Edge case misses** | Fuzz testing, real-world content validation |
| **Developer adoption** | Clear documentation, migration guide, examples |

---

## Conclusion

The refactor from regex-based parsing to a formal Chevrotain-based parser is not only feasible but necessary for the long-term maintainability and scalability of the ChronicleHub platform. The proposed architecture provides:

1. **Maintainable codebase** with clear separation of concerns
2. **Robust error handling** with detailed diagnostics
3. **Extensible foundation** for future DSL enhancements
4. **Improved developer experience** with better tooling

The 4-week implementation plan provides a safe, incremental path to migration with multiple fallback mechanisms and validation checkpoints. The investment in this refactor will pay dividends in reduced bug rates, faster feature development, and improved stability for the interactive fiction platform.

**Recommendation**: **APPROVE** the refactor project with immediate start on Phase 1.