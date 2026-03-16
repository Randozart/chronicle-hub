// src/engine/scribescript/parser/astEvaluator.ts
// AST-based evaluator for ScribeScript

import type {
  ASTNode,
  TextBlockNode,
  BraceExpressionNode,
  VariableNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  ConditionalNode,
  MacroNode,
  AssignmentNode,
  LiteralNode,
  RangeNode,
  ChoiceNode,
  ChallengeNode,
  PercentageNode,
} from './ast';
import type { PlayerQualities, QualityDefinition, QualityState } from '../../models';
import type { ScribeEvaluator, TraceLogger } from '../types';
import { resolveVariable } from '../variables';
import { evaluateMacro as legacyEvaluateMacro } from '../macros';
import { calculateChance } from '../math';

export interface EvaluationContext {
  variables: Map<string, any>;
  worldVariables: Map<string, any>;
  aliases: Map<string, any>;
  /**
   * Full legacy context — required for macros, challenges, property chains,
   * and self-reference ($.); absent in lightweight standalone usage.
   */
  legacy?: {
    qualities: PlayerQualities;
    qualityDefs: Record<string, QualityDefinition>;
    selfContext: { qid: string; state: QualityState } | null;
    resolutionRoll: number;
    errors?: string[];
    logger?: TraceLogger;
    depth: number;
    /** Callback to the legacy evaluateText — closes the recursion loop for macros. */
    evaluator: ScribeEvaluator;
  };
}

