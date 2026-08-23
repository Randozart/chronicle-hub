/**
 * Shared formatter that turns a lock condition expression into a readable
 * "Requires: ..." sentence. Unlike the historical regex-only versions, this
 * understands ScribeScript brace expressions on either side of a comparison
 * (e.g. `{$quality.name} == 'Elder Sigil'`) and runs quality display names
 * through the supplied evaluator so script-in-name definitions resolve.
 */

/// Shape of the live quality state we rely on (structural, avoids coupling
/// the util to the engine's exact union types).
interface MinimalQualityState {
    type?: string;
    stringValue?: string;
    level?: number;
}

export interface LockReasonContext {
    /// Resolve a quality id to its display name; may itself contain ScribeScript.
    getQualityName: (qid: string) => string;
    /// Optional character qualities keyed by id, used for the "(Current: n)" hint.
    qualities?: Record<string, unknown>;
    /// Optional ScribeScript evaluator applied to names and the final sentence.
    evaluate?: (text: string) => string;
}

const OP_MAP: Record<string, string> = {
    '>': 'more than',
    '>=': 'at least',
    '<': 'less than',
    '<=': 'at most',
    '==': 'exactly',
    '!=': 'not'
};

/// Comparison clause: left side is either a bare (optionally $-prefixed)
/// quality id or a {...} ScribeScript expression; right side is a number,
/// quoted literal, or {...} expression.
const CLAUSE_REGEX = /(\{[^}]*\}|\$?[a-zA-Z0-9_]+)\s*(>=|<=|==|!=|>|<)\s*([0-9]+|'[^']*'|"[^"]*"|\{[^}]*\})/g;

/// Extract the quality id referenced inside a {$x.name}-style expression,
/// or null when the braces hold something else.
function extractQidFromExpression(expression: string): string | null {
    const inner = expression.slice(1, -1);
    const match = inner.match(/^\$([a-zA-Z0-9_]+)(?:\.\w+)?$/);
    return match ? match[1] : null;
}

/// Read the player-facing current value for a quality id.
function currentValueFor(qualities: Record<string, unknown> | undefined, qid: string): string | number {
    if (!qualities) return 0;
    const state = qualities[qid] as MinimalQualityState | undefined;
    if (!state) return 0;
    if (state.type === 'S') return state.stringValue ?? "";
    if (typeof state.level === 'number') return state.level;
    return 0;
}

/// Build one readable "Name at least 3 (Current: 1)" fragment from a clause.
function renderClause(rawQidOrExpr: string, op: string, rawVal: string, ctx: LockReasonContext): string | null {
    const readableOp = OP_MAP[op] || op;
    const cleanVal = rawVal.replace(/^['"]|['"]$/g, '');
    const evaluate = ctx.evaluate;

    let displayName: string;
    let currentHint = "";

    if (rawQidOrExpr.startsWith('{')) {
        // Scripted left side: resolve it, and try to recover a quality id
        // from a {$x...} shape so the Current hint still works.
        displayName = evaluate ? evaluate(rawQidOrExpr) : rawQidOrExpr;
        const qid = extractQidFromExpression(rawQidOrExpr);
        if (qid && ctx.qualities) {
            currentHint = ` (Current: ${currentValueFor(ctx.qualities, qid)})`;
        }
    } else {
        const qid = rawQidOrExpr.startsWith('$') ? rawQidOrExpr.substring(1) : rawQidOrExpr;
        const rawName = ctx.getQualityName(qid) || qid;
        displayName = evaluate ? evaluate(rawName) : rawName;
        if (ctx.qualities) {
            currentHint = ` (Current: ${currentValueFor(ctx.qualities, qid)})`;
        }
    }

    let renderedValue = cleanVal;
    if (rawVal.startsWith('{')) {
        renderedValue = evaluate ? evaluate(rawVal) : rawVal;
    }

    if (!displayName.trim()) return null;
    return `${displayName} ${readableOp} ${renderedValue}${currentHint}`;
}

/// Format a lock/unlock condition expression as a human-readable sentence.
/// Unmatched fragments pass through so writers never lose information.
export function formatLockReason(condition: string, ctx: LockReasonContext): string {
    if (!condition) return "";

    const parts: string[] = [];
    let lastIndex = 0;

    condition.replace(CLAUSE_REGEX, (match, lhs, op, rhs, offset: number) => {
        if (offset > lastIndex) {
            parts.push(condition.slice(lastIndex, offset));
        }
        const rendered = renderClause(lhs, op, rhs, ctx);
        parts.push(rendered ?? match);
        lastIndex = offset + match.length;
        return match;
    });
    if (lastIndex < condition.length) {
        parts.push(condition.slice(lastIndex));
    }

    let readable = parts.join("");
    readable = readable.replace(/&&|,/g, ' AND ');
    readable = readable.replace(/\|\|/g, ' OR ');

    if (ctx.evaluate) {
        readable = ctx.evaluate(readable);
    }

    return `Requires: ${readable.replace(/\$/g, '')}`;
}