export class AstEvaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  public evaluate(node: ASTNode): any {
    return this.evaluateNode(node);
  }

  private evaluateNode(node: ASTNode): any {
    switch (node.type) {
      case 'TextBlock':        return this.evaluateTextBlock(node);
      case 'BraceExpression': return this.evaluateBraceExpression(node);
      case 'Variable':        return this.evaluateVariable(node);
      case 'Literal':         return this.evaluateLiteral(node);
      case 'BinaryExpression':return this.evaluateBinaryExpression(node);
      case 'UnaryExpression': return this.evaluateUnaryExpression(node);
      case 'Conditional':     return this.evaluateConditional(node);
      case 'Macro':           return this.evaluateMacro(node);
      case 'Assignment':      return this.evaluateAssignment(node);
      case 'Range':           return this.evaluateRange(node);
      case 'Choice':          return this.evaluateChoice(node);
      case 'Challenge':       return this.evaluateChallenge(node);
      case 'Percentage':      return this.evaluatePercentage(node);
      default:
        console.warn(`Unhandled AST node type: ${(node as any).type}`);
        return '';
    }
  }

  // ---------------------------------------------------------------------------
  // Node evaluators
  // ---------------------------------------------------------------------------

  private evaluateTextBlock(node: TextBlockNode): any {
    // Single non-string part: preserve the native type (boolean, number, etc.)
    // so callers like evaluateConditional and evaluateTextNew get typed values.
    if (node.parts.length === 1 && typeof node.parts[0] !== 'string') {
      return this.evaluateNode(node.parts[0]);
    }
    return node.parts
      .map(part => typeof part === 'string' ? part : String(this.evaluateNode(part)))
      .join('');
  }

  private evaluateBraceExpression(node: BraceExpressionNode): any {
    return this.evaluateNode(node.expression);
  }

  private evaluateVariable(node: VariableNode): any {
    const leg = this.context.legacy;

    // Delegate to resolveVariable for full fidelity whenever legacy context is available.
    // This is required for: String qualities (stringValue vs level), property chains,
    // level-spoof, self-reference, and any other quality-type-specific logic.
    // '@' and '#' sigils without property chains use the fast path (Maps only).
    const needsLegacy = node.sigil === '$.' || node.propertyChain.length > 0 || !!node.levelSpoof
      || (!!leg && node.sigil === '$');
    if (needsLegacy && leg) {
      // Reconstruct the variable string that resolveVariable expects,
      // e.g. "$strength", "@enemy", "$.level", "$item[5].name"
      let fullMatch: string;
      if (node.sigil === '$.') {
        fullMatch = '$.';
      } else {
        fullMatch = `${node.sigil}${node.identifier}`;
      }

      if (node.levelSpoof) {
        // Pre-evaluate the level spoof so resolveVariable receives a plain number.
        // It will re-evaluate "{N}" via the legacy evaluator, which round-trips cleanly.
        const spoofVal = this.evaluateNode(node.levelSpoof);
        fullMatch += `[${spoofVal}]`;
      }

      fullMatch += node.propertyChain.map(p => `.${p}`).join('');

      return resolveVariable(
        fullMatch,
        leg.qualities,
        leg.qualityDefs,
        this.buildAliasRecord(),
        leg.selfContext,
        leg.resolutionRoll,
        leg.errors,
        leg.logger,
        (leg.depth ?? 0) + 1,
        leg.evaluator,
      );
    }

    // Fast path: simple Map lookup (no property chains, no legacy context needed)
    let value: any;
    switch (node.sigil) {
      case '$':  value = this.context.variables.get(node.identifier as string) ?? 0; break;
      case '@':  value = this.context.aliases.get(node.identifier as string) ?? ''; break;
      case '#':  value = this.context.worldVariables.get(node.identifier as string) ?? 0; break;
      case '$.': value = 0; break;
      default:   value = 0;
    }

    // Shallow property traversal for in-memory objects (fallback when no legacy ctx)
    let current = value;
    for (const prop of node.propertyChain) {
      if (current && typeof current === 'object' && prop in current) {
        current = current[prop];
      } else {
        current = '';
        break;
      }
    }
    return current;
  }

  private evaluateLiteral(node: LiteralNode): any {
    return node.value;
  }

  private evaluateBinaryExpression(node: BinaryExpressionNode): any {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);
    switch (node.operator) {
      case '+':  return left + right;
      case '-':  return left - right;
      case '*':  return left * right;
      case '/':  return left / right;
      case '==': return left === right;
      case '!=': return left !== right;
      case '>':  return left > right;
      case '<':  return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '&&': return left && right;
      case '||': return left || right;
      default:
        console.warn(`Unknown binary operator: ${node.operator}`);
        return left;
    }
  }

  private evaluateUnaryExpression(node: UnaryExpressionNode): any {
    const operand = this.evaluateNode(node.operand);
    switch (node.operator) {
      case '!': return !operand;
      case '-': return -operand;
      default:  return operand;
    }
  }

  private evaluateConditional(node: ConditionalNode): any {
    for (const branch of node.branches) {
      if (this.evaluateNode(branch.condition)) {
        return this.evaluateNode(branch.result);
      }
    }
    return node.elseBranch ? this.evaluateNode(node.elseBranch) : '';
  }

  private evaluateMacro(node: MacroNode): any {
    const leg = this.context.legacy;
    if (leg) {
      // Reconstruct the macro string using nodeToString so that legacyEvaluateMacro
      // receives an expression string it can evaluate itself — e.g. "%chance[$skill>>50]"
      // rather than a pre-evaluated number. This is essential for macros like %chance
      // and %list that need to evaluate their args using the full legacy context.
      const mainArgStr = this.nodeToString(node.mainArg);
      const optionStrs = node.options.map(opt => this.nodeToString(opt));
      const allParts = [mainArgStr, ...optionStrs];
      const macroStr = `%${node.command}[${allParts.join(';')}]`;

      return legacyEvaluateMacro(
        macroStr,
        leg.qualities,
        leg.qualityDefs,
        this.buildAliasRecord(),
        leg.selfContext,
        leg.resolutionRoll,
        leg.errors,
        leg.logger,
        leg.depth ?? 0,
        leg.evaluator,
      );
    }

    return `[Macro: ${node.command}]`;
  }

  private evaluateAssignment(node: AssignmentNode): any {
    const value = this.evaluateNode(node.value);
    this.context.aliases.set(node.alias, value);
    return value;
  }

  private evaluateRange(node: RangeNode): any {
    const minNum = Number(this.evaluateNode(node.min));
    const maxNum = Number(this.evaluateNode(node.max));
    if (isNaN(minNum) || isNaN(maxNum)) return 0;
    const lo = Math.min(minNum, maxNum);
    const hi = Math.max(minNum, maxNum);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  private evaluateChoice(node: ChoiceNode): any {
    if (node.choices.length === 0) return '';
    const evaluated = node.choices.map(c => this.evaluateNode(c));
    return evaluated[Math.floor(Math.random() * evaluated.length)];
  }

  private evaluateChallenge(node: ChallengeNode): any {
    const leg = this.context.legacy;
    if (leg) {
      // Reconstruct the expression string so calculateChance can re-evaluate
      // each side via the legacy evaluator (handles $variable lookups, etc.).
      const expr = `${this.nodeToString(node.skill)} ${node.operator} ${this.nodeToString(node.target)}`;

      let optStr: string | undefined;
      if (node.options) {
        const parts: string[] = [];
        if (node.options.margin !== undefined) parts.push(`margin:${node.options.margin}`);
        if (node.options.min    !== undefined) parts.push(`min:${node.options.min}`);
        if (node.options.max    !== undefined) parts.push(`max:${node.options.max}`);
        if (node.options.pivot  !== undefined) parts.push(`pivot:${node.options.pivot}`);
        if (parts.length > 0) optStr = parts.join(',');
      }

      return calculateChance(
        expr,
        optStr,
        leg.qualities,
        leg.qualityDefs,
        this.buildAliasRecord(),
        leg.selfContext,
        leg.resolutionRoll,
        leg.errors,
        leg.logger,
        leg.depth ?? 0,
        leg.evaluator,
      );
    }

    // Fallback without legacy context: simple boolean comparison (no probability curve)
    const skill  = Number(this.evaluateNode(node.skill));
    const target = Number(this.evaluateNode(node.target));
    switch (node.operator) {
      case '>>': return skill > target;
      case '<<': return skill < target;
      case '><': return Math.abs(skill - target) < (node.options?.margin ?? 10);
      case '<>': return Math.abs(skill - target) >= (node.options?.margin ?? 10);
      default:   return false;
    }
  }

  private evaluatePercentage(node: PercentageNode): any {
    // {60%} → true if resolutionRoll < 60, matching legacy textProcessor.ts behaviour.
    const roll = this.context.legacy?.resolutionRoll ?? Math.floor(Math.random() * 100);
    return roll < node.value;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Build a Record<string, string> from the current aliases Map for legacy calls. */
  private buildAliasRecord(): Record<string, string> {
    const record: Record<string, string> = {};
    for (const [k, v] of this.context.aliases.entries()) {
      record[k] = String(v);
    }
    return record;
  }

  /**
   * Reconstruct a string representation of an AST node WITHOUT evaluating it.
   * Used to pass expression strings to legacy functions (calculateChance,
   * evaluateMacro) that expect raw ScribeScript like "$strength >> 50".
   * Falls back to evaluation only for node types that can't be stringified.
   */
  private nodeToString(node: ASTNode | string): string {
    if (typeof node === 'string') return node;
    switch (node.type) {
      case 'Literal': {
        const v = (node as LiteralNode).value;
        return String(v); // No extra quoting — legacy system handles bare strings fine
      }
      case 'Variable': {
        const v = node as VariableNode;
        let s = v.sigil === '$.' ? '$.' : `${v.sigil}${v.identifier}`;
        if (v.levelSpoof) s += `[${this.nodeToString(v.levelSpoof)}]`;
        if (v.propertyChain.length > 0) s += v.propertyChain.map(p => `.${p}`).join('');
        return s;
      }
      case 'BinaryExpression': {
        const b = node as BinaryExpressionNode;
        return `${this.nodeToString(b.left)} ${b.operator} ${this.nodeToString(b.right)}`;
      }
      case 'UnaryExpression': {
        const u = node as UnaryExpressionNode;
        return `${u.operator}${this.nodeToString(u.operand)}`;
      }
      case 'Challenge': {
        const c = node as ChallengeNode;
        return `${this.nodeToString(c.skill)} ${c.operator} ${this.nodeToString(c.target)}`;
      }
      default:
        // For complex nodes we can't stringify, evaluate them
        return String(this.evaluateNode(node));
    }
  }
}
